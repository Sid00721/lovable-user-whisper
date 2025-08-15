import { Button } from "@/components/ui/button";
import { LogOut, BarChart3, Users, Brain } from "lucide-react";

import { Link } from "react-router-dom";

interface HeaderProps {
  onLogout: () => void;
  showAnalyticsButton?: boolean;
}

export function Header({ onLogout, showAnalyticsButton }: HeaderProps) {
  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8">
              <img 
                src="/voqo_logo_transparent_hr.png" 
                alt="Voqo Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">
                Voqo AI Internal
              </h1>
            </div>
          </Link>
          
          <div className="flex items-center space-x-4">
            {showAnalyticsButton && (
              <>
                <Link to="/analytics">
                  <Button 
                    variant="outline"
                    className="shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    User Analytics
                  </Button>
                </Link>
                <Link to="/payments">
                  <Button 
                    variant="outline"
                    className="shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Payment Analytics
                  </Button>
                </Link>
                <Link to="/cowboy">
                  <Button 
                    variant="outline"
                    className="shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Voqo AI Prompt
                  </Button>
                </Link>
              </>
            )}
            <Button 
              variant="outline" 
              onClick={onLogout}
              className="shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}