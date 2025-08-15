import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, Employee } from '@/types/crm';

// Filter state interface
interface FilterState {
  searchTerm: string;
  priorityFilter: string;
  assignedFilter: string;
  subscriptionFilter: string;
  usingPlatformFilter: string;
}

// Theme state interface
interface ThemeState {
  theme: 'light' | 'dark';
  density: 'compact' | 'expanded';
}

// User preferences interface
interface UserPreferences {
  defaultView: string;
  autoRefresh: boolean;
  refreshInterval: number;
  showTooltips: boolean;
  compactMode: boolean;
}

// Filter preset interface
interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Main app state interface
interface AppState {
  // Data
  users: User[];
  employees: Employee[];
  isLoading: boolean;
  lastUpdated: string | null;
  
  // Filters
  filters: FilterState;
  filterPresets: FilterPreset[];
  activePresetId: string | null;
  
  // Theme and UI
  theme: ThemeState;
  preferences: UserPreferences;
  
  // UI State
  showUserForm: boolean;
  editingUser: User | null;
  showPaymentAnalytics: boolean;
  showMRR: boolean;
  
  // Actions
  setUsers: (users: User[]) => void;
  setEmployees: (employees: Employee[]) => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  
  // Filter actions
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  saveFilterPreset: (name: string, filters: FilterState) => void;
  loadFilterPreset: (presetId: string) => void;
  deleteFilterPreset: (presetId: string) => void;
  
  // Theme actions
  setTheme: (theme: 'light' | 'dark') => void;
  setDensity: (density: 'compact' | 'expanded') => void;
  
  // Preferences actions
  setPreferences: (preferences: Partial<UserPreferences>) => void;
  
  // UI actions
  setShowUserForm: (show: boolean) => void;
  setEditingUser: (user: User | null) => void;
  setShowPaymentAnalytics: (show: boolean) => void;
  setShowMRR: (show: boolean) => void;
  
  // Utility actions
  setLoading: (loading: boolean) => void;
  refreshData: () => Promise<void>;
}

// Default values
const defaultFilters: FilterState = {
  searchTerm: '',
  priorityFilter: 'all',
  assignedFilter: 'all',
  subscriptionFilter: 'all',
  usingPlatformFilter: 'all'
};

const defaultTheme: ThemeState = {
  theme: 'light',
  density: 'expanded'
};

const defaultPreferences: UserPreferences = {
  defaultView: 'dashboard',
  autoRefresh: false,
  refreshInterval: 30000, // 30 seconds
  showTooltips: true,
  compactMode: false
};

