import { useState, useEffect } from "react";
import { User, Employee } from "@/types/crm";
import { UserCard } from "@/components/UserCard";
import { UserForm } from "@/components/UserForm";
import { PaymentAnalytics } from "@/pages/PaymentAnalytics";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Search, Users, TrendingUp, Clock, CreditCard, DollarSign, AlertTriangle, Zap, BarChart3, RefreshCw, UserCheck } from "lucide-react";
import { MetricCard } from "@/components/MetricsCards";
import { useToast } from "@/hooks/use-toast";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and anonymous key are required.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface IndexProps {
  onLogout: () => void;
}

const Index = ({ onLogout }: IndexProps) => {
  const { toast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);

  // Fetch employees from database
  useEffect(() => {
    const fetchEmployees = async () => {
      const { data, error } = await supabase.from('employees').select('*');
      if (error) {
        console.error('Error fetching employees:', error);
        toast({
          title: "Error fetching employees",
          description: "Failed to fetch employee data",
          variant: "destructive"
        });
      } else if (data) {
        setEmployees(data.map(emp => ({
          id: emp.id,
          name: emp.name,
          email: '',
          role: ''
        })));
      }
    };
    fetchEmployees();
  }, []);

  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error fetching users",
          description: "Failed to fetch user data",
          variant: "destructive"
        });
      } else if (data) {
        // Map Supabase data to User type if needed
        type ClientRow = {
          id: string | number;
          name: string;
          email: string;
          phone?: string;
          company?: string;
          priority?: string;
          is_using_platform?: boolean;
          employee_id?: string;
          referred_by?: string;
          last_contact?: string;
          notes?: string;
          commission_approved?: boolean;
          created_at?: string;
          is_upsell_opportunity?: boolean;
          stripe_customer_id?: string;
          subscription_status?: string;
          subscription_product?: string;
          subscription_plan?: string;
          last_payment_date?: string;
        };

        setUsers((data as ClientRow[]).map((u) => ({
          id: u.id?.toString() ?? '',
          name: u.name ?? '',
          email: u.email ?? '',
          phone: u.phone ?? '',
          company: u.company ?? '',
          priority: u.priority === 'High' ? 'high' : 'normal',
          usingPlatform: u.is_using_platform ?? false,
          assignedTo: employees.find(emp => emp.id === u.employee_id)?.name ?? 'unassigned',
          referredBy: u.referred_by ?? '',
          lastContact: u.last_contact ?? '',
          notes: u.notes ?? '',
          isUpsellOpportunity: u.is_upsell_opportunity ?? false,
          commissionApproved: u.commission_approved ?? false,
          createdAt: u.created_at ?? '',
          stripeCustomerId: u.stripe_customer_id ?? '',
          subscriptionStatus: u.subscription_status ?? '',
          subscriptionProduct: u.subscription_product ?? '',
          subscriptionPlan: getPlanName(u.subscription_plan) ?? '',
          lastPaymentDate: u.last_payment_date ?? ''
        })));
      }
    };
    fetchUsers();
  }, [employees]);



  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>("all");
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [showPaymentAnalytics, setShowPaymentAnalytics] = useState(false);
  const [showMRR, setShowMRR] = useState(false);


  const getPlanName = (planId: string | undefined) => {
    if (!planId) return 'Unknown';
    switch (planId) {
      case 'price_1QfZbBDcOkUDzxSV2PXVe3UB':
        return 'professional';
      case 'price_1QfZbEDcOkUDzxSVIYlwMXiP':
        return 'starter';
      case 'price_1QfZbeDcOkUDzxSVejs1wOCN':
        return 'free';
      default:
        return planId;
    }
  };



  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === "all" || user.priority === priorityFilter;
    const matchesAssigned = assignedFilter === "all" || user.assignedTo === assignedFilter;
    const matchesSubscription = subscriptionFilter === "all" || 
                               (subscriptionFilter === "active" && user.subscriptionStatus === "active") ||
                               (subscriptionFilter === "trialing" && user.subscriptionStatus === "trialing") ||
                               (subscriptionFilter === "past_due" && user.subscriptionStatus === "past_due") ||
                               (subscriptionFilter === "canceled" && user.subscriptionStatus === "canceled") ||
                               (subscriptionFilter === "no_subscription" && !user.stripeCustomerId) ||
                               (subscriptionFilter === "free" && user.subscriptionPlan === "free") ||
                               (subscriptionFilter === "starter" && user.subscriptionPlan === "starter") ||
                               (subscriptionFilter === "professional" && user.subscriptionPlan === "professional");
    
    return matchesSearch && matchesPriority && matchesAssigned && matchesSubscription;
  });

  const handleAddUser = async (userData: Partial<User>) => {
    try {
      // Find the employee ID based on the name
      const selectedEmployee = userData.assignedTo && userData.assignedTo !== 'unassigned' 
        ? employees.find(emp => emp.name === userData.assignedTo) 
        : null;
      const employeeId = selectedEmployee ? selectedEmployee.id : null;



      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          company: userData.company || '',
          priority: userData.priority === 'high' ? 'High' : 'Normal',
          is_using_platform: userData.usingPlatform || false,
          employee_id: employeeId,
          referred_by: userData.referredBy || '',
          last_contact: userData.lastContact || null,
          notes: userData.notes || '',
          is_upsell_opportunity: userData.isUpsellOpportunity || false,
          commission_approved: userData.commissionApproved || false
        }])
        .select()
        .single();

      if (error) throw error;

      // Refresh the users list
      const { data: allUsers, error: fetchError } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      
      if (allUsers) {
        setUsers((allUsers as any[]).map((u) => ({
          id: u.id?.toString() ?? '',
          name: u.name ?? '',
          email: u.email ?? '',
          phone: u.phone ?? '',
          company: u.company ?? '',
          priority: u.priority === 'High' ? 'high' : 'normal',
          usingPlatform: u.is_using_platform ?? false,
          assignedTo: employees.find(emp => emp.id === u.employee_id)?.name ?? 'unassigned',
          referredBy: u.referred_by ?? '',
          lastContact: u.last_contact ?? '',
          notes: u.notes ?? '',
          isUpsellOpportunity: u.is_upsell_opportunity ?? false,
          commissionApproved: u.commission_approved ?? false,
          createdAt: u.created_at ?? '',
          stripeCustomerId: u.stripe_customer_id ?? '',
          subscriptionStatus: u.subscription_status ?? '',
          subscriptionProduct: u.subscription_product ?? '',
          subscriptionPlan: getPlanName(u.subscription_plan) ?? '',
          lastPaymentDate: u.last_payment_date ?? ''
        })));
      }

      toast({
        title: "User added successfully",
        description: `${userData.name} has been added to your CRM`,
      });
    } catch (error) {
      console.error('Error adding user:', error);
      toast({
        title: "Error adding user",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleEditUser = async (userData: Partial<User>) => {
    if (!editingUser) return;
    
    try {
      // Find the employee ID based on the name
      const selectedEmployee = userData.assignedTo && userData.assignedTo !== 'unassigned' 
        ? employees.find(emp => emp.name === userData.assignedTo) 
        : null;
      const employeeId = selectedEmployee ? selectedEmployee.id : null;

      const { error } = await supabase
        .from('clients')
        .update({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          company: userData.company || '',
          priority: userData.priority === 'high' ? 'High' : 'Normal',
          is_using_platform: userData.usingPlatform || false,
          employee_id: employeeId,
          referred_by: userData.referredBy || '',
          last_contact: userData.lastContact || null,
          notes: userData.notes || '',
          is_upsell_opportunity: userData.isUpsellOpportunity || false,
          commission_approved: userData.commissionApproved || false,
          stripe_customer_id: userData.stripeCustomerId || '',
          subscription_status: userData.subscriptionStatus || '',
          subscription_product: userData.subscriptionProduct || '',
          subscription_plan: userData.subscriptionPlan || '',
          last_payment_date: userData.lastPaymentDate || null
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      // Refresh the users list
      const { data: allUsers, error: fetchError } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      
      if (allUsers) {
        // Map the data properly, including finding employee names
        setUsers((allUsers as any[]).map((u) => ({
          id: u.id?.toString() ?? '',
          name: u.name ?? '',
          email: u.email ?? '',
          phone: u.phone ?? '',
          company: u.company ?? '',
          priority: u.priority === 'High' ? 'high' : 'normal',
          usingPlatform: u.is_using_platform ?? false,
          assignedTo: employees.find(emp => emp.id === u.employee_id)?.name ?? 'unassigned',
          referredBy: u.referred_by ?? '',
          lastContact: u.last_contact ?? '',
          notes: u.notes ?? '',
          isUpsellOpportunity: u.is_upsell_opportunity ?? false,
          commissionApproved: u.commission_approved ?? false,
          createdAt: u.created_at ?? '',
          stripeCustomerId: u.stripe_customer_id ?? '',
          subscriptionStatus: u.subscription_status ?? '',
          subscriptionProduct: u.subscription_product ?? '',
          subscriptionPlan: getPlanName(u.subscription_plan) ?? '',
          lastPaymentDate: u.last_payment_date ?? ''
        })));
      }

      setEditingUser(undefined);
      toast({
        title: "User updated successfully",
        description: `${userData.name} has been updated`,
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error updating user",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };



  const openEditForm = (user: User) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const openAddForm = () => {
    setEditingUser(undefined);
    setShowUserForm(true);
  };

  // Get unique assignees for filter
  const assignees = employees.map(emp => emp.name);

  // Stats
  const highPriorityCount = users.filter(u => u.priority === 'high').length;
  const usingPlatformCount = users.filter(u => u.usingPlatform).length;
  const needsContactCount = users.filter(u => u.assignedTo === 'unassigned').length;

  // Subscription Stats
  const activeSubscriptionsCount = users.filter(u => u.subscriptionStatus === 'active').length;
  const payingSubscribersCount = users.filter(u => u.subscriptionPlan === 'starter' || u.subscriptionPlan === 'professional').length;
  const starterCount = users.filter(u => u.subscriptionPlan === 'starter').length;
  const professionalCount = users.filter(u => u.subscriptionPlan === 'professional').length;
  const mrr = (starterCount * 15) + (professionalCount * 50);
  const freeUserCount = users.filter(u => u.subscriptionPlan === 'free' || (u.subscriptionProduct && u.subscriptionProduct.includes('Free Tier'))).length;
  const pastDueCount = users.filter(u => u.subscriptionStatus === 'past_due').length;

  // Handle navigation
  if (showPaymentAnalytics) {
    return <PaymentAnalytics onBack={() => setShowPaymentAnalytics(false)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onLogout={onLogout} showAnalyticsButton={true} />
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mb-6">
          <Button 
            onClick={() => setShowPaymentAnalytics(true)} 
            variant="outline" 
            className="shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Payment Analytics
          </Button>
          <Button onClick={openAddForm} className="shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Stats Cards */}
        <TooltipProvider delayDuration={100}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Total Users"
              value={users.length}
              icon={<Users className="h-5 w-5 text-primary" />}
              description="All registered users"
              tooltip="Total number of users registered in the system, including both active and inactive accounts"
              className="shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
            />
            
            <MetricCard
              title="High Priority"
              value={highPriorityCount}
              icon={<AlertTriangle className="h-5 w-5 text-high-priority" />}
              description="Users requiring attention"
              tooltip="Users marked as high priority who need immediate attention or follow-up"
              className="shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
            />

            <MetricCard
              title="Using Platform"
              value={usingPlatformCount}
              icon={<UserCheck className="h-5 w-5 text-primary" />}
              description="Active platform users"
              tooltip="Users with calls in last 30 days - actively using the platform features"
              className="shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
            />

            <MetricCard
              title="Needs Contact"
              value={needsContactCount}
              icon={<Clock className="h-5 w-5 text-muted-foreground" />}
              description="Requires follow-up"
              tooltip="Users who haven't been contacted recently and may need follow-up communication"
              className="shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
            />
          </div>
        </TooltipProvider>

        {/* Subscription Stats Cards */}
        <TooltipProvider delayDuration={100}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Active Subscriptions"
              value={activeSubscriptionsCount}
              icon={<CreditCard className="h-5 w-5 text-green-600" />}
              description={users.length > 0 ? `${Math.round((activeSubscriptionsCount / users.length) * 100)}% of total users` : 'No users yet'}
              tooltip="Number of users with active paid subscriptions who are currently being charged"
              className="shadow-[0_2px_6px_rgba(0,0,0,0.06)] border-green-200 bg-green-50/50"
            />
            
            <div onClick={() => setShowMRR(!showMRR)} className="cursor-pointer">
              <MetricCard
                title={showMRR ? 'Monthly Recurring Revenue' : 'Paying Subscribers'}
                value={showMRR ? `$${mrr}` : payingSubscribersCount}
                icon={<DollarSign className="h-5 w-5 text-blue-600" />}
                description={showMRR ? `${starterCount} starter ($15) + ${professionalCount} pro ($50)` : 'Starter & Professional plans'}
                tooltip={showMRR ? 'Total recurring revenue generated per month from all active subscriptions' : 'Click to toggle between subscriber count and monthly revenue view'}
                className="shadow-[0_2px_6px_rgba(0,0,0,0.06)] border-blue-200 bg-blue-50/50 hover:bg-blue-100/50 transition-colors"
              />
            </div>

            <MetricCard
              title="Free Tier Users"
              value={freeUserCount}
              icon={<Zap className="h-5 w-5 text-purple-600" />}
              description="Potential conversions"
              tooltip="Users on the free tier who could potentially be converted to paid plans"
              className="shadow-[0_2px_6px_rgba(0,0,0,0.06)] border-purple-200 bg-purple-50/50"
            />

            <MetricCard
              title="Past Due"
              value={pastDueCount}
              icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
              description="Requires attention"
              tooltip="Users with overdue payments who need immediate attention for billing issues"
              className="shadow-[0_2px_6px_rgba(0,0,0,0.06)] border-orange-200 bg-orange-50/50"
            />
          </div>
        </TooltipProvider>



        {/* Filters */}
        <Card className="mb-8 shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
          <CardContent className="p-4">
            <div className="flex gap-6 flex-wrap">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    placeholder="Search users by name, email, phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high"><AlertTriangle className="h-4 w-4 inline mr-1" /> High Priority</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>

              <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Filter by team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Members</SelectItem>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.name}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Filter by subscription" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscriptions</SelectItem>
                  <SelectItem value="active">✓ Active</SelectItem>
                  <SelectItem value="trialing">🎯 Trial</SelectItem>
                  <SelectItem value="past_due">⚠ Past Due</SelectItem>
                  <SelectItem value="canceled">✗ Canceled</SelectItem>
                  <SelectItem value="no_subscription">No Subscription</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredUsers.map((user) => (
            <UserCard
              onMarkUpsell={(user) => {
                // Handle marking user as upsell opportunity
                handleEditUser({...user, isUpsellOpportunity: true});
              }}
              key={user.id}
              user={user}
              onEdit={openEditForm}
            />
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardContent className="text-center py-16">
              <p className="text-muted-foreground text-lg">No users found matching your criteria</p>
            </CardContent>
          </Card>
        )}

        {/* User Form Dialog */}
        <UserForm
          open={showUserForm}
          onOpenChange={setShowUserForm}
          user={editingUser}
          onSave={editingUser ? handleEditUser : handleAddUser}
          employees={employees}
        />
      </main>
    </div>
  );
};

export default Index;
