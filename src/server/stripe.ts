import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY;
console.log(`Stripe secret key is set: ${!!stripeKey}`);
const stripe = new Stripe(stripeKey!, {
  apiVersion: '2024-04-10',
});

export const getCustomerTransactions = async (customerId: string) => {
  try {
    console.log(`Fetching transactions for customer: ${customerId}`);
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 100,
    });
    console.log(`Found ${paymentIntents.data.length} payment intents`);

    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 100,
    });
    console.log(`Found ${charges.data.length} charges`);

    return { paymentIntents: paymentIntents.data, charges: charges.data };
  } catch (error) {
    console.error('Error fetching Stripe transactions:', error);
    return { paymentIntents: [], charges: [] };
  }
};