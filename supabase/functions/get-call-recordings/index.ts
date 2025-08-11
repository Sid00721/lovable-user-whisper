import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwilioRecording {
  sid: string;
  uri: string;
  media_url: string;
  call_sid: string;
  duration: string;
  date_created: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { call_sid } = await req.json();
    
    if (!call_sid) {
      return new Response(
        JSON.stringify({ error: 'call_sid is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!twilioAccountSid || !twilioAuthToken) {
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create basic auth header for Twilio API
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    
    // Fetch recordings for the specific call
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls/${call_sid}/Recordings.json`;
    
    const response = await fetch(twilioUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twilio API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recordings from Twilio', details: errorText }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    const recordings = data.recordings || [];

    // Transform recordings to include full media URLs
    const transformedRecordings = recordings.map((recording: TwilioRecording) => ({
      sid: recording.sid,
      call_sid: recording.call_sid,
      duration: recording.duration,
      date_created: recording.date_created,
      media_url: `https://tbplhgbtnksyqnuqfncr.supabase.co/functions/v1/proxy-audio?sid=${recording.sid}`,
      download_url: `https://tbplhgbtnksyqnuqfncr.supabase.co/functions/v1/proxy-audio?sid=${recording.sid}`
    }));

    return new Response(
      JSON.stringify({ recordings: transformedRecordings }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-call-recordings function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});