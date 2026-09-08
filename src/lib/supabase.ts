import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseUrl = url as string | undefined
export const supabaseAnonKey = anonKey as string | undefined
export const isSupabaseConfigured = Boolean(url && anonKey)
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null

export function getDataMode() {
  return isSupabaseConfigured ? 'Supabase configured · demo fixtures' : 'Local demo mode'
}
