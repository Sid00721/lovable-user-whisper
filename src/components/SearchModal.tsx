import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SearchBar } from './SearchBar';
import { Command } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 border-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.24)] ring-1 ring-gray-200/60 dark:ring-gray-700/60">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground/80">
              <Command className="h-4 w-4" />
              <span>Search</span>
            </div>
          </div>
          <SearchBar onClose={onClose} className="w-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchModal;