import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceRoleKey) return json({ error: 'Server configuration is incomplete' }, 500)
  let body: { employeeId?: string; password?: string }
  try { body = await request.json() } catch { return json({ error: 'Request body must be valid JSON' }, 400) }
  const employeeId = body.employeeId?.trim()
  const password = body.password
  if (!employeeId || !password) return json({ error: 'Employee ID and password are required' }, 400)
  const adminClient = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: employee, error } = await adminClient.from('employee_profiles').select('email,employment_status').eq('employee_id', employeeId).maybeSingle()
  if (error) return json({ error: error.message }, 500)
  if (!employee?.email || employee.employment_status !== 'active') return json({ error: 'Invalid worker credentials' }, 401)
  const authClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error: signInError } = await authClient.auth.signInWithPassword({ email: employee.email, password })
  if (signInError || !data.session) return json({ error: 'Invalid worker credentials' }, 401)
  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_in: data.session.expires_in, user: data.user })
})
