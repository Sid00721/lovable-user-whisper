import { useState, useEffect } from "react";
import { User, Employee } from "@/types/crm";
import { PaymentHistory } from "@/components/PaymentHistory";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createClient } from '@supabase/supabase-js';
import { toast } from "sonner";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface PaymentAnalyticsProps {
  onBack: () => void;
}

export function PaymentAnalytics({ onBack }: PaymentAnalyticsProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch employees first
        const { data: employeesData, error: employeesError } = await supabase.from('employees').select('id, name');
        if (employeesError) {
          console.error('Error fetching employees:', employeesError);
          toast.error('Failed to fetch employee data');
          return;
        }
        const fetchedEmployees: Employee[] = employeesData || [];

        // Then fetch users
        const { data: usersData, error: usersError } = await supabase
          .from('clients')
          .select(`
            id,
            name,
            email,
            phone,
            company,
            priority,
            notes,
            is_using_platform,
            employee_id,
            last_contact,
            referred_by,
            stripe_customer_id,
            subscription_status,
            subscription_product,
            subscription_plan,
            last_payment_date
          `);

        if (usersError) {
          console.error('Error fetching users:', usersError);
          toast.error('Failed to fetch user data');
          return;
        }

        const mappedUsers: User[] = (usersData || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          company: row.company,
          priority: row.priority,
          notes: row.notes,
          usingPlatform: row.is_using_platform,
          assignedTo: fetchedEmployees.find(emp => emp.id === row.employee_id)?.name ?? 'unassigned',
          lastContact: row.last_contact,
          referredBy: row.referred_by,
          stripeCustomerId: row.stripe_customer_id,
          subscriptionStatus: row.subscription_status,
          subscriptionProduct: row.subscription_product,
          subscriptionPlan: row.subscription_plan,
          lastPaymentDate: row.last_payment_date
        }));

        setUsers(mappedUsers);

      } catch (error) {
        console.error('Error:', error);
        toast.error('An error occurred while fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button 
            onClick={onBack} 
            variant="outline" 
            size="sm" 
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        
        <PaymentHistory users={users} />
      </div>
    </div>
  );
}