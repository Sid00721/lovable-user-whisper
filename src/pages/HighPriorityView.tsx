import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Clock, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UserCard } from "@/components/UserCard";
import { Header } from "@/components/Header";

interface HighPriorityClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  last_contact?: string;
  subscription_status?: string;
  urgency_level: 'high' | 'critical';
  reason: string;
}

export default function HighPriorityView() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<HighPriorityClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    urgencyLevel: ['high', 'critical'],
    subscriptionStatus: ['trial_ending', 'payment_failed', 'overdue']
  });

  useEffect(() => {
    fetchHighPriorityClients();
  }, [filters]);

  const fetchHighPriorityClients = async () => {
    try {
      setLoading(true);
      
      // Fetch clients that need immediate attention
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('*')
        .or(
          'subscription_status.in.(trial_ending,payment_failed,overdue),last_contact.lt.' + 
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include urgency levels and reasons
      const priorityClients: HighPriorityClient[] = (clientsData || []).map(client => {
        let urgency: 'high' | 'critical' = 'high';
        let reason = 'Requires attention';

        if (client.subscription_status === 'payment_failed') {
          urgency = 'critical';
          reason = 'Payment failed - immediate action required';
        } else if (client.subscription_status === 'trial_ending') {
          urgency = 'high';
          reason = 'Trial ending soon - conversion opportunity';
        } else if (client.last_contact && 
                   new Date(client.last_contact) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)) {
          urgency = 'critical';
          reason = 'No contact for 14+ days - risk of churn';
        } else if (client.last_contact && 
                   new Date(client.last_contact) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
          urgency = 'high';
          reason = 'No recent contact - follow-up needed';
        }

        return {
          id: client.id,
          name: client.name || 'Unknown',
          email: client.email || '',
          phone: client.phone,
          company: client.company,
          last_contact: client.last_contact,
          subscription_status: client.subscription_status,
          urgency_level: urgency,
          reason
        };
      });

      setClients(priorityClients);
    } catch (error) {
      console.error('Error fetching high priority clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (level: 'high' | 'critical') => {
    return level === 'critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800';
  };

  const getUrgencyIcon = (level: 'high' | 'critical') => {
    return level === 'critical' ? 
      <AlertTriangle className="h-4 w-4" /> : 
      <Clock className="h-4 w-4" />;
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
              <AlertTriangle className="h-6 w-6 text-red-500" />
              High Priority Clients
            </h1>
            <p className="text-muted-foreground">
              Clients requiring immediate attention or follow-up
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">Critical Priority</p>
                      <p className="text-2xl font-bold">
                        {clients.filter(c => c.urgency_level === 'critical').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium">High Priority</p>
                      <p className="text-2xl font-bold">
                        {clients.filter(c => c.urgency_level === 'high').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Total Clients</p>
                      <p className="text-2xl font-bold">{clients.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {clients.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No High Priority Clients</h3>
                    <p className="text-muted-foreground">
                      Great! All clients are up to date with no urgent issues.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                clients.map((client) => (
                  <Card key={client.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{client.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                          {client.company && (
                            <p className="text-sm text-muted-foreground">{client.company}</p>
                          )}
                        </div>
                        <Badge className={getUrgencyColor(client.urgency_level)}>
                          <div className="flex items-center gap-1">
                            {getUrgencyIcon(client.urgency_level)}
                            {client.urgency_level.toUpperCase()}
                          </div>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="font-medium">Reason:</span>
                          <span>{client.reason}</span>
                        </div>
                        
                        {client.last_contact && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Last contact:</span>
                            <span>{new Date(client.last_contact).toLocaleDateString()}</span>
                          </div>
                        )}
                        
                        {client.subscription_status && (
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline">
                              {client.subscription_status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" className="flex-1">
                            <Phone className="h-4 w-4 mr-2" />
                            Contact Now
                          </Button>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </div>
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