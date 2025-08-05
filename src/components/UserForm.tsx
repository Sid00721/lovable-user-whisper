import { useState, useEffect } from "react";
import { User, Employee } from "@/types/crm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
  onSave: (user: Partial<User>) => void;
  employees: Employee[];
}

export function UserForm({ open, onOpenChange, user, onSave, employees }: UserFormProps) {
  const [formData, setFormData] = useState<Partial<User>>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    company: user?.company || '',
    priority: user?.priority || 'normal',
    usingPlatform: user?.usingPlatform || false,
    assignedTo: user?.assignedTo || '',
    referredBy: user?.referredBy || '',
    lastContact: user?.lastContact || '',
    notes: user?.notes || '',
    commissionApproved: user?.commissionApproved || false,
    isUpsellOpportunity: user?.isUpsellOpportunity || false,
    stripeCustomerId: user?.stripeCustomerId || '',
    subscriptionStatus: user?.subscriptionStatus || '',
    subscriptionProduct: user?.subscriptionProduct || '',
    subscriptionPlan: user?.subscriptionPlan || '',
    lastPaymentDate: user?.lastPaymentDate || '',
  });

  // Update form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        company: user.company || '',
        priority: user.priority || 'normal',
        usingPlatform: user.usingPlatform || false,
        assignedTo: user.assignedTo || '',
        referredBy: user.referredBy || '',
        lastContact: user.lastContact || '',
        notes: user.notes || '',
        commissionApproved: user.commissionApproved || false,
        isUpsellOpportunity: user.isUpsellOpportunity || false,
        stripeCustomerId: user.stripeCustomerId || '',
        subscriptionStatus: user.subscriptionStatus || '',
        subscriptionProduct: user.subscriptionProduct || '',
        subscriptionPlan: user.subscriptionPlan || '',
        lastPaymentDate: user.lastPaymentDate || '',
      });
    } else {
      // Reset form for new user
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        priority: 'normal',
        usingPlatform: false,
        assignedTo: '',
        referredBy: '',
        lastContact: '',
        notes: '',
        commissionApproved: false,
        isUpsellOpportunity: false,
        stripeCustomerId: '',
        subscriptionStatus: '',
        subscriptionProduct: '',
        subscriptionPlan: '',
        lastPaymentDate: '',
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  const isEditing = !!user;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
        <DialogHeader className="space-y-2 pb-4">
          <DialogTitle className="text-xl font-semibold">
            {isEditing ? 'Edit User' : 'Add New User'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm font-medium">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: 'high' | 'normal') => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">🔥 High Priority</SelectItem>
                <SelectItem value="normal">⭐ Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assigned To</Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.name}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="referredBy" className="text-sm font-medium text-muted-foreground">Referred By</Label>
              <Input
                id="referredBy"
                value={formData.referredBy}
                onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
                className="border-0 bg-background/50 shadow-sm focus:bg-background/80"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastContact" className="text-sm font-medium">Last Contact Date</Label>
            <Input
              id="lastContact"
              type="date"
              value={formData.lastContact}
              onChange={(e) => setFormData({ ...formData, lastContact: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g., WhatsApped July 21, booked call"
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Platform Usage</Label>
                <p className="text-xs text-muted-foreground">Is this user actively using the platform?</p>
              </div>
              <Switch
                checked={formData.usingPlatform}
                onCheckedChange={(checked) => setFormData({ ...formData, usingPlatform: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Commission Approved</Label>
                <p className="text-xs text-muted-foreground">Has commission been approved for this user?</p>
              </div>
              <Switch
                checked={formData.commissionApproved}
                onCheckedChange={(checked) => setFormData({ ...formData, commissionApproved: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Upsell Opportunity</Label>
                <p className="text-xs text-muted-foreground">Mark this client as an upsell opportunity.</p>
              </div>
              <Switch
                checked={formData.isUpsellOpportunity}
                onCheckedChange={(checked) => setFormData({ ...formData, isUpsellOpportunity: checked })}
              />
            </div>
          </div>

          {/* Subscription Information Section */}
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Subscription Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stripeCustomerId" className="text-sm font-medium">Stripe Customer ID</Label>
                  <Input
                    id="stripeCustomerId"
                    value={formData.stripeCustomerId}
                    onChange={(e) => setFormData({ ...formData, stripeCustomerId: e.target.value })}
                    placeholder="cus_..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subscriptionStatus" className="text-sm font-medium">Subscription Status</Label>
                  <Select
                    value={formData.subscriptionStatus}
                    onValueChange={(value) => setFormData({ ...formData, subscriptionStatus: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Subscription</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trialing">Trialing</SelectItem>
                      <SelectItem value="past_due">Past Due</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                      <SelectItem value="incomplete">Incomplete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subscriptionProduct" className="text-sm font-medium">Product</Label>
                  <Input
                    id="subscriptionProduct"
                    value={formData.subscriptionProduct}
                    onChange={(e) => setFormData({ ...formData, subscriptionProduct: e.target.value })}
                    placeholder="Product name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subscriptionPlan" className="text-sm font-medium">Plan</Label>
                  <Input
                    id="subscriptionPlan"
                    value={formData.subscriptionPlan}
                    onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
                    placeholder="Plan name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastPaymentDate" className="text-sm font-medium">Last Payment Date</Label>
                  <Input
                    id="lastPaymentDate"
                    type="date"
                    value={formData.lastPaymentDate}
                    onChange={(e) => setFormData({ ...formData, lastPaymentDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              {isEditing ? 'Update User' : 'Add User'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}