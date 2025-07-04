import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Star, ImageOff } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

interface MobileMenuGridProps {
  popularItems: MenuItem[];
  filteredItems: MenuItem[];
  onAddToCart: (item: MenuItem) => void;
  isLoading: boolean;
  searchTerm: string;
}

const MobileMenuGrid = ({ popularItems, filteredItems, onAddToCart, isLoading, searchTerm }: MobileMenuGridProps) => {
  if (isLoading) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3"></div>
        <p className="text-gray-600 text-sm">Loading menu...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-20">
      {/* Popular Items - Only show if not searching */}
      {popularItems.length > 0 && !searchTerm && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <h2 className="text-lg font-bold text-gray-900">Popular</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {popularItems.slice(0, 2).map((item) => (
              <MobileMenuItemCard key={item.id} item={item} onAddToCart={onAddToCart} isPopular />
            ))}
          </div>
        </div>
      )}

      {/* All Menu Items */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          {searchTerm ? `Results for "${searchTerm}"` : 'Menu'}
        </h2>
        {filteredItems.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="text-center py-8">
              <ImageOff className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                {searchTerm ? 'No matches found' : 'No items available'}
              </h3>
              <p className="text-gray-500 text-xs">
                {searchTerm ? 'Try different keywords' : 'Menu is being updated'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredItems.map((item) => (
              <MobileMenuItemCard key={item.id} item={item} onAddToCart={onAddToCart} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface MobileMenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
  isPopular?: boolean;
}

const MobileMenuItemCard = ({ item, onAddToCart, isPopular = false }: MobileMenuItemCardProps) => {
  const [imageError, setImageError] = React.useState(false);

  return (
    <Card className={`hover:shadow-md transition-shadow ${
      isPopular ? 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50' : 'border-orange-100'
    }`}>
      <CardContent className="p-0">
        <div className="flex">
          {/* Image */}
          <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-l-lg overflow-hidden relative">
            {isPopular && (
              <div className="absolute top-1 left-1 z-10">
                <div className="bg-yellow-500 text-white px-1.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                  <Star className="w-2 h-2 fill-current" />
                </div>
              </div>
            )}
            {item.image_url && !imageError ? (
              <img 
                src={item.image_url} 
                alt={item.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-red-100">
                <ImageOff className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-3 flex flex-col justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-1">{item.name}</h3>
              {item.description && (
                <p className="text-gray-600 text-xs mb-2 line-clamp-1">
                  {item.description}
                </p>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-bold text-orange-600">₹{item.price}</span>
              </div>
              <Button
                onClick={() => onAddToCart(item)}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 h-8 px-3"
                size="sm"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileMenuGrid;