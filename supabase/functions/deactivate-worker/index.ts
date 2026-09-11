import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Unauthorized' }, 401)

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user: caller } } = await callerClient.auth.getUser()
  if (!caller) return json({ error: 'Unauthorized' }, 401)

  let body: { organizationId?: string; employeeId?: string }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Request body must be valid JSON' }, 400)
  }
  const organizationId = String(body.organizationId ?? '').trim()
  const employeeId = String(body.employeeId ?? '').trim()
  if (!organizationId || !employeeId) return json({ error: 'Organization and employee are required' }, 400)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: owner, error: ownerError } = await admin
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', caller.id)
    .eq('role', 'owner')
    .maybeSingle()
  if (ownerError) return json({ error: 'Could not verify organization access' }, 500)
  if (!owner) return json({ error: 'Only an organization owner can deactivate workers' }, 403)

  const { data: employee, error: employeeError } = await admin
    .from('employee_profiles')
    .select('id,user_id,employment_status')
    .eq('id', employeeId)
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (employeeError) return json({ error: 'Could not load the worker profile' }, 500)
  if (!employee) return json({ error: 'Worker profile not found' }, 404)
  if (employee.employment_status === 'archived') return json({ ok: true })

  if (employee.user_id) {
    const { error: banError } = await admin.auth.admin.updateUserById(employee.user_id, { ban_duration: '876000h' })
    if (banError) return json({ error: 'Could not revoke the worker sign-in' }, 502)
    await admin.from('branch_members').delete().eq('user_id', employee.user_id)
  }

  const { error: updateError } = await admin
    .from('employee_profiles')
    .update({ employment_status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', employee.id)
    .eq('organization_id', organizationId)
  if (updateError) return json({ error: 'Could not archive the worker profile' }, 500)

  await admin.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: caller.id,
    action: 'worker.deactivated',
    entity_type: 'employee_profile',
    entity_id: employee.id,
    metadata: { auth_identity_revoked: Boolean(employee.user_id) },
  })
  return json({ ok: true })
})
