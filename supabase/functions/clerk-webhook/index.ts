import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = "https://tbplhgbtnksyqnuqfncr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicGxoZ2J0bmtzeXFudXFmbmNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMzMyMDYsImV4cCI6MjA2ODgwOTIwNn0.0whaVn_vkDUBF9xM_AYPFZBCnv31HiqJe9WikjBm4Hk";
const supabase = createClient(supabaseUrl, supabaseKey);

// Real estate related domains for high priority detection
const REAL_ESTATE_DOMAINS = [
  'realty.com', 'realtor.com', 'kw.com', 'remax.com', 'coldwellbanker.com',
  'century21.com', 'sothebys.com', 'compass.com', 'zillow.com', 'trulia.com',
  'homes.com', 'movoto.com', 'homesnap.com', 'mls.com'
];

// Verify webhook signature
async function verifyWebhookSignature(request: Request, body: string): Promise<boolean> {
  const webhookSecret = Deno.env.get('CLERK_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET not found');
    return false;
  }

  const signature = request.headers.get('svix-signature');
  if (!signature) {
    console.error('No signature header found');
    return false;
  }

  try {
    // Parse signature header
    const signatureParts = signature.split(' ');
    let timestamp = '';
    let signatures: string[] = [];

    for (const part of signatureParts) {
      const [key, value] = part.split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key.startsWith('v1')) {
        signatures.push(value);
      }
    }

    if (!timestamp || signatures.length === 0) {
      console.error('Invalid signature format');
      return false;
    }

    // Create expected signature
    const payload = `${timestamp}.${body}`;
    const secretBytes = new TextEncoder().encode(webhookSecret.replace('whsec_', ''));
    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

    // Compare signatures
    for (const sig of signatures) {
      if (sig === expectedSignature) {
        return true;
      }
    }

    console.error('Signature verification failed');
    return false;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

// Determine priority based on email domain
function determinePriority(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return 'Normal';
  
  // Check if it's a real estate domain
  const isRealEstate = REAL_ESTATE_DOMAINS.some(reDomain => 
    domain.includes(reDomain) || domain.endsWith(reDomain)
  );
  
  // Also check for common real estate keywords in domain
  const realEstateKeywords = ['realty', 'realtor', 'homes', 'property', 'estate'];
  const hasRealEstateKeyword = realEstateKeywords.some(keyword => domain.includes(keyword));
  
  return (isRealEstate || hasRealEstateKeyword) ? 'High' : 'Normal';
}

// Get next employee for round-robin assignment
async function getNextEmployee(): Promise<string | null> {
  try {
    // Get all employees
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id')
      .order('created_at');

    if (employeesError || !employees || employees.length === 0) {
      console.error('Error fetching employees:', employeesError);
      return null;
    }

    // Get count of clients assigned to each employee
    const { data: clientCounts, error: countsError } = await supabase
      .from('clients')
      .select('employee_id')
      .not('employee_id', 'is', null);

    if (countsError) {
      console.error('Error fetching client counts:', countsError);
      return employees[0].id; // Fallback to first employee
    }

    // Count assignments per employee
    const assignmentCounts = new Map();
    employees.forEach(emp => assignmentCounts.set(emp.id, 0));
    
    clientCounts?.forEach(client => {
      if (client.employee_id) {
        const current = assignmentCounts.get(client.employee_id) || 0;
        assignmentCounts.set(client.employee_id, current + 1);
      }
    });

    // Find employee with least assignments
    let minCount = Infinity;
    let selectedEmployee = employees[0].id;
    
    for (const [employeeId, count] of assignmentCounts) {
      if (count < minCount) {
        minCount = count;
        selectedEmployee = employeeId;
      }
    }

    return selectedEmployee;
  } catch (error) {
    console.error('Error in getNextEmployee:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const body = await req.text();
    
    // Verify webhook signature
    const isValid = await verifyWebhookSignature(req, body);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response('Unauthorized', { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    const event = JSON.parse(body);
    console.log('Received Clerk webhook:', event.type);

    // Only handle user.created events
    if (event.type !== 'user.created') {
      console.log('Ignoring event type:', event.type);
      return new Response('Event ignored', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    const userData = event.data;
    
    // Extract user information
    const clerkId = userData.id;
    const email = userData.email_addresses?.[0]?.email_address;
    const firstName = userData.first_name || '';
    const lastName = userData.last_name || '';
    const name = `${firstName} ${lastName}`.trim() || email?.split('@')[0] || 'Unknown';

    if (!email || !clerkId) {
      console.error('Missing required user data:', { email, clerkId });
      return new Response('Invalid user data', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('clients')
      .select('id')
      .eq('clerk_id', clerkId)
      .maybeSingle();

    if (existingUser) {
      console.log('User already exists:', clerkId);
      return new Response('User already exists', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    // Determine priority and assign employee
    const priority = determinePriority(email);
    const employeeId = await getNextEmployee();

    // Create client record
    const { data: newClient, error: insertError } = await supabase
      .from('clients')
      .insert({
        clerk_id: clerkId,
        name: name,
        email: email,
        priority: priority,
        employee_id: employeeId,
        is_using_platform: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating client:', insertError);
      return new Response('Error creating client', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    console.log('Successfully created client:', {
      id: newClient.id,
      name: newClient.name,
      email: newClient.email,
      priority: newClient.priority,
      employeeId: newClient.employee_id
    });

    return new Response(JSON.stringify({ 
      success: true, 
      clientId: newClient.id 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in clerk-webhook function:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});