import React, { createContext, useContext, useState, useEffect } from 'react';

type ViewDensity = 'compact' | 'expanded';

interface ViewDensityContextType {
  density: ViewDensity;
  setDensity: (density: ViewDensity) => void;
  toggleDensity: () => void;
}

const ViewDensityContext = createContext<ViewDensityContextType | undefined>(undefined);

export const useViewDensity = () => {
  const context = useContext(ViewDensityContext);
  if (context === undefined) {
    throw new Error('useViewDensity must be used within a ViewDensityProvider');
  }
  return context;
};

interface ViewDensityProviderProps {
  children: React.ReactNode;
}

export const ViewDensityProvider: React.FC<ViewDensityProviderProps> = ({ children }) => {
  const [density, setDensityState] = useState<ViewDensity>('expanded');

  // Load density preference from localStorage on mount
  useEffect(() => {
    const savedDensity = localStorage.getItem('view-density') as ViewDensity;
    if (savedDensity && (savedDensity === 'compact' || savedDensity === 'expanded')) {
      setDensityState(savedDensity);
    }
  }, []);

  // Save density preference to localStorage whenever it changes
  const setDensity = (newDensity: ViewDensity) => {
    setDensityState(newDensity);
    localStorage.setItem('view-density', newDensity);
  };

  const toggleDensity = () => {
    const newDensity = density === 'compact' ? 'expanded' : 'compact';
    setDensity(newDensity);
  };

  const value = {
    density,
    setDensity,
    toggleDensity,
  };

  return (
    <ViewDensityContext.Provider value={value}>
      {children}
    </ViewDensityContext.Provider>
  );
};