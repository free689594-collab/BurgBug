import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLogin() {
  console.log('Testing login with q689594@auth.local...')
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'q689594@auth.local',
    password: 'q6969520',
  })

  if (error) {
    console.error('❌ Login failed:', error.message)
    console.error('Error details:', error)
  } else {
    console.log('✅ Login successful!')
    console.log('User ID:', data.user?.id)
    console.log('Email:', data.user?.email)
    console.log('Session:', data.session ? 'Created' : 'None')
  }
}

testLogin()

