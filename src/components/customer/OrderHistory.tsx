import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Clock, ChefHat, CheckCircle, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  total_amount: number;
  created_at: string;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    menu_items: {
      name: string;
    };
  }[];
}

interface OrderHistoryProps {
  restaurantId: string;
  tableNumber: string;
  sessionStartTime: Date;
}

const OrderHistory = ({ restaurantId, tableNumber, sessionStartTime }: OrderHistoryProps) => {
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['session-orders', restaurantId, tableNumber, sessionStartTime],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          order_items (
            id,
            quantity,
            unit_price,
            total_price,
            menu_items!order_items_menu_item_id_fkey (
              name
            )
          )
        `)
        .eq('restaurant_id', restaurantId)
        .eq('table_number', tableNumber)
        .gte('created_at', sessionStartTime.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const getStatusInfo = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, text: 'Pending', color: 'text-yellow-600' };
      case 'confirmed':
        return { icon: CheckCircle, text: 'Confirmed', color: 'text-blue-600' };
      case 'preparing':
        return { icon: ChefHat, text: 'Preparing', color: 'text-orange-600' };
      case 'ready':
        return { icon: CheckCircle, text: 'Ready', color: 'text-green-600' };
      case 'served':
        return { icon: CheckCircle, text: 'Served', color: 'text-green-700' };
      case 'cancelled':
        return { icon: Clock, text: 'Cancelled', color: 'text-red-600' };
      default:
        return { icon: Clock, text: 'Unknown', color: 'text-gray-600' };
    }
  };

  const totalAmount = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

  const generateBill = () => {
    const billContent = orders.map(order => 
      order.order_items.map(item => 
        `${item.menu_items.name} x${item.quantity} - ₹${item.total_price}`
      ).join('\n')
    ).join('\n\n');

    toast({
      title: "Bill Generated",
      description: `Total Session Amount: ₹${totalAmount.toFixed(2)}`,
      duration: 5000,
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Receipt className="w-4 h-4 mr-2" />
          Order History ({orders.length})
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>Order History - Table {tableNumber}</SheetTitle>
        </SheetHeader>
        
        <div className="mt-4 space-y-4 overflow-y-auto h-[calc(100%-120px)]">
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No orders placed yet</p>
            </div>
          ) : (
            orders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const StatusIcon = statusInfo.icon;
              
              return (
                <Card key={order.id} className="border-l-4 border-l-orange-500">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                        <span className={`text-sm font-medium ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1 mb-2">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.menu_items.name} x{item.quantity}</span>
                          <span>₹{item.total_price}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Order Total:</span>
                        <span>₹{order.total_amount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {orders.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 bg-white border-t pt-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold text-lg">Session Total:</span>
              <span className="font-bold text-xl text-orange-600">₹{totalAmount.toFixed(2)}</span>
            </div>
            <Button onClick={generateBill} className="w-full bg-orange-500 hover:bg-orange-600">
              Generate Final Bill
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default OrderHistory;