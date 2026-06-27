import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('\n❌ CRITICAL CONFIG ERROR: Missing Supabase environment variables in backend.');
  console.error('Please ensure SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are set.\n');
}

// Public client (respects RLS)
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder-please-set-env.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// Service role client (bypasses RLS - for admin operations)
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder-please-set-env.supabase.co',
  supabaseServiceKey || 'placeholder'
);

export { supabaseUrl, supabaseAnonKey, supabaseServiceKey };
