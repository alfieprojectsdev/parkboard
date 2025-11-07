// Test script to verify database connection auto-detection
// Run with: node test-db-connection.js

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function testConnection() {
  console.log('\n🔍 Testing Database Connection Auto-Detection\n');
  console.log('═'.repeat(60));

  // Display environment variables
  console.log('\n📋 Environment Variables Loaded:');
  console.log('  DB_HOST:', process.env.DB_HOST || '(not set)');
  console.log('  DB_USER:', process.env.DB_USER || '(not set)');
  console.log('  DB_NAME:', process.env.DB_NAME || '(not set)');
  console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '✓ set' : '✗ not set');
  console.log('  DB_PORT:', process.env.DB_PORT || '5432 (default)');
  console.log('  DATABASE_URL:', process.env.DATABASE_URL || '(not set)');
  console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || '(not set)');

  // Determine database type
  let dbType;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    dbType = 'supabase';
  } else if (process.env.DATABASE_URL) {
    dbType = process.env.DATABASE_URL.includes('neon.tech') ? 'neon' : 'local (via DATABASE_URL)';
  } else if (process.env.DB_HOST) {
    dbType = 'local (via DB_* variables)';
  } else {
    dbType = 'UNKNOWN - No database configuration found';
  }

  console.log('\n✅ Detected Database Type:', dbType);
  console.log('═'.repeat(60));

  // Build connection string
  let connectionString = process.env.DATABASE_URL;

  if (!connectionString && process.env.DB_HOST) {
    const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
    connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT || 5432}/${DB_NAME}`;
    console.log('\n🔗 Built connection string from DB_* variables');
  }

  if (!connectionString) {
    console.error('\n❌ No connection string available');
    process.exit(1);
  }

  // Test connection
  console.log('\n🔌 Testing PostgreSQL Connection...');

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : undefined
  });

  try {
    // Test query
    const result = await pool.query('SELECT current_database(), version(), current_user');

    console.log('✅ Connection Successful!\n');
    console.log('  Database:', result.rows[0].current_database);
    console.log('  User:', result.rows[0].current_user);
    console.log('  Version:', result.rows[0].version.split(' ').slice(0, 2).join(' '));

    // Check tables
    console.log('\n🗄️  Checking Database Schema...');
    const tablesResult = await pool.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    if (tablesResult.rows.length === 0) {
      console.log('⚠️  No tables found - database is empty');
      console.log('   Run migration: psql "$CONNECTION_STRING" -f app/db/migrations/001_core_schema.sql');
    } else {
      console.log(`✅ Found ${tablesResult.rows.length} table(s):`);
      tablesResult.rows.forEach(row => {
        console.log(`   • ${row.tablename}`);
      });
    }

    console.log('\n═'.repeat(60));
    console.log('✅ All Tests Passed!\n');

  } catch (error) {
    console.error('\n❌ Connection Failed!');
    console.error('   Error:', error.message);
    console.error('\n   Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
