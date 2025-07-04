import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, Grid } from 'lucide-react';

interface MobileMenuSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  menuItemsCount: number;
}

const MobileMenuSearch = ({ searchTerm, onSearchChange, menuItemsCount }: MobileMenuSearchProps) => {
  return (
    <div className="px-4 py-3 bg-white/50">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search menu items..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-white border-gray-200 focus:border-orange-300 h-10"
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center space-x-1 text-xs text-gray-600">
          <Grid className="w-3 h-3" />
          <span>{menuItemsCount} items available</span>
        </div>
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="text-xs text-orange-600 font-medium"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default MobileMenuSearch;