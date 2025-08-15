import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { useViewDensity } from '@/contexts/ViewDensityContext';
import { User } from '@/types/crm';
import { Clock, TrendingUp, Users, Star } from 'lucide-react';

interface RecentActivityProps {
  recentUsers: User[];
  highPriorityUsers: User[];
  activeUsers: User[];
  className?: string;
}

export function RecentActivity({ 
  recentUsers, 
  highPriorityUsers, 
  activeUsers, 
  className 
}: RecentActivityProps) {
  const { density } = useViewDensity();
  const isCompact = density === 'compact';

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  const ActivitySection = ({ 
    title, 
    users, 
    icon, 
    emptyMessage 
  }: { 
    title: string; 
    users: User[]; 
    icon: React.ReactNode; 
    emptyMessage: string;
  }) => (
    <div className={`${isCompact ? 'mb-4' : 'mb-6'}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className={`font-medium ${isCompact ? 'text-sm' : 'text-base'}`}>{title}</h4>
        <Badge variant="secondary" className={isCompact ? 'text-xs' : ''}>
          {users.length}
        </Badge>
      </div>
      
      {users.length === 0 ? (
        <p className={`text-muted-foreground ${isCompact ? 'text-xs' : 'text-sm'} italic`}>
          {emptyMessage}
        </p>
      ) : (
        <div className={`space-y-${isCompact ? '2' : '3'}`}>
          {users.slice(0, isCompact ? 3 : 5).map((user) => (
            <div key={user.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isCompact ? 'text-sm' : 'text-base'}`}>
                  {user.name}
                </p>
                <p className={`text-muted-foreground truncate ${isCompact ? 'text-xs' : 'text-sm'}`}>
                  {user.company || user.email}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-muted-foreground ${isCompact ? 'text-xs' : 'text-sm'}`}>
                  {formatTimeAgo(user.lastContact)}
                </p>
                {user.priority === 'high' && (
                  <Badge className="bg-high-priority text-high-priority-foreground mt-1" size="sm">
                    High Priority
                  </Badge>
                )}
              </div>
            </div>
          ))}
          
          {users.length > (isCompact ? 3 : 5) && (
            <div className="flex items-center gap-3 pt-2">
              <p className={`text-muted-foreground ${isCompact ? 'text-xs' : 'text-sm'}`}>
                +{users.length - (isCompact ? 3 : 5)} more users
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Card className={className}>
      <CardHeader className={isCompact ? 'pb-3' : 'pb-4'}>
        <CardTitle className={`flex items-center gap-2 ${isCompact ? 'text-lg' : 'text-xl'}`}>
          <Clock className={isCompact ? 'h-5 w-5' : 'h-6 w-6'} />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className={isCompact ? 'pt-0' : 'pt-0'}>
        <ActivitySection
          title="Recently Active"
          users={activeUsers}
          icon={<TrendingUp className={`text-green-600 ${isCompact ? 'h-4 w-4' : 'h-5 w-5'}`} />}
          emptyMessage="No recent platform activity"
        />
        
        <ActivitySection
          title="High Priority"
          users={highPriorityUsers}
          icon={<Star className={`text-yellow-600 ${isCompact ? 'h-4 w-4' : 'h-5 w-5'}`} />}
          emptyMessage="No high priority users"
        />
        
        <ActivitySection
          title="Recent Contacts"
          users={recentUsers}
          icon={<Users className={`text-blue-600 ${isCompact ? 'h-4 w-4' : 'h-5 w-5'}`} />}
          emptyMessage="No recent contacts"
        />
      </CardContent>
    </Card>
  );
}

export default RecentActivity;