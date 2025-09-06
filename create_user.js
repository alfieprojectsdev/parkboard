// Use Supabase Admin client in a Node.js script
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(url, service_role_key) // service_role, not anon key

const users = [
  { email: 'alice@example.com', password: 'temp123' },
  { email: 'bob@example.com', password: 'temp123' },
  { email: 'admin@example.com', password: 'admin123' }
]

for (const user of users) {
  const { data } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true // skip email verification for dev
  })
  console.log(`Created user: ${data.user.id}`)
}