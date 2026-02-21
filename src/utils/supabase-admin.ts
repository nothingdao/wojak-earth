import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    `[supabase-admin] Missing env vars. SUPABASE_URL present=${Boolean(supabaseUrl)} SUPABASE_SERVICE_ROLE_KEY present=${Boolean(supabaseServiceKey)}`
  )
  throw new Error(
    'Missing required backend Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
  )
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export default supabaseAdmin
