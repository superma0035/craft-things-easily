
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  table_number: string | null;
  customer_name: string | null;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled';
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useTodaysOrders = (restaurantId: string | undefined) => {
  return useQuery({
    queryKey: ['todays-orders', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // Verify restaurant ownership
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('id', restaurantId)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!restaurant) {
        throw new Error('Unauthorized access to restaurant orders');
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!restaurantId,
    refetchInterval: 30000 // Refetch every 30 seconds
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: Order['status'] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User must be authenticated');
      }

      // First get the order to verify ownership
      const { data: order } = await supabase
        .from('orders')
        .select('restaurant_id')
        .eq('id', orderId)
        .maybeSingle();

      if (!order) {
        throw new Error('Order not found');
      }

      // Verify restaurant ownership
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('id', order.restaurant_id)
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!restaurant) {
        throw new Error('Unauthorized access to order');
      }

      const { data, error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
        .maybeSingle();

      if (error || !data) {
        throw error || new Error('Failed to update order status');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todays-orders'] });
      toast({
        title: "Success!",
        description: "Order status updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive"
      });
    }
  });
};
