import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useViewDensity } from '@/contexts/ViewDensityContext';

const ViewDensityToggle: React.FC = () => {
  const { density, setDensity } = useViewDensity();

  const getDensityIcon = () => {
    switch (density) {
      case 'compact':
        return <List className="h-4 w-4" />;
      case 'expanded':
        return <LayoutGrid className="h-4 w-4" />;
      default:
        return <LayoutGrid className="h-4 w-4" />;
    }
  };

  const getDensityOptionIcon = (densityOption: string) => {
    switch (densityOption) {
      case 'compact':
        return <List className="h-4 w-4" />;
      case 'expanded':
        return <LayoutGrid className="h-4 w-4" />;
      default:
        return <LayoutGrid className="h-4 w-4" />;
    }
  };

  const getDensityLabel = (densityOption: string) => {
    switch (densityOption) {
      case 'compact':
        return 'Compact';
      case 'expanded':
        return 'Expanded';
      default:
        return 'Expanded';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow"
        >
          {getDensityIcon()}
          <span className="sr-only">Toggle view density</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {['expanded', 'compact'].map((densityOption) => (
          <DropdownMenuItem
            key={densityOption}
            onClick={() => setDensity(densityOption as 'compact' | 'expanded')}
            className={`flex items-center gap-2 cursor-pointer ${
              density === densityOption ? 'bg-accent' : ''
            }`}
          >
            {getDensityOptionIcon(densityOption)}
            <span>{getDensityLabel(densityOption)}</span>
            {density === densityOption && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ViewDensityToggle;