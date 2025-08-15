import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, CreditCard, DollarSign, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  description?: string;
  className?: string;
  tooltip?: string;
}

export function MetricCard({ title, value, trend, icon, description, className, tooltip }: MetricCardProps) {
  const trendColor = trend && trend > 0 ? "text-green-600" : "text-red-600";
  const TrendIcon = trend && trend > 0 ? TrendingUp : TrendingDown;

  const cardContent = (
    <Card className={`hover:shadow-lg transition-all duration-200 cursor-help ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="p-1.5 bg-primary/10 rounded-md">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="text-2xl font-bold mb-0.5">{value}</div>
        {trend !== undefined && (
          <div className="flex items-center space-x-1 mb-0.5">
            <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
            <span className={`text-xs ${trendColor}`}>
              {Math.abs(trend)}% from last month
            </span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {cardContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
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
    <TooltipProvider delayDuration={100}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MetricCard
        title="Total Users"
        value={totalUsers.toLocaleString()}
        trend={usersTrend}
        icon={<Users className="h-5 w-5 text-primary" />}
        description="All registered users"
        tooltip="Total number of users registered in the system, including both active and inactive accounts"
      />
      <MetricCard
        title="Active Subscriptions"
        value={activeSubscriptions.toLocaleString()}
        trend={subscriptionsTrend}
        icon={<CreditCard className="h-5 w-5 text-primary" />}
        description="Currently paying customers"
        tooltip="Number of users with active paid subscriptions who are currently being charged"
      />
      <MetricCard
        title="Monthly Revenue"
        value={`$${monthlyRevenue.toLocaleString()}`}
        trend={revenueTrend}
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        description="Recurring monthly revenue"
        tooltip="Total recurring revenue generated per month from all active subscriptions"
      />
      <MetricCard
        title="Platform Users"
        value={platformUsers.toLocaleString()}
        trend={platformTrend}
        icon={<UserCheck className="h-5 w-5 text-primary" />}
        description="Active platform users"
        tooltip="Users with calls in last 30 days - actively using the platform features"
      />
      </div>
    </TooltipProvider>
  );
}