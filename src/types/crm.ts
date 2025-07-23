export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  company?: string;
  priority: 'high' | 'normal';
  usingPlatform: boolean;
  assignedTo: string;
  referredBy?: string;
  lastContact?: string;
  notes: string;
  commissionApproved: boolean;
  createdAt: string;
}

export interface Affiliate {
  id: string;
  referredBy: string;
  referredUser: string;
  status: 'pending' | 'approved';
  amount: number;
  paid: boolean;
}