// Test script to verify database connection auto-detection
// Run with: node test-connection.js

require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('\n🔍 Testing Database Connection Auto-Detection\n');

  // Test environment variable detection
  console.log('Environment Variables Loaded:');
  console.log('  DB_HOST:', process.env.DB_HOST || '(not set)');
  console.log('  DB_USER:', process.env.DB_USER || '(not set)');
  console.log('  DB_NAME:', process.env.DB_NAME || '(not set)');
  console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '****' : '(not set)');
  console.log('  DATABASE_URL:', process.env.DATABASE_URL || '(not set)');
  console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || '(not set)');

  // Build connection string from DB_* variables
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
  const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT || 5432}/${DB_NAME}`;

  console.log('\n✅ Built connection string from DB_* variables');
  console.log('   Format: postgresql://user:****@host:port/database');

  // Test direct PostgreSQL connection
  const { Pool } = require('pg');

  console.log('\n🔍 Testing Database Connection Auto-Detection\n');
  console.log('Environment Variables:');
  console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || '(not set)');
  console.log('  DATABASE_URL:', process.env.DATABASE_URL || '(not set)');
  console.log('  DB_HOST:', process.env.DB_HOST || '(not set)');
  console.log('  DB_USER:', process.env.DB_USER || '(not set)');
  console.log('  DB_NAME:', process.env.DB_NAME || '(not set)');

  try {
    const dbType = getDatabaseType();
    console.log(`\n✅ Detected database type: ${dbType}`);

    console.log('\n🔌 Testing connection...');
    const db = await getConnection();

    console.log(`✅ Connection established (type: ${db.type})`);

    // Test a simple query
    console.log('\n📊 Testing query: SELECT current_database()');
    const result = await db.query('SELECT current_database(), version()');

    console.log('✅ Query successful!');
    console.log('  Database:', result.rows[0].current_database);
    console.log('  Version:', result.rows[0].version.split(' ')[0], result.rows[0].version.split(' ')[1]);

    // Check if tables exist
    console.log('\n🗄️  Checking for tables...');
    const tablesResult = await db.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`✅ Found ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.tablename}`);
    });

    // Close connection
    await db.close();
    console.log('\n✅ Connection closed successfully\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n   Stack:', error.stack);
    process.exit(1);
  }
}

testConnection();
