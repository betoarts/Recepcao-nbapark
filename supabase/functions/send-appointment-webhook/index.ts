import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[WEBHOOK] Starting request processing');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { appointment_id } = await req.json()
    console.log('[WEBHOOK] Received appointment_id:', appointment_id);

    if (!appointment_id) {
        throw new Error('Appointment ID is required')
    }

    // 1. Get Settings
    console.log('[WEBHOOK] Fetching settings...');
    const { data: settings, error: settingsError } = await supabaseClient
        .from('app_settings')
        .select('webhook_url, webhook_fields')
        .eq('id', 1)
        .single()
    
    console.log('[WEBHOOK] Settings result:', { settings, settingsError });
    
    if (settingsError || !settings?.webhook_url) {
        console.log('[WEBHOOK] Webhook not configured, returning early');
        return new Response(JSON.stringify({ message: 'Webhook not configured' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }

    // 2. Get Appointment with Host details
    console.log('[WEBHOOK] Fetching appointment...');
    const { data: appointment, error: aptError } = await supabaseClient
        .from('appointments')
        .select(`
            *,
            host:employees!host_id (
                full_name,
                email,
                phone
            )
        `)
        .eq('id', appointment_id)
        .single()

    console.log('[WEBHOOK] Appointment result:', { appointment, aptError });

    if (aptError || !appointment) {
        throw new Error('Appointment not found')
    }

    // 3. Construct Payload with English field names
    const fields = settings.webhook_fields || []
    const payload: Record<string, unknown> = {}

    // Always include all selected fields with English names
    if (fields.includes('Data da Visita')) {
        // Format date as DD-MM-YYYY
        const dateStr = appointment.start_time?.split('T')[0] || ''
        if (dateStr) {
            const [year, month, day] = dateStr.split('-')
            payload.appointment_date = `${day}-${month}-${year}`
        }
        // Time in 24h format HH:MM
        payload.appointment_time = appointment.start_time?.split('T')[1]?.substring(0, 5) || null
    }
    if (fields.includes('Nome do Visitante')) payload.guest_name = appointment.guest_name
    if (fields.includes('Nome do Funcionário')) payload.host_name = appointment.host?.full_name
    if (fields.includes('Email do Funcionário')) payload.host_email = appointment.host?.email
    if (fields.includes('Telefone do Funcionário')) payload.host_phone = appointment.host?.phone
    if (fields.includes('Tipo de Visita')) payload.appointment_type = appointment.type
    if (fields.includes('Observações')) payload.notes = appointment.description
    
    // Add title (always include if available)
    payload.appointment_title = appointment.title

    // 4. Send Webhook
    console.log('[WEBHOOK] Sending to:', settings.webhook_url);
    console.log('[WEBHOOK] Payload:', payload);

    const response = await fetch(settings.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })

    console.log('[WEBHOOK] Response status:', response.status);

    if (!response.ok) {
        const text = await response.text();
        console.error('[WEBHOOK] Failed:', text);
        throw new Error(`Failed to send webhook: ${text}`)
    }

    console.log('[WEBHOOK] Success!');
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[WEBHOOK] Function error:', errorMessage);
    console.error('[WEBHOOK] Full error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
