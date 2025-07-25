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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit User' : 'Add New User'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Priority</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Assigned To</Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.name}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="referredBy">Referred By</Label>
              <Input
                id="referredBy"
                value={formData.referredBy}
                onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="lastContact">Last Contact Date</Label>
            <Input
              id="lastContact"
              type="date"
              value={formData.lastContact}
              onChange={(e) => setFormData({ ...formData, lastContact: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g., WhatsApped July 21, booked call"
            />
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="usingPlatform"
                checked={formData.usingPlatform}
                onCheckedChange={(checked) => setFormData({ ...formData, usingPlatform: checked })}
              />
              <Label htmlFor="usingPlatform">Using Platform?</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="commissionApproved"
                checked={formData.commissionApproved}
                onCheckedChange={(checked) => setFormData({ ...formData, commissionApproved: checked })}
              />
              <Label htmlFor="commissionApproved">Commission Approved</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? 'Update User' : 'Add User'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}