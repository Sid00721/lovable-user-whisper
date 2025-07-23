import { useState } from "react";
import { User, Affiliate, Employee } from "@/types/crm";
import { UserCard } from "@/components/UserCard";
import { UserForm } from "@/components/UserForm";
import { AffiliateTracker } from "@/components/AffiliateTracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, TrendingUp, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  
  // Team members - your 4 employees
  const employees: Employee[] = [
    { id: "1", name: "Sarah Johnson", email: "sarah@company.com", role: "Account Manager" },
    { id: "2", name: "Alex Thompson", email: "alex@company.com", role: "Sales Rep" },
    { id: "3", name: "Maria Garcia", email: "maria@company.com", role: "Customer Success" },
    { id: "4", name: "David Chen", email: "david@company.com", role: "Account Manager" }
  ];
  
  // Sample data - in a real app, this would come from a database
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "John Smith",
      email: "john@realestate.com",
      company: "Smith Realty",
      priority: "high",
      usingPlatform: true,
      assignedTo: "Sarah Johnson",
      referredBy: "Mike Johnson",
      lastContact: "2024-01-15",
      notes: "WhatsApped Jan 15, very interested in AI agents",
      commissionApproved: false,
      createdAt: "2024-01-10"
    },
    {
      id: "2",
      name: "Lisa Chen",
      email: "lisa@gmail.com",
      company: "",
      priority: "normal",
      usingPlatform: false,
      assignedTo: "Alex Thompson",
      lastContact: "2024-01-12",
      notes: "Called Jan 12, still evaluating options",
      commissionApproved: false,
      createdAt: "2024-01-08"
    }
  ]);

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

  const handleAddUser = (userData: Partial<User>) => {
    const newUser: User = {
      id: Date.now().toString(),
      name: userData.name || '',
      email: userData.email || '',
      company: userData.company || '',
      priority: userData.priority || 'normal',
      usingPlatform: userData.usingPlatform || false,
      assignedTo: userData.assignedTo || '',
      referredBy: userData.referredBy || '',
      lastContact: userData.lastContact || '',
      notes: userData.notes || '',
      commissionApproved: userData.commissionApproved || false,
      createdAt: new Date().toISOString()
    };
    
    setUsers([...users, newUser]);
    toast({
      title: "User added successfully",
      description: `${newUser.name} has been added to your CRM`,
    });
  };

  const handleEditUser = (userData: Partial<User>) => {
    if (!editingUser) return;
    
    const updatedUsers = users.map(user =>
      user.id === editingUser.id ? { ...user, ...userData } : user
    );
    
    setUsers(updatedUsers);
    setEditingUser(undefined);
    toast({
      title: "User updated successfully",
      description: `${userData.name} has been updated`,
    });
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
  const assignees = [...new Set(users.map(user => user.assignedTo).filter(Boolean))];

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Internal CRM</h1>
            <p className="text-muted-foreground">Manage your early users and track affiliates</p>
          </div>
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
                      {employee.name} - {employee.role}
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
