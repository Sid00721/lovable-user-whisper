import { Affiliate } from "@/types/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, DollarSign } from "lucide-react";

interface AffiliateTrackerProps {
  affiliates: Affiliate[];
  onMarkPaid: (id: string) => void;
}

export function AffiliateTracker({ affiliates, onMarkPaid }: AffiliateTrackerProps) {
  const totalPending = affiliates
    .filter(a => a.status === 'approved' && !a.paid)
    .reduce((sum, a) => sum + a.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Affiliate Tracker
          {totalPending > 0 && (
            <Badge variant="secondary">
              ${totalPending} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {affiliates.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No affiliate referrals yet</p>
        ) : (
          <div className="space-y-3">
            {affiliates.map((affiliate) => (
              <div key={affiliate.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{affiliate.referredBy}</div>
                  <div className="text-sm text-muted-foreground">
                    Referred: {affiliate.referredUser}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge variant={affiliate.status === 'approved' ? 'default' : 'secondary'}>
                    {affiliate.status}
                  </Badge>
                  
                  <div className="text-right">
                    <div className="font-medium">${affiliate.amount}</div>
                    {affiliate.paid ? (
                      <Badge variant="outline" className="text-success">
                        <Check className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                    ) : affiliate.status === 'approved' ? (
                      <Button
                        size="sm"
                        onClick={() => onMarkPaid(affiliate.id)}
                        className="mt-1"
                      >
                        Mark Paid
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">Pending approval</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}