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
    // Parse signature header
    const signatureParts = signature.split(' ');
    console.log('Parsed signature parts:', signatureParts);
    let timestamp = '';
    let signatures = [];
    for (const part of signatureParts){
      const [key, value] = part.split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key.startsWith('v1')) {
        signatures.push(value);
      }
    }
    console.log('Extracted timestamp:', timestamp);
    console.log('Extracted signatures:', signatures);
    if (!timestamp || signatures.length === 0) {
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