const defaultPresets: FilterPreset[] = [
  {
    id: 'high-priority',
    name: 'High Priority Users',
    filters: { ...defaultFilters, priorityFilter: 'high' },
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'active-users',
    name: 'Active Platform Users',
    filters: { ...defaultFilters, usingPlatformFilter: 'yes' },
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'paying-customers',
    name: 'Paying Customers',
    filters: { ...defaultFilters, subscriptionFilter: 'active' },
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Create the store
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      users: [],
      employees: [],
      isLoading: false,
      lastUpdated: null,
      
      filters: defaultFilters,
      filterPresets: defaultPresets,
      activePresetId: null,
      
      theme: defaultTheme,
      preferences: defaultPreferences,
      
      showUserForm: false,
      editingUser: null,
      showPaymentAnalytics: false,
      showMRR: false,
      
      // Data actions
      setUsers: (users) => set({ users, lastUpdated: new Date().toISOString() }),
      
      setEmployees: (employees) => set({ employees }),
      
      addUser: (user) => set((state) => ({ 
        users: [...state.users, user],
        lastUpdated: new Date().toISOString()
      })),
      
      updateUser: (updatedUser) => set((state) => ({
        users: state.users.map(user => 
          user.id === updatedUser.id ? updatedUser : user
        ),
        lastUpdated: new Date().toISOString()
      })),
      
      deleteUser: (userId) => set((state) => ({
        users: state.users.filter(user => user.id !== userId),
        lastUpdated: new Date().toISOString()
      })),
      
      // Filter actions
      setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters },
        activePresetId: null // Clear active preset when manually changing filters
      })),
      
      resetFilters: () => set({ 
        filters: defaultFilters,
        activePresetId: null
      }),
      
      saveFilterPreset: (name, filters) => {
        const newPreset: FilterPreset = {
          id: `preset-${Date.now()}`,
          name,
          filters,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        set((state) => ({
          filterPresets: [...state.filterPresets, newPreset]
        }));
      },
      
      loadFilterPreset: (presetId) => {
        const preset = get().filterPresets.find(p => p.id === presetId);
        if (preset) {
          set({ 
            filters: preset.filters,
            activePresetId: presetId
          });
        }
      },
      
      deleteFilterPreset: (presetId) => set((state) => ({
        filterPresets: state.filterPresets.filter(p => p.id !== presetId && !p.isDefault),
        activePresetId: state.activePresetId === presetId ? null : state.activePresetId
      })),
      
      // Theme actions
      setTheme: (theme) => set((state) => ({
        theme: { ...state.theme, theme }
      })),
      
      setDensity: (density) => set((state) => ({
        theme: { ...state.theme, density },
        preferences: { ...state.preferences, compactMode: density === 'compact' }
      })),
      
      // Preferences actions
      setPreferences: (newPreferences) => set((state) => ({
        preferences: { ...state.preferences, ...newPreferences }
      })),
      
      // UI actions
      setShowUserForm: (show) => set({ showUserForm: show }),
      
      setEditingUser: (user) => set({ 
        editingUser: user,
        showUserForm: !!user
      }),
      
      setShowPaymentAnalytics: (show) => set({ showPaymentAnalytics: show }),
      
      setShowMRR: (show) => set({ showMRR: show }),
      
      // Utility actions
      setLoading: (loading) => set({ isLoading: loading }),
      
      refreshData: async () => {
        // This would typically fetch data from an API
        // For now, we'll just update the timestamp
        set({ lastUpdated: new Date().toISOString() });
      }
    }),
    {
      name: 'app-store', // Storage key
      storage: createJSONStorage(() => localStorage),
      // Only persist certain parts of the state
      partialize: (state) => ({
        filterPresets: state.filterPresets.filter(p => !p.isDefault), // Don't persist default presets
        theme: state.theme,
        preferences: state.preferences,
        activePresetId: state.activePresetId
      })
    }
  )
);

// Selector hooks for better performance
export const useUsers = () => useAppStore((state) => state.users);
export const useEmployees = () => useAppStore((state) => state.employees);
export const useFilters = () => useAppStore((state) => state.filters);
export const useFilterPresets = () => useAppStore((state) => state.filterPresets);
export const useTheme = () => useAppStore((state) => state.theme);
export const usePreferences = () => useAppStore((state) => state.preferences);
export const useUIState = () => {
  const showUserForm = useAppStore((state) => state.showUserForm);
  const editingUser = useAppStore((state) => state.editingUser);
  const showPaymentAnalytics = useAppStore((state) => state.showPaymentAnalytics);
  const showMRR = useAppStore((state) => state.showMRR);
  const isLoading = useAppStore((state) => state.isLoading);
  
  return React.useMemo(() => ({
    showUserForm,
    editingUser,
    showPaymentAnalytics,
    showMRR,
    isLoading
  }), [showUserForm, editingUser, showPaymentAnalytics, showMRR, isLoading]);
};

// Computed selectors with proper memoization
export const useFilteredUsers = () => {
  const users = useAppStore((state) => state.users);
  const filters = useAppStore((state) => state.filters);
  
  return React.useMemo(() => {
    return users.filter(user => {
      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch = 
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          (user.phone && user.phone.includes(filters.searchTerm)) ||
          (user.company && user.company.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }
      
      // Priority filter
      if (filters.priorityFilter !== 'all') {
        if (filters.priorityFilter === 'high' && user.priority !== 'high') return false;
        if (filters.priorityFilter === 'normal' && user.priority === 'high') return false;
      }
      
      // Assigned filter
      if (filters.assignedFilter !== 'all') {
        if (!user.assignedTo || user.assignedTo !== filters.assignedFilter) return false;
      }
      
      // Subscription filter
      if (filters.subscriptionFilter !== 'all') {
        if (filters.subscriptionFilter === 'no_subscription' && user.subscriptionStatus) return false;
        if (filters.subscriptionFilter !== 'no_subscription' && user.subscriptionStatus !== filters.subscriptionFilter) return false;
      }
      
      // Platform usage filter
      if (filters.usingPlatformFilter !== 'all') {
        if (filters.usingPlatformFilter === 'yes' && !user.usingPlatform) return false;
        if (filters.usingPlatformFilter === 'no' && user.usingPlatform) return false;
      }
      
      return true;
    });
  }, [users, filters]);
};

export default useAppStore;