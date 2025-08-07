import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@^14.5.0'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // Manual JWT verification
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }
  const token = authHeader.replace('Bearer ', '')

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Proceed with fetching Stripe data
  const { customerId } = await req.json()
  if (!customerId) {
    return new Response('Missing customerId', { status: 400 })
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeSecretKey) {
    return new Response('Stripe secret key not set', { status: 500 })
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })

  try {
    const paymentIntents = await stripe.paymentIntents.list({ customer: customerId })
    const charges = await stripe.charges.list({ customer: customerId })

    return new Response(JSON.stringify({ paymentIntents: paymentIntents.data, charges: charges.data }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 200
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})