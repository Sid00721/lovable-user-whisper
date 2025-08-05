import { User } from "@/types/crm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Mail, Phone, MessageSquare, UserPlus, HelpCircle, Star, CreditCard, Calendar } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onMarkUpsell: (user: User) => void;
}

export function UserCard({ user, onEdit, onMarkUpsell }: UserCardProps) {
  const priorityBadge = user.priority === 'high' ? (
    <Badge className="bg-high-priority text-high-priority-foreground">🔥 High Priority</Badge>
  ) : (
    <Badge variant="secondary">⭐ Normal</Badge>
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getSubscriptionStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="outline">No Subscription</Badge>;
    
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">✓ Active</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">⚠ Past Due</Badge>;
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800 border-red-200">✗ Canceled</Badge>;
      case 'incomplete':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">⏳ Incomplete</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">🎯 Trial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return null;
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    // Add + if not present and assume US number if no country code
    if (cleaned.length === 10) return `+1${cleaned}`;
    if (cleaned.length > 10 && !cleaned.startsWith('1')) return `+${cleaned}`;
    if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
    return `+${cleaned}`;
  };

  const handleEmailClick = () => {
    const subject = encodeURIComponent('Follow up from our team');
    const body = encodeURIComponent(`Hi ${user.name},\n\nI hope this message finds you well. I wanted to follow up with you regarding your account.\n\nBest regards,\nThe Team`);
    window.open(`mailto:${user.email}?subject=${subject}&body=${body}`);
  };

  const handleWhatsAppClick = () => {
    const formattedPhone = formatPhoneNumber(user.phone);
    if (!formattedPhone) {
      alert('No phone number available for this contact');
      return;
    }
    const message = encodeURIComponent(`Hi ${user.name}, I hope you're doing well! I wanted to reach out to follow up with you.`);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`);
  };

  return (
    <Card className="p-4 shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow duration-200">
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-foreground tracking-tight">{user.name}</h3>
          <p className="text-muted-foreground text-sm">{user.email}</p>
          {user.company && (
            <p className="text-sm text-muted-foreground/80">{user.company}</p>
          )}
        </div>
        {priorityBadge}
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">Using Platform</span>
          <Badge variant={user.usingPlatform ? "default" : "secondary"} className="shadow-sm">
            {user.usingPlatform ? "Yes" : "No"}
          </Badge>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Assigned To</span>
            {!user.assignedTo && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground/60" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This user is not assigned to any team member</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {user.assignedTo && user.assignedTo !== 'unassigned' ? (
            <span className="text-sm font-medium">{user.assignedTo}</span>
          ) : (
            <span className="text-sm text-muted-foreground">Unassigned</span>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">Last Contact</span>
          <span className="text-sm font-medium">{formatDate(user.lastContact)}</span>
        </div>
        {user.referredBy && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Referred By</span>
            <span className="text-sm font-medium">{user.referredBy}</span>
          </div>
        )}
        
        {/* Subscription Information */}
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Subscription</span>
            </div>
            {getSubscriptionStatusBadge(user.subscriptionStatus)}
          </div>
          
          {user.subscriptionProduct && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground ml-6">Product</span>
              <span className="text-sm font-medium">{user.subscriptionProduct}</span>
            </div>
          )}
          
          {user.subscriptionPlan && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground ml-6">Plan</span>
              <span className="text-sm font-medium">{user.subscriptionPlan}</span>
            </div>
          )}
          
          {user.lastPaymentDate && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Last Payment</span>
              </div>
              <span className="text-sm font-medium">{formatDate(user.lastPaymentDate)}</span>
            </div>
          )}
        </div>
      </div>

      {user.notes && (
        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Notes</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{user.notes}</p>
        </div>
      )}
      
      <div className="flex gap-2 mt-4 pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`mailto:${user.email}`)}
          className="flex-1"
        >
          <Mail className="h-4 w-4 mr-2" />
          Email
        </Button>
        {user.phone && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`https://wa.me/${user.phone.replace(/[^0-9]/g, '')}`)}
            className="flex-1"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(user)}
          className="flex-1"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>

      </div>
    </Card>
  );
}