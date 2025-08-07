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

        // Extract subscription details
        const subscriptionItem = subscription.items.data[0]
        const price = subscriptionItem?.price
        const product = price?.product
        
        let productName = null
        let planName = null
        
        if (typeof product === 'string') {
          // If product is just an ID, fetch the full product details
          const productDetails = await stripe.products.retrieve(product)
          productName = productDetails.name
        } else if (product && typeof product === 'object') {
          // If product is already expanded
          productName = product.name
        }
        
        if (price) {
          planName = price.nickname || `${price.currency.toUpperCase()} ${price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A'}/${price.recurring?.interval || 'one-time'}`
        }

        // Prepare update data
        const updateData: any = {
          subscription_status: subscription.status,
          stripe_customer_id: customerId,
          subscription_product: productName,
          subscription_plan: planName,
        }

        // Add last payment date if subscription is active
        if (subscription.status === 'active' && subscription.current_period_start) {
          updateData.last_payment_date = new Date(subscription.current_period_start * 1000).toISOString()
        }

        // Update client in Supabase
        const { data, error } = await supabase
          .from('clients')
          .update(updateData)
          .eq('email', email)
          .select()

        if (error) {
          console.error('Supabase update error:', error)
          throw error
        }

        console.log(`Updated subscription for ${email}:`, data)
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        
        if (!customerId) {
          console.error('No customer ID in invoice')
          break
        }

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

        // Find the client in Supabase
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('email', email)
          .single()

        if (clientError || !clientData) {
          console.error(`Client not found for email ${email}:`, clientError)
          break
        }

        // Insert transaction record (avoiding duplicates)
        const { data: existingTransaction, error: checkError } = await supabase
          .from('invoices')
          .select('id')
          .eq('stripe_invoice_id', invoice.id)
          .single()

        if (!existingTransaction) {
          // Insert new transaction record
          const { data: insertData, error: insertError } = await supabase
            .from('invoices')
            .insert({
              client_id: clientData.id,
              stripe_invoice_id: invoice.id,
              amount_paid: (invoice.amount_paid || 0) / 100,
              created_at: new Date(invoice.created * 1000).toISOString(),
              status: invoice.status || 'paid',
              invoice_pdf: invoice.invoice_pdf
            })
            .select()

          if (insertError) {
            console.error('Error inserting transaction:', insertError)
          } else {
            console.log(`Inserted transaction for ${email}:`, insertData)
          }
        } else {
          console.log(`Transaction already exists for invoice ${invoice.id}`)
        }

        // Update last payment date
        const { data, error } = await supabase
          .from('clients')
          .update({
            last_payment_date: new Date(invoice.created * 1000).toISOString(),
          })
          .eq('email', email)
          .select()

        if (error) {
          console.error('Supabase update error:', error)
          throw error
        }

        console.log(`Updated last payment date for ${email}:`, data)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        
        if (!customerId) {
          console.error('No customer ID in invoice')
          break
        }

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

        console.log(`Payment failed for customer ${email}. Consider updating subscription status if needed.`)
        // Note: Stripe will automatically handle subscription status changes for failed payments
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