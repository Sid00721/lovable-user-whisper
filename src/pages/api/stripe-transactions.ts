import type { NextApiRequest, NextApiResponse } from 'next';
import { getCustomerTransactions } from '../../server/stripe';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`Received ${req.method} request to /api/stripe-transactions`);
  if (req.method === 'GET') {
    const { customerId } = req.query;
    console.log(`Customer ID: ${customerId}`);
    if (typeof customerId !== 'string') {
      console.log('Error: Customer ID is required');
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    try {
      const transactions = await getCustomerTransactions(customerId);
      console.log(`Returning ${transactions.paymentIntents.length + transactions.charges.length} transactions`);
      res.status(200).json(transactions);
    } catch (error) {
      console.error('Error in handler:', error);
      res.status(500).json({ error: 'Failed to fetch Stripe transactions' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}