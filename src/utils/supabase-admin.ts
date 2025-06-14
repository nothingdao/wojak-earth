import { createClient } from '@supabase/supabase-js'

// Use secure backend environment variables
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Log environment variables for debugging (they will be redacted in production)
console.log('Supabase URL available:', !!supabaseUrl)
console.log('Supabase Service Key available:', !!supabaseServiceKey)

// Create Supabase admin client with error handling
let supabaseAdmin
try {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing required Supabase environment variables. Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your environment.'
    )
  }

  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
} catch (error) {
  console.error('Error initializing Supabase admin client:', error)
  throw error
}

export default supabaseAdmin
