import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { Webhook } from 'npm:svix@1.24.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, svix-id, svix-timestamp, svix-signature",
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
    return new Response('CLERK_WEBHOOK_SECRET not found', { status: 500, headers: corsHeaders });
  }

  const headers = request.headers;
  const body = await request.text();
  
  // Check for required Clerk webhook headers
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");
  
  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error('Missing required headers:', {
      'svix-id': !!svixId,
      'svix-timestamp': !!svixTimestamp,
      'svix-signature': !!svixSignature
    });
    return new Response('Missing required headers', { status: 400, headers: corsHeaders });
  }
  
  const wh = new Webhook(webhookSecret);
  let event;

  try {
    event = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
    }) as any;

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
    const phone = userData.phone_numbers?.[0]?.phone_number;

    if (!email || !clerkId) {
      console.error('Missing required user data:', { email: !!email, clerkId: !!clerkId });
      return new Response('Missing required user data', { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl) {
      console.error('SUPABASE_URL not found');
      return new Response('SUPABASE_URL not found', { status: 500, headers: corsHeaders });
    }
    
    if (!supabaseKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not found');
      return new Response('SUPABASE_SERVICE_ROLE_KEY not found', { status: 500, headers: corsHeaders });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('clients')
      .insert({
        clerk_id: clerkId,
        name: name,
        email: email,
        phone: phone,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error inserting client:', error);
      return new Response('Error inserting client', { status: 500, headers: corsHeaders });
    }

    console.log('Client created successfully:', data);
    return new Response('Client created successfully', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Error in webhook handler:', error);
    return new Response('Error in webhook handler', { status: 500, headers: corsHeaders });
  }
}, { port: 8000 });
