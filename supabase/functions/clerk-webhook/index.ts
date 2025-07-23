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
    let timestamp = '';
    if (signature.startsWith('v1,')) {
      signatures = [signature.split('v1,')[1]];
    }
    console.log('Extracted signatures:', signatures);
    // Clerk does not send a timestamp, so skip timestamp check
    if (signatures.length === 0 || !signatures[0]) {
      console.error('Invalid signature format');
      return false;
    }
  } catch (error) {
    console.error('Error parsing signature:', error);
    return false;
  }

  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}, { port: 8000 });
