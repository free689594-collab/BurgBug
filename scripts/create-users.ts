// Script to create initial users using Supabase Admin API
// Run with: npx tsx scripts/create-users.ts

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('Please ensure .env.local contains:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createUser(
  account: string,
  email: string,
  password: string,
  role: 'user' | 'super_admin',
  status: 'approved' | 'pending'
) {
  console.log(`Creating user: ${account}...`)

  // 1. Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { account }
  })

  if (authError) {
    console.error(`Failed to create auth user ${account}:`, authError.message)
    return null
  }

  console.log(`✓ Auth user created: ${authData.user.id}`)

  // 2. Insert into members
  const { error: memberError } = await supabaseAdmin
    .from('members')
    .insert({
      user_id: authData.user.id,
      account,
      status,
    })

  if (memberError) {
    console.error(`Failed to create member ${account}:`, memberError.message)
    return null
  }

  console.log(`✓ Member record created`)

  // 3. Insert into user_roles
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .insert({
      user_id: authData.user.id,
      role,
    })

  if (roleError) {
    console.error(`Failed to create role ${account}:`, roleError.message)
    return null
  }

  console.log(`✓ Role assigned: ${role}`)

  // 4. Insert into member_statistics
  const { error: statsError } = await supabaseAdmin
    .from('member_statistics')
    .insert({
      user_id: authData.user.id,
    })

  if (statsError) {
    console.error(`Failed to create stats ${account}:`, statsError.message)
    return null
  }

  console.log(`✓ Statistics initialized`)
  console.log(`✅ User ${account} created successfully\n`)

  return authData.user
}

async function main() {
  console.log('🚀 Creating initial users...\n')

  // Create admin user
  await createUser(
    'q689594',
    'q689594@auth.local',
    'q6969520',
    'super_admin',
    'approved'
  )

  // Create test user 1 (approved)
  await createUser(
    'testuser1',
    'testuser1@auth.local',
    'TestPass123!',
    'user',
    'approved'
  )

  // Create test user 2 (pending)
  await createUser(
    'testuser2',
    'testuser2@auth.local',
    'TestPass456!',
    'user',
    'pending'
  )

  console.log('✅ All users created successfully!')
}

main().catch(console.error)

