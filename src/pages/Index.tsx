import { useState, useEffect } from "react";
import { User, Affiliate, SignupNotification } from "@/types/crm";
import { UserCard } from "@/components/UserCard";
import { UserForm } from "@/components/UserForm";
import { AffiliateTracker } from "@/components/AffiliateTracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, TrendingUp, Clock, Webhook, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  
  // Users data loaded from backend API
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial data from backend
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/users');
        if (response.ok) {
          const usersData = await response.json();
          setUsers(usersData);
        } else {
          console.error('Failed to load users');
        }
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Set up webhook listener for Clerk signups
  useEffect(() => {
    const handleClerkWebhook = async () => {
      try {
        // Listen for webhook notifications from Clerk
        const eventSource = new EventSource('/api/clerk-webhooks');
        
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'user.created') {
            const newUser: User = {
              id: data.data.id,
              name: `${data.data.first_name || ''} ${data.data.last_name || ''}`.trim() || 'Unknown User',
              email: data.data.email_addresses[0]?.email_address || '',
              phone: data.data.phone_numbers[0]?.phone_number || '',
              company: '',
              priority: 'normal',
              usingPlatform: true,
              assignedTo: 'Auto-assigned',
              referredBy: '',
              lastContact: new Date().toISOString().split('T')[0],
              notes: 'New signup via Clerk',
              commissionApproved: false,
              createdAt: new Date(data.data.created_at).toISOString()
            };
            
            setUsers(prevUsers => [newUser, ...prevUsers]);
            toast({
              title: "🔔 New Signup Received!",
              description: `${newUser.name} (${newUser.email}) has been automatically added`,
            });
          }
        };
        
        return () => eventSource.close();
      } catch (error) {
        console.log('Webhook listener setup - will use simulation for demo');
      }
    };
    
    handleClerkWebhook();
  }, [toast]);

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
      const response = await fetch('http://localhost:3001/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (response.ok) {
        const newUser = await response.json();
        setUsers([newUser, ...users]);
        toast({
          title: "User added successfully",
          description: `${newUser.name} has been added to your CRM`,
        });
      } else {
        throw new Error('Failed to add user');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      toast({
        title: "Error adding user",
        description: "Failed to save user to database. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Simulate Clerk webhook for testing
  const simulateClerkSignup = async () => {
    const sampleSignups: SignupNotification[] = [
      {
        name: "Emma Rodriguez",
        email: "emma@luxuryrealty.com",
        phone: "+1555123456",
        company: "Luxury Realty Group",
        timestamp: new Date().toISOString()
      },
      {
        name: "David Kim",
        email: "david@techstartup.io",
        phone: "+1555987654",
        timestamp: new Date().toISOString()
      },
      {
        name: "Sarah Johnson",
        email: "sarah@propertyexperts.com",
        phone: "+1555456789",
        company: "Property Experts LLC",
        timestamp: new Date().toISOString()
      }
    ];
    
    const randomSignup = sampleSignups[Math.floor(Math.random() * sampleSignups.length)];
    
    try {
      // Create user data for API call
      const userData = {
        name: randomSignup.name,
        email: randomSignup.email,
        phone: randomSignup.phone || '',
        company: randomSignup.company || '',
        priority: 'normal',
        usingPlatform: true,
        assignedTo: 'Auto-assigned',
        referredBy: '',
        lastContact: new Date().toISOString().split('T')[0],
        notes: 'New signup via Clerk webhook simulation',
        commissionApproved: false
      };
      
      // Call the API to add the user
      const response = await fetch('http://localhost:3001/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (response.ok) {
        const newUser = await response.json();
        setUsers(prevUsers => [newUser, ...prevUsers]);
        toast({
          title: "🔔 New Clerk Signup!",
          description: `${newUser.name} (${newUser.email}) signed up and was automatically added`,
        });
      } else {
        throw new Error('Failed to simulate signup');
      }
    } catch (error) {
      console.error('Error simulating signup:', error);
      toast({
        title: "Error simulating signup",
        description: "Failed to add simulated user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = async (userData: Partial<User>) => {
    if (!editingUser) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        const updatedUsers = users.map(user =>
          user.id === editingUser.id ? updatedUser : user
        );
        
        setUsers(updatedUsers);
        setEditingUser(undefined);
        toast({
          title: "User updated successfully",
          description: `${updatedUser.name} has been updated`,
        });
      } else {
        throw new Error('Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error updating user",
        description: "Failed to save changes to database. Please try again.",
        variant: "destructive",
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
            <h1 className="text-3xl font-bold text-foreground">Voqo Internal CRM</h1>
            <p className="text-muted-foreground">Manage users from Clerk signups and track affiliates</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={simulateClerkSignup}>
              <Bell className="h-4 w-4 mr-2" />
              Simulate Clerk Signup
            </Button>
            <Button onClick={openAddForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
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
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {assignees.map(assignee => (
                    <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Grid */}
        {loading ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Loading users...</p>
            </CardContent>
          </Card>
        ) : (
          <>
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
          </>
        )}

        {/* User Form Dialog */}
        <UserForm
          open={showUserForm}
          onOpenChange={setShowUserForm}
          user={editingUser}
          onSave={editingUser ? handleEditUser : handleAddUser}
        />
      </div>
    </div>
  );
};

export default Index;
