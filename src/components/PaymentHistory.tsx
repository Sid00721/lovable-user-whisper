import { useState, useEffect } from "react";
import { User } from "@/types/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, Calendar, CreditCard, Users, BarChart3, Download } from "lucide-react";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface PaymentRecord {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  status: string;
  paymentDate: string;
  subscriptionProduct: string;
  subscriptionPlan: string;
  invoiceId?: string;
}

interface RevenueMetrics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  revenueByTier: {
    free: number;
    starter: number;
    professional: number;
  };
  customersByTier: {
    free: number;
    starter: number;
    professional: number;
  };
}

interface PaymentHistoryProps {
  users: User[];
}

export function PaymentHistory({ users }: PaymentHistoryProps) {
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentHistory = async () => {
      setLoading(true);
      const allPayments: PaymentRecord[] = [];

      for (const user of users) {
        if (user.id) {
          const { data: invoices, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('client_id', user.id)
            .order('created_at', { ascending: false });

          if (error) {
            // Only log errors that are not 'undefined_table'
            if (error.code !== '42P01') {
              console.error(`Error fetching invoices for user ${user.id}:`, error);
            }
            // For 42P01, we'll just proceed with invoices as null and not log anything.
          }

          if (invoices) {
            const userPayments = invoices.map(inv => ({
              id: inv.id,
              customerId: user.stripeCustomerId || '',
              customerName: user.name,
              customerEmail: user.email,
              amount: inv.amount_paid,
              currency: 'USD', // Assuming USD, you might want to get this from invoice data
              status: inv.status,
              paymentDate: inv.created_at,
              subscriptionProduct: user.subscriptionProduct || '',
              subscriptionPlan: user.subscriptionPlan || '',
              invoiceId: inv.id,
            }));
            allPayments.push(...userPayments);
          }
        }
      }

      setPaymentRecords(allPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()));
      setLoading(false);
    };

    if (users.length > 0) {
      fetchPaymentHistory();
    }
  }, [users]);

  // Calculate revenue metrics
  const calculateMetrics = (): RevenueMetrics => {
    const filteredPayments = paymentRecords.filter(payment => {
      const matchesUser = selectedUser === "all" || payment.customerId === selectedUser;
      const matchesTier = selectedTier === "all" || 
        (selectedTier === "starter" && payment.subscriptionProduct.includes('Starter')) ||
        (selectedTier === "professional" && payment.subscriptionProduct.includes('Professional')) ||
        (selectedTier === "free" && payment.subscriptionProduct.includes('Free'));
      
      let matchesTimeRange = true;
      if (timeRange !== "all") {
        const paymentDate = new Date(payment.paymentDate);
        const now = new Date();
        const monthsAgo = parseInt(timeRange);
        const cutoffDate = new Date(now.setMonth(now.getMonth() - monthsAgo));
        matchesTimeRange = paymentDate >= cutoffDate;
      }
      
      return matchesUser && matchesTier && matchesTimeRange;
    });

    const totalRevenue = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const uniqueCustomers = new Set(filteredPayments.map(p => p.customerId)).size;
    const averageRevenuePerUser = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;
    
    // Calculate MRR (assuming current month)
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const currentMonthPayments = filteredPayments.filter(p => 
      new Date(p.paymentDate) >= currentMonth
    );
    const monthlyRecurringRevenue = currentMonthPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Revenue by tier
    const revenueByTier = {
      free: filteredPayments.filter(p => p.subscriptionProduct.includes('Free')).reduce((sum, p) => sum + p.amount, 0),
      starter: filteredPayments.filter(p => p.subscriptionProduct.includes('Starter')).reduce((sum, p) => sum + p.amount, 0),
      professional: filteredPayments.filter(p => p.subscriptionProduct.includes('Professional')).reduce((sum, p) => sum + p.amount, 0)
    };
    
    // Customers by tier
    const customersByTier = {
      free: users.filter(u => u.subscriptionProduct?.includes('Free')).length,
      starter: users.filter(u => u.subscriptionProduct?.includes('Starter')).length,
      professional: users.filter(u => u.subscriptionProduct?.includes('Professional')).length
    };

    return {
      totalRevenue,
      monthlyRecurringRevenue,
      averageRevenuePerUser,
      revenueByTier,
      customersByTier
    };
  };

  const metrics = calculateMetrics();
  const filteredPayments = paymentRecords.filter(payment => {
    const matchesUser = selectedUser === "all" || payment.customerId === selectedUser;
    const matchesTier = selectedTier === "all" || 
      (selectedTier === "starter" && payment.subscriptionProduct.includes('Starter')) ||
      (selectedTier === "professional" && payment.subscriptionProduct.includes('Professional')) ||
      (selectedTier === "free" && payment.subscriptionProduct.includes('Free'));
    
    let matchesTimeRange = true;
    if (timeRange !== "all") {
      const paymentDate = new Date(payment.paymentDate);
      const now = new Date();
      const monthsAgo = parseInt(timeRange);
      const cutoffDate = new Date(now.setMonth(now.getMonth() - monthsAgo));
      matchesTimeRange = paymentDate >= cutoffDate;
    }
    
    return matchesUser && matchesTier && matchesTimeRange;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportData = () => {
    const csvContent = [
      ['Customer Name', 'Email', 'Product', 'Amount', 'Payment Date', 'Status', 'Invoice ID'],
      ...filteredPayments.map(payment => [
        payment.customerName,
        payment.customerEmail,
        payment.subscriptionProduct,
        payment.amount.toString(),
        formatDate(payment.paymentDate),
        payment.status,
        payment.invoiceId || ''
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Payment History & Revenue Analytics</h2>
        <Button onClick={exportData} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Revenue Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {paymentRecords.length} payments
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Recurring Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(metrics.monthlyRecurringRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Current month
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Revenue Per User</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{formatCurrency(metrics.averageRevenuePerUser)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Lifetime value
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue by Tier</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Professional:</span>
                <span className="font-medium">{formatCurrency(metrics.revenueByTier.professional)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Starter:</span>
                <span className="font-medium">{formatCurrency(metrics.revenueByTier.starter)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Tier Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-emerald-700">Professional Tier</CardTitle>
            <p className="text-sm text-muted-foreground">$50/month</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Customers:</span>
                <Badge variant="secondary">{metrics.customersByTier.professional}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Revenue:</span>
                <span className="font-medium">{formatCurrency(metrics.revenueByTier.professional)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Monthly Potential:</span>
                <span className="font-medium">{formatCurrency(metrics.customersByTier.professional * 50)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-blue-700">Starter Tier</CardTitle>
            <p className="text-sm text-muted-foreground">$15/month</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Customers:</span>
                <Badge variant="secondary">{metrics.customersByTier.starter}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Revenue:</span>
                <span className="font-medium">{formatCurrency(metrics.revenueByTier.starter)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Monthly Potential:</span>
                <span className="font-medium">{formatCurrency(metrics.customersByTier.starter * 15)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-gray-50/50">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-700">Free Tier</CardTitle>
            <p className="text-sm text-muted-foreground">$0/month</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Customers:</span>
                <Badge variant="secondary">{metrics.customersByTier.free}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Conversion Opportunity:</span>
                <span className="font-medium">{formatCurrency(metrics.customersByTier.free * 15)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {users.filter(u => u.stripeCustomerId).map(user => (
                  <SelectItem key={user.id} value={user.stripeCustomerId!}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="professional">Professional ($50)</SelectItem>
                <SelectItem value="starter">Starter ($15)</SelectItem>
                <SelectItem value="free">Free ($0)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="1">Last Month</SelectItem>
                <SelectItem value="3">Last 3 Months</SelectItem>
                <SelectItem value="6">Last 6 Months</SelectItem>
                <SelectItem value="12">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Payment History
            <Badge variant="outline">{filteredPayments.length} payments</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.slice(0, 50).map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.customerName}</div>
                        <div className="text-sm text-muted-foreground">{payment.customerEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{payment.subscriptionProduct}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatCurrency(payment.amount)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(payment.paymentDate)}</div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={payment.status === 'paid' ? 'default' : 'destructive'}
                        className={payment.status === 'paid' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-mono">{payment.invoiceId}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredPayments.length > 50 && (
              <div className="p-4 text-center text-sm text-muted-foreground border-t">
                Showing first 50 of {filteredPayments.length} payments
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}