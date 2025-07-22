import { User } from "@/types/crm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Mail, Phone, MessageSquare, ExternalLink } from "lucide-react";

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

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{user.name}</h3>
          <p className="text-muted-foreground">{user.email}</p>
          {user.phone && (
            <p className="text-sm text-muted-foreground">{user.phone}</p>
          )}
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
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Assigned To:</span>
          <span className="text-sm font-medium">{user.assignedTo}</span>
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

      <div className="flex gap-2 flex-wrap">
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
          onClick={() => window.open(`mailto:${user.email}`, '_blank')}
        >
          <Mail className="h-4 w-4 mr-1" />
          Email
        </Button>
        {user.phone && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`tel:${user.phone}`, '_blank')}
          >
            <Phone className="h-4 w-4 mr-1" />
            Call
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const phone = user.phone ? user.phone.replace(/[^0-9+]/g, '') : '';
            const message = encodeURIComponent(`Hi ${user.name}, this is from Voqo team. We noticed you signed up for our platform. How can we help you get started?`);
            const whatsappUrl = phone 
              ? `https://wa.me/${phone}?text=${message}`
              : `https://wa.me/?text=${message}`;
            window.open(whatsappUrl, '_blank');
          }}
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          WhatsApp
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const domain = user.email.split('@')[1];
            const linkedinUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(user.name + ' ' + (user.company || domain))}`;
            window.open(linkedinUrl, '_blank');
          }}
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          LinkedIn
        </Button>
      </div>
    </Card>
  );
}