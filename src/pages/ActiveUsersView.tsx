import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserCheck, Activity, TrendingUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";

interface ActiveUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  last_activity?: string;
  call_count?: number;
  subscription_status?: string;
  activity_level: 'high' | 'medium' | 'low';
  days_since_last_call: number;
}

export default function ActiveUsersView() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalActive: 0,
    highActivity: 0,
    mediumActivity: 0,
    lowActivity: 0,
    avgCallsPerUser: 0
  });

  useEffect(() => {
    fetchActiveUsers();
  }, []);

  const fetchActiveUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch users who are actively using the platform
      const { data: usersData, error } = await supabase
        .from('clients')
        .select('*')
        .eq('is_using_platform', true)
        .order('last_activity', { ascending: false });

      if (error) throw error;

      // Transform data to include activity levels
      const activeUsers: ActiveUser[] = (usersData || []).map(user => {
        const lastActivity = user.last_activity ? new Date(user.last_activity) : null;
        const daysSinceLastCall = lastActivity ? 
          Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)) : 999;
        
        let activityLevel: 'high' | 'medium' | 'low' = 'low';
        if (daysSinceLastCall <= 3) {
          activityLevel = 'high';
        } else if (daysSinceLastCall <= 7) {
          activityLevel = 'medium';
        }

        return {
          id: user.id,
          name: user.name || 'Unknown',
          email: user.email || '',
          phone: user.phone,
          company: user.company,
          last_activity: user.last_activity,
          call_count: user.call_count || 0,
          subscription_status: user.subscription_status,
          activity_level: activityLevel,
          days_since_last_call: daysSinceLastCall
        };
      });

      setUsers(activeUsers);
      
      // Calculate stats
      const totalActive = activeUsers.length;
      const highActivity = activeUsers.filter(u => u.activity_level === 'high').length;
      const mediumActivity = activeUsers.filter(u => u.activity_level === 'medium').length;
      const lowActivity = activeUsers.filter(u => u.activity_level === 'low').length;
      const avgCallsPerUser = totalActive > 0 ? 
        activeUsers.reduce((sum, u) => sum + (u.call_count || 0), 0) / totalActive : 0;

      setStats({
        totalActive,
        highActivity,
        mediumActivity,
        lowActivity,
        avgCallsPerUser: Math.round(avgCallsPerUser * 10) / 10
      });
    } catch (error) {
      console.error('Error fetching active users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityIcon = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return <TrendingUp className="h-4 w-4" />;
      case 'medium': return <Activity className="h-4 w-4" />;
      case 'low': return <Calendar className="h-4 w-4" />;
    }
  };

  const formatLastActivity = (lastActivity: string | undefined) => {
    if (!lastActivity) return 'Never';
    const date = new Date(lastActivity);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onLogout={() => {}} />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-green-500" />
              Active Platform Users
            </h1>
            <p className="text-muted-foreground">
              Users actively engaging with the platform features
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Total Active</p>
                      <p className="text-2xl font-bold">{stats.totalActive}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">High Activity</p>
                      <p className="text-2xl font-bold">{stats.highActivity}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium">Medium Activity</p>
                      <p className="text-2xl font-bold">{stats.mediumActivity}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">Avg Calls/User</p>
                      <p className="text-2xl font-bold">{stats.avgCallsPerUser}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {users.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Active Users</h3>
                    <p className="text-muted-foreground">
                      No users are currently active on the platform.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                users.map((user) => (
                  <Card key={user.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{user.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.company && (
                            <p className="text-sm text-muted-foreground">{user.company}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <Badge className={getActivityColor(user.activity_level)}>
                            <div className="flex items-center gap-1">
                              {getActivityIcon(user.activity_level)}
                              {user.activity_level.toUpperCase()} ACTIVITY
                            </div>
                          </Badge>
                          {user.subscription_status && (
                            <Badge variant="outline" className="text-xs">
                              {user.subscription_status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Last Activity:</span>
                          </div>
                          <p className="text-sm text-muted-foreground ml-6">
                            {formatLastActivity(user.last_activity)}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Total Calls:</span>
                          </div>
                          <p className="text-sm text-muted-foreground ml-6">
                            {user.call_count || 0} calls
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Engagement:</span>
                          </div>
                          <p className="text-sm text-muted-foreground ml-6">
                            {user.days_since_last_call === 0 ? 'Active today' :
                             user.days_since_last_call === 1 ? 'Active yesterday' :
                             `${user.days_since_last_call} days ago`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-4">
                        <Button size="sm" className="flex-1">
                          View Analytics
                        </Button>
                        <Button size="sm" variant="outline">
                          Contact User
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}