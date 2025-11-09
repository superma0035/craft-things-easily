
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useMenuItems = (restaurantId?: string) => {
  return useQuery({
    queryKey: ['menu-items', restaurantId],
    queryFn: async () => {
      if (!restaurantId) {
        return [];
      }

      console.log('Fetching menu items for restaurant:', restaurantId);
      
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
        throw new Error('Unauthorized access to restaurant menu items');
      }
      
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching menu items:', error);
        throw error;
      }

      console.log('Menu items fetched:', data?.length || 0);
      return data || [];
    },
    enabled: !!restaurantId,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateMenuItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (menuItem: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('Creating menu item:', menuItem);
      
      const { data, error } = await supabase
        .from('menu_items')
        .insert([menuItem])
        .select()
        .maybeSingle();

      if (error || !data) {
        console.error('Error creating menu item:', error);
        throw error || new Error('Failed to create menu item');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success('Menu item created successfully');
      console.log('Menu item created:', data);
    },
    onError: (error: any) => {
      console.error('Failed to create menu item:', error);
      toast.error('Failed to create menu item: ' + (error?.message || 'Unknown error'));
    },
  });
};

export const useDeleteMenuItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      console.log('Deleting menu item:', itemId);
      
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('Error deleting menu item:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success('Menu item deleted successfully');
    },
    onError: (error: any) => {
      console.error('Failed to delete menu item:', error);
      toast.error('Failed to delete menu item: ' + (error?.message || 'Unknown error'));
    },
  });
};
