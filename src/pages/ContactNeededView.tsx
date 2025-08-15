import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, Clock, AlertTriangle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";

interface ContactNeededClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  last_contact?: string;
  subscription_status?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  reason: string;
  days_since_contact: number;
  contact_method?: 'phone' | 'email' | 'both';
}

export default function ContactNeededView() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ContactNeededClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalNeedingContact: 0,
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0,
    avgDaysSinceContact: 0
  });

  useEffect(() => {
    fetchContactNeededClients();
  }, []);

  const fetchContactNeededClients = async () => {
    try {
      setLoading(true);
      
      // Fetch all clients to analyze contact needs
      const { data: clientsData, error } = await supabase
        .from('clients')
        .select('*')
        .order('last_contact', { ascending: true, nullsFirst: true });

      if (error) throw error;

      // Transform data to identify clients needing contact
      const contactNeededClients: ContactNeededClient[] = [];
      const now = new Date();

      (clientsData || []).forEach(client => {
        const lastContact = client.last_contact ? new Date(client.last_contact) : null;
        const daysSinceContact = lastContact ? 
          Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24)) : 999;
        
        let needsContact = false;
        let priority: 'urgent' | 'high' | 'medium' | 'low' = 'low';
        let reason = '';
        let contactMethod: 'phone' | 'email' | 'both' = 'email';

        // Determine if client needs contact based on various factors
        if (client.subscription_status === 'trial_ending') {
          needsContact = true;
          priority = 'urgent';
          reason = 'Trial ending soon';
          contactMethod = 'both';
        } else if (client.subscription_status === 'payment_failed') {
          needsContact = true;
          priority = 'urgent';
          reason = 'Payment failed';
          contactMethod = 'both';
        } else if (client.subscription_status === 'overdue') {
          needsContact = true;
          priority = 'urgent';
          reason = 'Account overdue';
          contactMethod = 'both';
        } else if (daysSinceContact > 30) {
          needsContact = true;
          priority = 'high';
          reason = 'No contact for over 30 days';
          contactMethod = 'phone';
        } else if (daysSinceContact > 14 && client.subscription_status === 'active') {
          needsContact = true;
          priority = 'medium';
          reason = 'Check-in needed';
          contactMethod = 'email';
        } else if (daysSinceContact > 7 && client.subscription_status === 'trial') {
          needsContact = true;
          priority = 'medium';
          reason = 'Trial follow-up';
          contactMethod = 'email';
        } else if (!lastContact && client.created_at) {
          const daysSinceCreated = Math.floor((now.getTime() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceCreated > 3) {
            needsContact = true;
            priority = 'high';
            reason = 'New client - no initial contact';
            contactMethod = 'phone';
          }
        }

        if (needsContact) {
          contactNeededClients.push({
            id: client.id,
            name: client.name || 'Unknown',
            email: client.email || '',
            phone: client.phone,
            company: client.company,
            last_contact: client.last_contact,
            subscription_status: client.subscription_status,
            priority,
            reason,
            days_since_contact: daysSinceContact,
            contact_method: contactMethod
          });
        }
      });

      // Sort by priority (urgent first)
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      contactNeededClients.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      setClients(contactNeededClients);
      
      // Calculate stats
      const totalNeedingContact = contactNeededClients.length;
      const urgent = contactNeededClients.filter(c => c.priority === 'urgent').length;
      const high = contactNeededClients.filter(c => c.priority === 'high').length;
      const medium = contactNeededClients.filter(c => c.priority === 'medium').length;
      const low = contactNeededClients.filter(c => c.priority === 'low').length;
      const avgDaysSinceContact = totalNeedingContact > 0 ? 
        contactNeededClients.reduce((sum, c) => sum + c.days_since_contact, 0) / totalNeedingContact : 0;

      setStats({
        totalNeedingContact,
        urgent,
        high,
        medium,
        low,
        avgDaysSinceContact: Math.round(avgDaysSinceContact)
      });
    } catch (error) {
      console.error('Error fetching contact needed clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: 'urgent' | 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getPriorityIcon = (priority: 'urgent' | 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <Clock className="h-4 w-4" />;
      case 'medium': return <Calendar className="h-4 w-4" />;
      case 'low': return <Mail className="h-4 w-4" />;
    }
  };

  const getContactMethodIcon = (method: 'phone' | 'email' | 'both') => {
    switch (method) {
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'both': return (
        <div className="flex gap-1">
          <Phone className="h-3 w-3" />
          <Mail className="h-3 w-3" />
        </div>
      );
    }
  };

  const formatLastContact = (lastContact: string | undefined) => {
    if (!lastContact) return 'Never contacted';
    const date = new Date(lastContact);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const handleContactClient = async (clientId: string, method: 'phone' | 'email') => {
    // Update last_contact timestamp
    try {
      await supabase
        .from('clients')
        .update({ last_contact: new Date().toISOString() })
        .eq('id', clientId);
      
      // Refresh the list
      fetchContactNeededClients();
    } catch (error) {
      console.error('Error updating contact timestamp:', error);
    }
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
              <Phone className="h-6 w-6 text-blue-500" />
              Contact Needed
            </h1>
            <p className="text-muted-foreground">
              Clients requiring immediate or scheduled contact
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Total Needed</p>
                      <p className="text-2xl font-bold">{stats.totalNeedingContact}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">Urgent</p>
                      <p className="text-2xl font-bold">{stats.urgent}</p>
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
                      <p className="text-2xl font-bold">{stats.high}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium">Medium Priority</p>
                      <p className="text-2xl font-bold">{stats.medium}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">Avg Days</p>
                      <p className="text-2xl font-bold">{stats.avgDaysSinceContact}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {clients.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                    <p className="text-muted-foreground">
                      No clients currently need immediate contact.
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
                        <div className="flex flex-col gap-2 items-end">
                          <Badge className={getPriorityColor(client.priority)}>
                            <div className="flex items-center gap-1">
                              {getPriorityIcon(client.priority)}
                              {client.priority.toUpperCase()}
                            </div>
                          </Badge>
                          {client.subscription_status && (
                            <Badge variant="outline" className="text-xs">
                              {client.subscription_status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Last Contact:</span>
                          </div>
                          <p className="text-sm text-muted-foreground ml-6">
                            {formatLastContact(client.last_contact)}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Reason:</span>
                          </div>
                          <p className="text-sm text-muted-foreground ml-6">
                            {client.reason}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            {getContactMethodIcon(client.contact_method!)}
                            <span className="font-medium">Suggested Method:</span>
                          </div>
                          <p className="text-sm text-muted-foreground ml-6">
                            {client.contact_method === 'both' ? 'Phone & Email' : 
                             client.contact_method === 'phone' ? 'Phone Call' : 'Email'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {(client.contact_method === 'phone' || client.contact_method === 'both') && client.phone && (
                          <Button 
                            size="sm" 
                            className="flex items-center gap-2"
                            onClick={() => handleContactClient(client.id, 'phone')}
                          >
                            <Phone className="h-4 w-4" />
                            Call Now
                          </Button>
                        )}
                        {(client.contact_method === 'email' || client.contact_method === 'both') && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex items-center gap-2"
                            onClick={() => handleContactClient(client.id, 'email')}
                          >
                            <Mail className="h-4 w-4" />
                            Send Email
                          </Button>
                        )}
                        <Button size="sm" variant="ghost">
                          View Details
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