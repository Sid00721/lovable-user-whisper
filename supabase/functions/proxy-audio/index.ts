import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Range",
      },
    });
  }

  console.log('Proxy request received:', req.url);
  const url = new URL(req.url);
  const sid = url.searchParams.get("sid");

  if (!sid) {
    return new Response("Missing recording SID", { status: 400 });
  }

  const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Recordings/${sid}.mp3`;
  console.log('Fetching from:', recordingUrl);

  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  console.log('Auth:', auth);

  const headers = {
    "Authorization": `Basic ${auth}`,
  };

  // Handle range requests
  const range = req.headers.get('range');
  if (range) {
    headers['Range'] = range;
  }

  try {
    const response = await fetch(recordingUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twilio fetch error:', response.status, errorText);
      return new Response(`Failed to fetch recording: ${errorText}`, { status: response.status });
    }

    console.log('Twilio response status:', response.status);
    console.log('Content-Length:', response.headers.get('Content-Length'));

    const respHeaders = new Headers({
      "Content-Type": "audio/mpeg",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
    });

    // Copy relevant headers from Twilio response
    if (response.headers.get('Content-Length')) {
      respHeaders.set('Content-Length', response.headers.get('Content-Length'));
    }
    if (response.headers.get('Content-Range')) {
      respHeaders.set('Content-Range', response.headers.get('Content-Range'));
    }

    // Set Accept-Ranges
    respHeaders.set('Accept-Ranges', 'bytes');

    const status = range && response.status === 206 ? 206 : 200;

    return new Response(response.body, {
      status,
      headers: respHeaders,
    });
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
