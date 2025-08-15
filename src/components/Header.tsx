import { Button } from "@/components/ui/button";
import { LogOut, BarChart3, Users, Brain, Search } from "lucide-react";
import { SearchModal } from "./SearchModal";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import ViewDensityToggle from "./ViewDensityToggle";

interface HeaderProps {
  onLogout: () => void;
  showAnalyticsButton?: boolean;
}

export function Header({ onLogout, showAnalyticsButton }: HeaderProps) {
  const { isSearchOpen, openSearch, closeSearch } = useGlobalSearch();
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
            <Button 
              variant="outline"
              onClick={openSearch}
              className="shadow-[0_2px_6px_rgba(0,0,0,0.06)] min-w-[200px] justify-start text-muted-foreground"
            >
              <Search className="h-4 w-4 mr-2" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
            
            <ViewDensityToggle />
            <ThemeToggle />
            
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
      
      <SearchModal isOpen={isSearchOpen} onClose={closeSearch} />
    </header>
  );
}