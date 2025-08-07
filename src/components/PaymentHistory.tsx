import { useState, useEffect } from "react";
import { User } from "@/types/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TransactionRecord {
  id: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  description: string;
}

interface PaymentHistoryProps {
  users: User[];
}

export function PaymentHistory({ users }: PaymentHistoryProps) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("all");

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const allTransactions: TransactionRecord[] = [];
        for (const user of users) {
          if (user.stripeCustomerId) {
            console.log(`Fetching transactions for user: ${user.email}, Stripe ID: ${user.stripe_customer_id}`);
            const session = await supabase.auth.getSession();
            const accessToken = session.data.session?.access_token;
            if (!accessToken) {
              console.error('No access token available');
              continue;
            }
            const response = await fetch('https://tbplhgbtnksyqnuqfncr.functions.supabase.co/get-transactions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ customerId: user.stripeCustomerId }),
            });
            console.log(`Response status: ${response.status}`);
            if (!response.ok) {
              console.error('Edge function error:', await response.text());
              continue;
            }
            const data = await response.json();
            console.log(`Received data:`, data);
            
            if (data.paymentIntents) {
              data.paymentIntents.forEach((pi: any) => {
                allTransactions.push({
                  id: pi.id,
                  customerName: user.name || '',
                  customerEmail: user.email,
                  amount: pi.amount / 100,
                  currency: pi.currency,
                  status: pi.status,
                  created: new Date(pi.created * 1000).toISOString(),
                  description: pi.description || 'Payment Intent',
                });
              });
            }

            if (data.charges) {
                data.charges.forEach((ch: any) => {
                  allTransactions.push({
                    id: ch.id,
                    customerName: user.name || '',
                    customerEmail: user.email,
                    amount: ch.amount / 100,
                    currency: ch.currency,
                    status: ch.status,
                    created: new Date(ch.created * 1000).toISOString(),
                    description: ch.description || 'Charge',
                  });
                });
              }
          }
        }
        setTransactions(allTransactions.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()));
      } catch (error) {
        console.error('Error fetching Stripe transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (users.length > 0) {
      fetchTransactions();
    }
  }, [users]);

  const filteredTransactions = transactions.filter(transaction => {
    if (selectedUser !== "all" && transaction.customerEmail !== selectedUser) return false;
    return true;
  });

  if (loading) {
    return <div>Loading payment history...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <div className="flex items-center space-x-4 pt-4">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.email}>{user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Transaction ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map(transaction => (
              <TableRow key={transaction.id}>
                <TableCell>
                  <div className="font-medium">{transaction.customerName}</div>
                  <div className="text-sm text-muted-foreground">{transaction.customerEmail}</div>
                </TableCell>
                <TableCell>{new Date(transaction.created).toLocaleString()}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                <TableCell><Badge variant={transaction.status === 'succeeded' ? 'default' : 'secondary'}>{transaction.status}</Badge></TableCell>
                <TableCell>{transaction.id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}