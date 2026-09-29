#!/usr/bin/env node
// Owner tool for "I forgot my password" (there is no email-based reset).
// Generates a random temporary password, stores its bcrypt hash, and prints
// it once so you can send it to the resident privately. Ask them to change it
// on the Profile page after logging in.
//
//   DATABASE_URL=postgres://... node scripts/reset-password.mjs resident@example.com
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email || !process.env.DATABASE_URL) {
  console.error('usage: DATABASE_URL=... node scripts/reset-password.mjs <email>');
  process.exit(1);
}

// 18 random bytes -> 24 URL-safe characters; comfortably over the 12-character minimum.
const temporary = randomBytes(18).toString('base64url');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const result = await client.query(
    'UPDATE user_profiles SET password_hash = $1 WHERE LOWER(email) = $2 RETURNING name, unit_number',
    [await bcrypt.hash(temporary, 12), email]
  );
  if (result.rows.length === 0) {
    console.error(`No account for ${email}.`);
    process.exitCode = 1;
  } else {
    const { name, unit_number } = result.rows[0];
    console.log(`Reset password for ${name} (unit ${unit_number}).`);
    console.log(`Temporary password: ${temporary}`);
  }
} finally {
  await client.end();
}
