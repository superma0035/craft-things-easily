import React from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Clock } from 'lucide-react';

interface MobileMenuHeaderProps {
  restaurant: { name: string } | undefined;
  tableNumber: string | undefined;
  cartTotal: number;
  cartItemCount: number;
  onCartClick: () => void;
  sessionTimeLeft: number;
  customerName?: string;
}

const MobileMenuHeader = ({ 
  restaurant, 
  tableNumber, 
  cartTotal, 
  cartItemCount, 
  onCartClick, 
  sessionTimeLeft,
  customerName 
}: MobileMenuHeaderProps) => {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isLowTime = sessionTimeLeft < 300;

  return (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-orange-100">
      {/* Main Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Restaurant Info - Compact */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {restaurant?.name?.charAt(0) || 'R'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {restaurant?.name || 'Restaurant'}
              </h1>
              <p className="text-xs text-gray-600">
                Table {tableNumber} {customerName && `• ${customerName}`}
              </p>
            </div>
          </div>
          
          {/* Cart Button - Compact */}
          <Button
            onClick={onCartClick}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white relative px-3 py-2 h-auto"
            size="sm"
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">₹{cartTotal.toFixed(0)}</span>
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartItemCount > 9 ? '9+' : cartItemCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Session Timer - Compact */}
      <div className={`px-4 py-2 text-center border-t ${
        isLowTime ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center justify-center space-x-2">
          <Clock className={`w-3 h-3 ${isLowTime ? 'text-red-500' : 'text-yellow-600'}`} />
          <p className={`text-xs font-medium ${
            isLowTime ? 'text-red-800' : 'text-yellow-800'
          }`}>
            {formatTime(sessionTimeLeft)} remaining
            {isLowTime && ' - Order soon!'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileMenuHeader;