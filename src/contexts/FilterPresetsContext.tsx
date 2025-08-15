import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: {
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
  createdAt: Date;
  isDefault?: boolean;
}

interface FilterPresetsContextType {
  presets: FilterPreset[];
  activePreset: FilterPreset | null;
  savePreset: (name: string, description: string, filters: FilterPreset['filters']) => void;
  loadPreset: (preset: FilterPreset) => void;
  deletePreset: (presetId: string) => void;
  updatePreset: (presetId: string, updates: Partial<FilterPreset>) => void;
  setAsDefault: (presetId: string) => void;
  clearActivePreset: () => void;
}

const FilterPresetsContext = createContext<FilterPresetsContextType | undefined>(undefined);

const STORAGE_KEY = 'filter-presets';
const ACTIVE_PRESET_KEY = 'active-filter-preset';

// Default presets
const defaultPresets: FilterPreset[] = [
  {
    id: 'high-priority',
    name: 'High Priority Users',
    description: 'Users marked as high priority',
    filters: {
      priorityFilter: 'high'
    },
    createdAt: new Date(),
    isDefault: true
  },
  {
    id: 'active-subscribers',
    name: 'Active Subscribers',
    description: 'Users with active subscriptions',
    filters: {
      subscriptionFilter: 'active'
    },
    createdAt: new Date(),
    isDefault: true
  },
  {
    id: 'platform-users',
    name: 'Platform Users',
    description: 'Users actively using the platform',
    filters: {
      usingPlatformFilter: 'yes'
    },
    createdAt: new Date(),
    isDefault: true
  },
  {
    id: 'unassigned-users',
    name: 'Unassigned Users',
    description: 'Users not assigned to any team member',
    filters: {
      assignedFilter: 'unassigned'
    },
    createdAt: new Date(),
    isDefault: true
  }
];

export function FilterPresetsProvider({ children }: { children: ReactNode }) {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [activePreset, setActivePreset] = useState<FilterPreset | null>(null);

  // Load presets from localStorage on mount
  useEffect(() => {
    const savedPresets = localStorage.getItem(STORAGE_KEY);
    const savedActivePreset = localStorage.getItem(ACTIVE_PRESET_KEY);
    
    if (savedPresets) {
      try {
        const parsedPresets = JSON.parse(savedPresets);
        // Merge with default presets, ensuring defaults are always present
        const mergedPresets = [...defaultPresets];
        
        parsedPresets.forEach((preset: FilterPreset) => {
          if (!preset.isDefault) {
            mergedPresets.push({
              ...preset,
              createdAt: new Date(preset.createdAt)
            });
          }
        });
        
        setPresets(mergedPresets);
      } catch (error) {
        console.error('Failed to parse saved presets:', error);
        setPresets(defaultPresets);
      }
    } else {
      setPresets(defaultPresets);
    }

    if (savedActivePreset) {
      try {
        const parsedActivePreset = JSON.parse(savedActivePreset);
        setActivePreset({
          ...parsedActivePreset,
          createdAt: new Date(parsedActivePreset.createdAt)
        });
      } catch (error) {
        console.error('Failed to parse active preset:', error);
      }
    }
  }, []);

  // Save presets to localStorage whenever they change
  useEffect(() => {
    if (presets.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    }
  }, [presets]);

  // Save active preset to localStorage whenever it changes
  useEffect(() => {
    if (activePreset) {
      localStorage.setItem(ACTIVE_PRESET_KEY, JSON.stringify(activePreset));
    } else {
      localStorage.removeItem(ACTIVE_PRESET_KEY);
    }
  }, [activePreset]);

  const savePreset = (name: string, description: string, filters: FilterPreset['filters']) => {
    const newPreset: FilterPreset = {
      id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      filters,
      createdAt: new Date(),
      isDefault: false
    };

    setPresets(prev => [...prev, newPreset]);
  };

  const loadPreset = (preset: FilterPreset) => {
    setActivePreset(preset);
  };

  const deletePreset = (presetId: string) => {
    setPresets(prev => prev.filter(preset => preset.id !== presetId && !preset.isDefault));
    
    if (activePreset?.id === presetId) {
      setActivePreset(null);
    }
  };

  const updatePreset = (presetId: string, updates: Partial<FilterPreset>) => {
    setPresets(prev => prev.map(preset => 
      preset.id === presetId && !preset.isDefault
        ? { ...preset, ...updates }
        : preset
    ));

    if (activePreset?.id === presetId) {
      setActivePreset(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const setAsDefault = (presetId: string) => {
    // For now, we'll just load the preset as active
    // In a real app, this might set user preferences
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      loadPreset(preset);
    }
  };

  const clearActivePreset = () => {
    setActivePreset(null);
  };

  const value: FilterPresetsContextType = {
    presets,
    activePreset,
    savePreset,
    loadPreset,
    deletePreset,
    updatePreset,
    setAsDefault,
    clearActivePreset
  };

  return (
    <FilterPresetsContext.Provider value={value}>
      {children}
    </FilterPresetsContext.Provider>
  );
}

export function useFilterPresets() {
  const context = useContext(FilterPresetsContext);
  if (context === undefined) {
    throw new Error('useFilterPresets must be used within a FilterPresetsProvider');
  }
  return context;
}

export type { FilterPreset };