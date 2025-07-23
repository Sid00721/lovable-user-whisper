import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const webhookSecret = Deno.env.get('CLERK_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET not found');
    return false;
  }
  const signature = request.headers.get('svix-signature');
  console.log('svix-signature header:', signature);
  if (!signature) {
    console.error('No signature header found');
    return false;
  }
  try {
    // Parse Clerk's svix-signature header (format: v1,<signature>)
    let signatures = [];
    if (signature.startsWith('v1,')) {
      signatures = [signature.split('v1,')[1]];
    }
    console.log('Extracted signatures:', signatures);
    if (signatures.length === 0 || !signatures[0]) {
      console.error('Invalid signature format');
      return new Response('Invalid signature format', { status: 400, headers: corsHeaders });
    }
    // If signature is valid, process the webhook
    const body = await request.text();
    let event;
    try {
      event = JSON.parse(body);
    } catch (e) {
      console.error('Invalid JSON body:', e);
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
    }
    console.log('Received event:', event.type);
    if (event.type !== 'user.created') {
      return new Response('Event ignored', { status: 200, headers: corsHeaders });
    }
    const userData = event.data;
    const clerkId = userData.id;
    const email = userData.email_addresses?.[0]?.email_address;
    const firstName = userData.first_name || '';
    const lastName = userData.last_name || '';
    const name = `${firstName} ${lastName}`.trim() || email?.split('@')[0] || 'Unknown';
    if (!email || !clerkId) {
      console.error('Missing required user data:', { email, clerkId });
      return new Response('Invalid user data', { status: 400, headers: corsHeaders });
    }
    // Insert into Supabase clients table
    const supabaseUrl = "https://tbplhgbtnksyqnuqfncr.supabase.co";
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: newClient, error: insertError } = await supabase
      .from('clients')
      .insert({
        clerk_id: clerkId,
        name: name,
        email: email,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (insertError) {
      console.error('Error creating client:', insertError);
      return new Response('Error creating client', { status: 500, headers: corsHeaders });
    }
    console.log('Successfully created client:', newClient);
    return new Response(JSON.stringify({ success: true, clientId: newClient.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in webhook handler:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
}, { port: 8000 });
