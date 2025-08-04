import { useState, useEffect } from "react";
import { User, Affiliate, Employee } from "@/types/crm";
import { UserCard } from "@/components/UserCard";
import { UserForm } from "@/components/UserForm";
import { AffiliateTracker } from "@/components/AffiliateTracker";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, TrendingUp, Clock } from "lucide-react";
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
        };

        setUsers((data as ClientRow[]).map((u) => ({
          id: u.id?.toString() ?? '',
          name: u.name ?? '',
          email: u.email ?? '',
          phone: u.phone ?? '',
          company: u.company ?? '',
          priority: u.priority === 'High' ? 'high' : 'normal',
          usingPlatform: u.is_using_platform ?? false,
          assignedTo: employees.find(emp => emp.id === u.employee_id)?.name ?? '',
          referredBy: u.referred_by ?? '',
          lastContact: u.last_contact ?? '',
          notes: u.notes ?? '',
          commissionApproved: u.commission_approved ?? false,
          createdAt: u.created_at ?? ''
        })));
      }
    };
    fetchUsers();
  }, [employees]);

  const [affiliates, setAffiliates] = useState<Affiliate[]>([
    {
      id: "1",
      referredBy: "Mike Johnson",
      referredUser: "John Smith",
      status: "pending",
      amount: 50,
      paid: false
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === "all" || user.priority === priorityFilter;
    const matchesAssigned = assignedFilter === "all" || user.assignedTo === assignedFilter;
    
    return matchesSearch && matchesPriority && matchesAssigned;
  });

  const handleAddUser = async (userData: Partial<User>) => {
    try {
      // Find the employee ID based on the name
      const selectedEmployee = employees.find(emp => emp.name === userData.assignedTo);
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
          assignedTo: employees.find(emp => emp.id === u.employee_id)?.name ?? '',
          referredBy: u.referred_by ?? '',
          lastContact: u.last_contact ?? '',
          notes: u.notes ?? '',
          commissionApproved: u.commission_approved ?? false,
          createdAt: u.created_at ?? ''
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
      const selectedEmployee = employees.find(emp => emp.name === userData.assignedTo);
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
          commission_approved: userData.commissionApproved || false
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
          assignedTo: employees.find(emp => emp.id === u.employee_id)?.name ?? '',
          referredBy: u.referred_by ?? '',
          lastContact: u.last_contact ?? '',
          notes: u.notes ?? '',
          commissionApproved: u.commission_approved ?? false,
          createdAt: u.created_at ?? ''
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

  const handleMarkPaid = (affiliateId: string) => {
    setAffiliates(affiliates.map(affiliate =>
      affiliate.id === affiliateId ? { ...affiliate, paid: true } : affiliate
    ));
    toast({
      title: "Commission marked as paid",
      description: "Affiliate payment has been recorded",
    });
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
  const needsContactCount = users.filter(u => {
    if (!u.lastContact) return true;
    const lastContact = new Date(u.lastContact);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return lastContact < weekAgo;
  }).length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Header onLogout={onLogout} />
        
        {/* Add User Button */}
        <div className="flex justify-end">
          <Button onClick={openAddForm}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Priority</CardTitle>
              <Badge className="bg-high-priority text-high-priority-foreground">🔥</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{highPriorityCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Using Platform</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usingPlatformCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs Contact</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{needsContactCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Affiliate Tracker */}
        <AffiliateTracker 
          affiliates={affiliates}
          onMarkPaid={handleMarkPaid}
        />

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
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
                  <SelectItem value="high">🔥 High Priority</SelectItem>
                  <SelectItem value="normal">⭐ Normal</SelectItem>
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
            </div>
          </CardContent>
        </Card>

        {/* Users Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={openEditForm}
            />
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No users found matching your criteria</p>
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
      </div>
    </div>
  );
};

export default Index;
