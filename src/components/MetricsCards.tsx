import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, CreditCard, DollarSign, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useViewDensity } from "@/contexts/ViewDensityContext";

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  description?: string;
  className?: string;
  tooltip?: string;
  onClick?: () => void;
  isClickable?: boolean;
}

export function MetricCard({ title, value, trend, icon, description, className, tooltip, onClick, isClickable }: MetricCardProps) {
  const { density } = useViewDensity();
  const trendColor = trend && trend > 0 ? "text-green-600" : "text-red-600";
  const TrendIcon = trend && trend > 0 ? TrendingUp : TrendingDown;
  
  const isCompact = density === 'compact';

  const cardContent = (
    <Card 
      className={`hover:shadow-lg transition-all duration-200 ${
        isClickable ? 'cursor-pointer hover:scale-[1.02] hover:shadow-xl' : 'cursor-help'
      } ${className}`}
      onClick={onClick}
    >
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${
        isCompact ? 'pb-1 px-3 pt-3' : 'pb-1 px-4 pt-4'
      }`}>
        <CardTitle className={`font-medium text-muted-foreground ${
          isCompact ? 'text-xs' : 'text-sm'
        }`}>
          {title}
        </CardTitle>
        <div className={`bg-primary/10 rounded-md ${
          isCompact ? 'p-1' : 'p-1.5'
        }`}>
          {React.cloneElement(icon as React.ReactElement, {
            className: `text-primary ${isCompact ? 'h-4 w-4' : 'h-5 w-5'}`
          })}
        </div>
      </CardHeader>
      <CardContent className={isCompact ? 'px-3 pb-3' : 'px-4 pb-4'}>
        <div className={`font-bold mb-0.5 ${
          isCompact ? 'text-lg' : 'text-2xl'
        }`}>{value}</div>
        {trend !== undefined && (
          <div className="flex items-center space-x-1 mb-0.5">
            <TrendIcon className={`${trendColor} ${
              isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'
            }`} />
            <span className={`text-xs ${trendColor}`}>
              {Math.abs(trend)}% from last month
            </span>
          </div>
        )}
        {description && !isCompact && (
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
  onMetricClick?: (metricType: string) => void;
}

export function MetricsOverview({
  totalUsers,
  activeSubscriptions,
  monthlyRevenue,
  platformUsers,
  usersTrend,
  subscriptionsTrend,
  revenueTrend,
  platformTrend,
  onMetricClick
}: MetricsOverviewProps) {
  const { density } = useViewDensity();
  const isCompact = density === 'compact';
  
  return (
    <TooltipProvider delayDuration={100}>
      <div className={`grid mb-8 ${
        isCompact 
          ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3' 
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'
      }`}>
      <MetricCard
        title="Total Users"
        value={totalUsers.toLocaleString()}
        trend={usersTrend}
        icon={<Users className="h-5 w-5 text-primary" />}
        description="All registered users"
        tooltip="Total number of users registered in the system, including both active and inactive accounts"
        onClick={() => onMetricClick?.('total-users')}
        isClickable={!!onMetricClick}
      />
      <MetricCard
        title="Active Subscriptions"
        value={activeSubscriptions.toLocaleString()}
        trend={subscriptionsTrend}
        icon={<CreditCard className="h-5 w-5 text-primary" />}
        description="Currently paying customers"
        tooltip="Number of users with active paid subscriptions who are currently being charged"
        onClick={() => onMetricClick?.('active-subscriptions')}
        isClickable={!!onMetricClick}
      />
      <MetricCard
        title="Monthly Revenue"
        value={`$${monthlyRevenue.toLocaleString()}`}
        trend={revenueTrend}
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        description="Recurring monthly revenue"
        tooltip="Total recurring revenue generated per month from all active subscriptions"
        onClick={() => onMetricClick?.('monthly-revenue')}
        isClickable={!!onMetricClick}
      />
      <MetricCard
        title="Platform Users"
        value={platformUsers.toLocaleString()}
        trend={platformTrend}
        icon={<UserCheck className="h-5 w-5 text-primary" />}
        description="Active platform users"
        tooltip="Users with calls in last 30 days - actively using the platform features"
        onClick={() => onMetricClick?.('platform-users')}
        isClickable={!!onMetricClick}
      />
      </div>
    </TooltipProvider>
  );
}