import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface HeaderProps {
  onLogout: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Internal CRM</h1>
        <p className="text-muted-foreground">Manage your early users and track affiliates</p>
      </div>
      <Button variant="outline" onClick={onLogout} className="flex items-center gap-2">
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </div>
  );
}