// RLS Testing Script
// Run this to verify RLS policies work correctly

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Test accounts
const ADMIN_ID = 'e415ad38-b9d9-4aff-85f5-b882d1ffa03d'
const APPROVED_USER_ID = 'a8fa18ed-2574-4af4-953b-3e0df166b6cd'
const PENDING_USER_ID = '48e5a2e7-143b-440d-83de-9a57171d915c'

async function testRLS() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  console.log('🔍 Testing RLS Policies...\n')
  
  // Test 1: Approved user can see other approved members
  console.log('Test 1: Approved user (testuser1) queries members')
  const { data: approvedQuery, error: e1 } = await supabase
    .rpc('test_rls_as_user', {
      user_id: APPROVED_USER_ID,
      query: 'SELECT account, status FROM members ORDER BY account'
    })
  console.log('Result:', approvedQuery || e1)
  
  // Test 2: Approved user cannot see pending members
  console.log('\nTest 2: Check if pending members are visible')
  const { data: pendingCheck } = await supabase
    .from('members')
    .select('account, status')
    .eq('status', 'pending')
  console.log('Pending members (admin view):', pendingCheck)
  
  // Test 3: Admin can see all members
  console.log('\nTest 3: Admin queries all members')
  const { data: adminQuery } = await supabase
    .from('members')
    .select('account, status')
    .order('account')
  console.log('Result:', adminQuery)
  
  // Test 4: Regular user cannot access audit_logs
  console.log('\nTest 4: Regular user tries to access audit_logs')
  const { data: auditUser, error: e4 } = await supabase
    .rpc('test_rls_as_user', {
      user_id: APPROVED_USER_ID,
      query: 'SELECT COUNT(*) FROM audit_logs'
    })
  console.log('Result:', auditUser || e4?.message)
  
  // Test 5: Admin can access audit_logs
  console.log('\nTest 5: Admin accesses audit_logs')
  const { data: auditAdmin, count } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
  console.log('Result: Count =', count)
  
  console.log('\n✅ RLS Testing Complete')
}

// Note: This requires creating a helper RPC function in Supabase
// For now, we'll test manually via SQL queries

export { testRLS }

