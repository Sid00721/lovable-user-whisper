import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, CreditCard, DollarSign, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  description?: string;
  className?: string;
}

export function MetricCard({ title, value, trend, icon, description, className }: MetricCardProps) {
  const trendColor = trend && trend > 0 ? "text-green-600" : "text-red-600";
  const TrendIcon = trend && trend > 0 ? TrendingUp : TrendingDown;

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="p-2 bg-primary/10 rounded-lg">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-1">{value}</div>
        {trend !== undefined && (
          <div className="flex items-center space-x-1">
            <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            <span className={`text-sm ${trendColor}`}>
              {Math.abs(trend)}% from last month
            </span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricsOverviewProps {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  platformUsers: number;
  usersTrend?: number;
  subscriptionsTrend?: number;
  revenueTrend?: number;
  platformTrend?: number;
}

export function MetricsOverview({
  totalUsers,
  activeSubscriptions,
  monthlyRevenue,
  platformUsers,
  usersTrend,
  subscriptionsTrend,
  revenueTrend,
  platformTrend
}: MetricsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MetricCard
        title="Total Users"
        value={totalUsers.toLocaleString()}
        trend={usersTrend}
        icon={<Users className="h-5 w-5 text-primary" />}
        description="All registered users"
      />
      <MetricCard
        title="Active Subscriptions"
        value={activeSubscriptions.toLocaleString()}
        trend={subscriptionsTrend}
        icon={<CreditCard className="h-5 w-5 text-primary" />}
        description="Currently paying customers"
      />
      <MetricCard
        title="Monthly Revenue"
        value={`$${monthlyRevenue.toLocaleString()}`}
        trend={revenueTrend}
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        description="Recurring monthly revenue"
      />
      <MetricCard
        title="Platform Users"
        value={platformUsers.toLocaleString()}
        trend={platformTrend}
        icon={<UserCheck className="h-5 w-5 text-primary" />}
        description="Active platform users"
      />
    </div>
  );
}