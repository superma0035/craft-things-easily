import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, ChefHat, CheckCircle, Bell, X, Info } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions?: string;
  menu_items: {
    name: string;
    description?: string;
  };
}

interface OrderDetail {
  id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  total_amount: number;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  notes?: string;
  order_items: OrderItem[];
}

interface OrderDetailsModalProps {
  restaurantId: string;
  tableNumber: string;
}

const OrderDetailsModal = ({ restaurantId, tableNumber }: OrderDetailsModalProps) => {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['detailed-orders', restaurantId, tableNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          updated_at,
          customer_name,
          notes,
          order_items (
            id,
            quantity,
            unit_price,
            total_price,
            special_instructions,
            menu_items!order_items_menu_item_id_fkey (
              name,
              description
            )
          )
        `)
        .eq('restaurant_id', restaurantId)
        .eq('table_number', tableNumber)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OrderDetail[];
    },
    refetchInterval: 10000
  });

  const getStatusInfo = (status: OrderDetail['status']) => {
    switch (status) {
      case 'pending':
        return { 
          icon: Clock, 
          text: 'Pending', 
          color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
          description: 'Waiting for confirmation'
        };
      case 'confirmed':
        return { 
          icon: CheckCircle, 
          text: 'Confirmed', 
          color: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
          description: 'Order confirmed by restaurant'
        };
      case 'preparing':
        return { 
          icon: ChefHat, 
          text: 'Preparing', 
          color: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
          description: 'Being prepared in kitchen'
        };
      case 'ready':
        return { 
          icon: Bell, 
          text: 'Ready', 
          color: 'bg-green-100 text-green-800 hover:bg-green-100',
          description: 'Ready to be served'
        };
      case 'served':
        return { 
          icon: CheckCircle, 
          text: 'Served', 
          color: 'bg-green-100 text-green-800 hover:bg-green-100',
          description: 'Order completed'
        };
      case 'cancelled':
        return { 
          icon: X, 
          text: 'Cancelled', 
          color: 'bg-red-100 text-red-800 hover:bg-red-100',
          description: 'Order cancelled'
        };
      default:
        return { 
          icon: Clock, 
          text: 'Unknown', 
          color: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
          description: 'Status unknown'
        };
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalSessionAmount = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

  if (isLoading) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Info className="w-4 h-4 mr-2" />
            Order Details
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Info className="w-4 h-4 mr-2" />
          Order Details ({orders.length})
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Order Details - Table {tableNumber}</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4 overflow-y-auto h-[calc(100vh-120px)]">
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Info className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No orders found</p>
            </div>
          ) : (
            <>
              {orders.map((order) => {
                const statusInfo = getStatusInfo(order.status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <Card key={order.id} className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          Order #{order.id.slice(-8).toUpperCase()}
                        </CardTitle>
                        <Badge className={statusInfo.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.text}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Placed: {formatTime(order.created_at)}</p>
                        {order.updated_at !== order.created_at && (
                          <p>Updated: {formatTime(order.updated_at)}</p>
                        )}
                        <p className="text-xs text-gray-600">{statusInfo.description}</p>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0 space-y-3">
                      <div className="space-y-2">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex justify-between items-start text-sm">
                            <div className="flex-1 mr-2">
                              <p className="font-medium">{item.menu_items.name}</p>
                              {item.menu_items.description && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {item.menu_items.description}
                                </p>
                              )}
                              {item.special_instructions && (
                                <p className="text-xs text-orange-600 mt-1 italic">
                                  Note: {item.special_instructions}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                ₹{item.unit_price} × {item.quantity}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">₹{item.total_price}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {order.notes && (
                        <>
                          <Separator />
                          <div className="text-xs">
                            <p className="font-medium text-gray-700">Order Notes:</p>
                            <p className="text-gray-600 mt-1">{order.notes}</p>
                          </div>
                        </>
                      )}
                      
                      <Separator />
                      <div className="flex justify-between font-semibold text-sm">
                        <span>Order Total:</span>
                        <span>₹{order.total_amount}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              {orders.length > 1 && (
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-orange-800">Session Total:</span>
                      <span className="font-bold text-lg text-orange-800">
                        ₹{totalSessionAmount.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-orange-600 mt-1">
                      Total across all orders for this table session
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default OrderDetailsModal;