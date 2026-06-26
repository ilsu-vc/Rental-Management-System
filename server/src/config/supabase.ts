import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!.trim();
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();

// Public client (respects RLS)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Service role client (bypasses RLS - for admin operations)
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

export { supabaseUrl, supabaseAnonKey, supabaseServiceKey };
