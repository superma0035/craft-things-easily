import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, CheckCircle, ChefHat, Bell } from 'lucide-react';

interface Order {
  id: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  total_amount: number;
  created_at: string;
  table_number: string;
}

interface OrderStatusTrackerProps {
  restaurantId: string;
  tableNumber: string;
}

const OrderStatusTracker = ({ restaurantId, tableNumber }: OrderStatusTrackerProps) => {
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);

  // Fetch latest order for this table
  useEffect(() => {
    const fetchLatestOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('table_number', tableNumber)
        .neq('status', 'served')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setCurrentOrder(data as Order);
      }
    };

    fetchLatestOrder();
  }, [restaurantId, tableNumber]);

  // Real-time order status updates
  useEffect(() => {
    if (!currentOrder) return;

    const channel = supabase
      .channel('order-status-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${currentOrder.id}`
        },
        (payload) => {
          console.log('Order status updated:', payload);
          setCurrentOrder(payload.new as Order);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrder?.id]);

  if (!currentOrder) {
    return null;
  }

  const getStatusInfo = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          text: 'Order Received',
          description: 'Waiting for restaurant confirmation',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'confirmed':
        return {
          icon: CheckCircle,
          text: 'Order Confirmed',
          description: 'Restaurant is preparing your order',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'preparing':
        return {
          icon: ChefHat,
          text: 'Being Prepared',
          description: 'Your food is being cooked',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'ready':
        return {
          icon: Bell,
          text: 'Order Ready!',
          description: 'Your order is ready to be served',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      default:
        return {
          icon: Clock,
          text: 'Processing',
          description: 'Order in progress',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const statusInfo = getStatusInfo(currentOrder.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40">
      <Card className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-2 shadow-lg`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className={`${statusInfo.color} flex-shrink-0`}>
              <StatusIcon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${statusInfo.color}`}>
                {statusInfo.text}
              </p>
              <p className="text-xs text-gray-600">
                {statusInfo.description}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Order #: {currentOrder.id.slice(-8).toUpperCase()}
              </p>
            </div>
            {currentOrder.status === 'ready' && (
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderStatusTracker;