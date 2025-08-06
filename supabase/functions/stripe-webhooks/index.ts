import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=denonext'

// Stripe client
const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY') as string, {
  apiVersion: '2024-04-10',
  cryptoProvider: Stripe.createSubtleCryptoProvider(),
})

// Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (request) => {
  const signature = request.headers.get('Stripe-Signature')!
  const body = await request.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')!,
      undefined,
      stripe.cryptoProvider
    )
  } catch (err) {
    console.error(err.message)
    return new Response(err.message, { status: 400 })
  }

  console.log(`🔔 Received event: ${event.type}`)

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Get customer email from Stripe
        const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer
        if (customer.deleted) {
          console.log(`Customer ${customerId} is deleted.`)
          break
        }
        const email = customer.email

        if (!email) {
          console.error(`No email for customer ${customerId}`)
          break
        }

        // Update client in Supabase
        const { data, error } = await supabase
          .from('clients')
          .update({
            subscription_status: subscription.status,
            stripe_customer_id: customerId,
          })
          .eq('email', email)
          .select()

        if (error) {
          console.error('Supabase update error:', error)
          throw error
        }

        console.log(`Updated subscription for ${email}:`, data)
        break
      }
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error('Error handling event:', error.message)
    return new Response('Internal Server Error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
})