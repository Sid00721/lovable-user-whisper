import React, { useState } from 'react';
import { useFilterPresets, FilterPreset } from '@/contexts/FilterPresetsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Save, Filter, MoreVertical, Trash2, Star, StarOff, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FilterPresetsManagerProps {
  currentFilters: {
    searchTerm?: string;
    priorityFilter?: string;
    assignedFilter?: string;
    subscriptionFilter?: string;
    usingPlatformFilter?: string;
    dateRange?: {
      from: Date | undefined;
      to: Date | undefined;
    };
  };
  onFiltersChange: (filters: any) => void;
}

export function FilterPresetsManager({ currentFilters, onFiltersChange }: FilterPresetsManagerProps) {
  const { presets, activePreset, savePreset, loadPreset, deletePreset, updatePreset, clearActivePreset } = useFilterPresets();
  const { toast } = useToast();
  
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<FilterPreset | null>(null);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  const hasActiveFilters = () => {
    return Object.values(currentFilters).some(value => {
      if (value === null || value === undefined || value === '' || value === 'all') return false;
      if (typeof value === 'object' && 'from' in value && 'to' in value) {
        return value.from !== undefined || value.to !== undefined;
      }
      return true;
    });
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the preset.",
        variant: "destructive"
      });
      return;
    }

    if (!hasActiveFilters()) {
      toast({
        title: "Error",
        description: "Please apply some filters before saving a preset.",
        variant: "destructive"
      });
      return;
    }

    savePreset(presetName.trim(), presetDescription.trim(), currentFilters);
    
    toast({
      title: "Success",
      description: `Filter preset "${presetName}" has been saved.`
    });

    setPresetName('');
    setPresetDescription('');
    setShowSaveDialog(false);
  };

  const handleLoadPreset = (preset: FilterPreset) => {
    loadPreset(preset);
    onFiltersChange(preset.filters);
    
    toast({
      title: "Preset Loaded",
      description: `Applied filter preset "${preset.name}".`
    });
  };

  const handleDeletePreset = () => {
    if (presetToDelete && !presetToDelete.isDefault) {
      deletePreset(presetToDelete.id);
      
      toast({
        title: "Preset Deleted",
        description: `Filter preset "${presetToDelete.name}" has been deleted.`
      });
    }
    
    setPresetToDelete(null);
    setShowDeleteDialog(false);
  };

  const handleClearFilters = () => {
    clearActivePreset();
    onFiltersChange({
      searchTerm: '',
      priorityFilter: 'all',
      assignedFilter: 'all',
      subscriptionFilter: 'all',
      usingPlatformFilter: 'all'
    });
    
    toast({
      title: "Filters Cleared",
      description: "All filters have been reset."
    });
  };

  const formatFilterSummary = (filters: FilterPreset['filters']) => {
    const summary = [];
    
    if (filters.searchTerm) summary.push(`Search: "${filters.searchTerm}"`);
    if (filters.priorityFilter && filters.priorityFilter !== 'all') summary.push(`Priority: ${filters.priorityFilter}`);
    if (filters.assignedFilter && filters.assignedFilter !== 'all') summary.push(`Assigned: ${filters.assignedFilter}`);
    if (filters.subscriptionFilter && filters.subscriptionFilter !== 'all') summary.push(`Subscription: ${filters.subscriptionFilter}`);
    if (filters.usingPlatformFilter && filters.usingPlatformFilter !== 'all') summary.push(`Platform: ${filters.usingPlatformFilter}`);
    
    return summary.length > 0 ? summary.join(', ') : 'No filters applied';
  };

  return (
    <div className="space-y-4">
      {/* Active Preset Display */}
      {activePreset && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <span className="font-medium text-primary">{activePreset.name}</span>
                  {activePreset.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                </div>
                {activePreset.description && (
                  <p className="text-sm text-muted-foreground mt-1">{activePreset.description}</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preset Actions */}
      <div className="flex gap-2">
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={!hasActiveFilters()}>
              <Save className="h-4 w-4 mr-2" />
              Save Current Filters
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Filter Preset</DialogTitle>
              <DialogDescription>
                Save your current filter combination as a preset for quick access later.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Preset Name</label>
                <Input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="e.g., High Priority Active Users"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  placeholder="Brief description of this filter combination..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Current Filters:</p>
                <p className="text-sm text-muted-foreground">{formatFilterSummary(currentFilters)}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePreset}>
                Save Preset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Load Preset
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            {presets.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No saved presets
              </div>
            ) : (
              presets.map((preset) => (
                <div key={preset.id}>
                  <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-sm">
                    <div className="flex-1 cursor-pointer" onClick={() => handleLoadPreset(preset)}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{preset.name}</span>
                        {preset.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                        {activePreset?.id === preset.id && <Badge variant="default" className="text-xs">Active</Badge>}
                      </div>
                      {preset.description && (
                        <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{formatFilterSummary(preset.filters)}</p>
                    </div>
                    {!preset.isDefault && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setPresetToDelete(preset);
                              setShowDeleteDialog(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  {preset !== presets[presets.length - 1] && <DropdownMenuSeparator />}
                </div>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Filter Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the preset "{presetToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePreset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}