import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface MobileCartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  cartTotal: number;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onPlaceOrder: () => void;
  onGenerateBill: () => void;
  isPlacingOrder: boolean;
}

const MobileCartModal = ({
  open,
  onOpenChange,
  cart,
  cartTotal,
  onUpdateQuantity,
  onPlaceOrder,
  onGenerateBill,
  isPlacingOrder
}: MobileCartModalProps) => {
  if (cart.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm mx-auto max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Your Cart
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Your cart is empty</p>
            <p className="text-gray-400 text-sm">Add items to get started</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Your Cart ({cart.length} items)
          </DialogTitle>
          <DialogDescription>
            Review your order before placing
          </DialogDescription>
        </DialogHeader>

        {/* Cart Items - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-3 max-h-64">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-gray-900 truncate">
                  {item.name}
                </h4>
                <p className="text-orange-600 font-semibold text-sm">
                  ₹{item.price} each
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  variant="outline"
                  size="sm"
                  className="w-8 h-8 p-0"
                >
                  {item.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                </Button>
                
                <span className="text-sm font-medium w-8 text-center">
                  {item.quantity}
                </span>
                
                <Button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  variant="outline"
                  size="sm"
                  className="w-8 h-8 p-0"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Total */}
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-600">Subtotal:</span>
            <span className="font-semibold">₹{cartTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-gray-900">Total:</span>
            <span className="text-xl font-bold text-orange-600">₹{cartTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            onClick={onPlaceOrder}
            disabled={isPlacingOrder}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 h-12"
          >
            {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
          </Button>
          
          <Button
            onClick={onGenerateBill}
            variant="outline"
            className="w-full"
          >
            Generate Bill & Leave
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MobileCartModal;