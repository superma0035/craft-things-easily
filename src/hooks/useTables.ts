
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface Table {
  id: string;
  restaurant_id: string;
  table_number: string;
  qr_code: string | null;
  capacity: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateTableData {
  restaurant_id: string;
  table_number: string;
  capacity?: number;
}

export const useTables = (restaurantId: string | undefined) => {
  return useQuery({
    queryKey: ['tables', restaurantId],
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
        throw new Error('Unauthorized access to restaurant tables');
      }
      
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('table_number', { ascending: true });

      if (error) throw error;
      return data as Table[];
    },
    enabled: !!restaurantId
  });
};

export const useCreateTable = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tableData: CreateTableData) => {
      // Check if there's an inactive table we can reactivate
      const { data: existingTable, error: checkError } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', tableData.restaurant_id)
        .eq('table_number', tableData.table_number)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingTable) {
        if (existingTable.is_active) {
          throw new Error(`Table ${tableData.table_number} already exists and is active`);
        } else {
          // Reactivate the existing inactive table
          const { data: reactivatedTable, error: updateError } = await supabase
            .from('tables')
            .update({
              is_active: true,
              capacity: tableData.capacity || existingTable.capacity,
              qr_code: `${window.location.origin}/order/${tableData.restaurant_id}/${tableData.table_number}`
            })
            .eq('id', existingTable.id)
            .select()
            .maybeSingle();

          if (updateError || !reactivatedTable) {
            throw updateError || new Error('Failed to reactivate table');
          }
          return reactivatedTable;
        }
      }

      // Create new table if none exists
      const qrData = `${window.location.origin}/order/${tableData.restaurant_id}/${tableData.table_number}`;
      
      const { data, error } = await supabase
        .from('tables')
        .insert({
          restaurant_id: tableData.restaurant_id,
          table_number: tableData.table_number,
          capacity: tableData.capacity || 4,
          qr_code: qrData
        })
        .select()
        .maybeSingle();

      if (error || !data) {
        throw error || new Error('Failed to create table');
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tables', variables.restaurant_id] });
      toast({
        title: "Success!",
        description: "Table created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create table",
        variant: "destructive"
      });
    }
  });
};

export const useDeleteTable = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tableId: string) => {
      const { error } = await supabase
        .from('tables')
        .update({ is_active: false })
        .eq('id', tableId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast({
        title: "Success!",
        description: "Table deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete table",
        variant: "destructive"
      });
    }
  });
};
