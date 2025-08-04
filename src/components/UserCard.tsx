import { User } from "@/types/crm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Mail, Phone, MessageSquare, UserPlus, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  const priorityBadge = user.priority === 'high' ? (
    <Badge className="bg-high-priority text-high-priority-foreground">🔥 High Priority</Badge>
  ) : (
    <Badge variant="secondary">⭐ Normal</Badge>
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
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
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{user.name}</h3>
          <p className="text-muted-foreground">{user.email}</p>
          {user.company && (
            <p className="text-sm text-muted-foreground">{user.company}</p>
          )}
        </div>
        {priorityBadge}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Using Platform:</span>
          <Badge variant={user.usingPlatform ? "default" : "secondary"}>
            {user.usingPlatform ? "Yes" : "No"}
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Assigned To:</span>
            {!user.assignedTo && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This user is not assigned to any team member</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {user.assignedTo ? (
            <span className="text-sm font-medium">{user.assignedTo}</span>
          ) : (
            <Button variant="outline" size="sm" onClick={() => onEdit(user)} className="bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center gap-2">
              <UserPlus className="h-4 w-4 mr-1" />
              Assign
            </Button>
          )}
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Last Contact:</span>
          <span className="text-sm">{formatDate(user.lastContact)}</span>
        </div>
        {user.referredBy && (
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Referred By:</span>
            <span className="text-sm font-medium">{user.referredBy}</span>
          </div>
        )}
      </div>

      {user.notes && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1">Notes:</p>
          <p className="text-sm bg-muted p-2 rounded">{user.notes}</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(user)}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleEmailClick}
        >
          <Mail className="h-4 w-4 mr-1" />
          Email
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleWhatsAppClick}
          disabled={!user.phone}
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          WhatsApp
        </Button>
      </div>
    </Card>
  );
}