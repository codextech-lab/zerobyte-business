import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const authorization = request.headers.get('Authorization')
  if (!authorization) return new Response('Missing authorization', { status: 401 })
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return new Response('Unauthorized', { status: 401 })
  const { organizationId, customerId, items } = await request.json()
  if (!organizationId || !Array.isArray(items) || items.length === 0) {
    return new Response('organizationId and items are required', { status: 400 })
  }
  const { data, error } = await supabase.rpc('create_sale', {
    target_org: organizationId,
    target_customer: customerId ?? null,
    items,
  })
  if (error) return new Response(error.message, { status: 400 })
  return Response.json({ saleId: data })
})
