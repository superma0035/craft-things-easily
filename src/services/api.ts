import { createClientWithSessionHeaders } from '@/lib/sessionHeaders';
import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];

/**
 * Centralized API service for all database operations
 * Provides type-safe methods with consistent error handling
 */
class ApiService {
  private getClient() {
    return createClientWithSessionHeaders();
  }

  // Restaurant operations
  async getRestaurants() {
    const client = this.getClient();
    const { data, error } = await client
      .from('restaurants')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch restaurants: ${error.message}`);
    return data;
  }

  async createRestaurant(restaurant: Omit<Tables['restaurants']['Insert'], 'id' | 'created_at' | 'updated_at'>) {
    const client = this.getClient();
    const { data, error } = await client
      .from('restaurants')
      .insert(restaurant)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create restaurant: ${error.message}`);
    return data;
  }

  async updateRestaurant(id: string, updates: Partial<Tables['restaurants']['Update']>) {
    const client = this.getClient();
    const { data, error } = await client
      .from('restaurants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update restaurant: ${error.message}`);
    return data;
  }

  // Menu operations
  async getMenuItems(restaurantId: string) {
    const client = this.getClient();
    const { data, error } = await client
      .from('menu_items')
      .select(`
        *,
        menu_categories (
          id,
          name
        )
      `)
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .order('sort_order', { ascending: true });
    
    if (error) throw new Error(`Failed to fetch menu items: ${error.message}`);
    return data;
  }

  async createMenuItem(menuItem: Omit<Tables['menu_items']['Insert'], 'id' | 'created_at' | 'updated_at'>) {
    const client = this.getClient();
    const { data, error } = await client
      .from('menu_items')
      .insert(menuItem)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create menu item: ${error.message}`);
    return data;
  }

  // Order operations
  async getOrders(restaurantId: string, date?: string) {
    const client = this.getClient();
    let query = client
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_items (
            name,
            price
          )
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      
      query = query
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString());
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
    return data;
  }

  async updateOrderStatus(orderId: string, status: string) {
    const client = this.getClient();
    const { data, error } = await client
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update order status: ${error.message}`);
    return data;
  }

  // Table operations
  async getTables(restaurantId: string) {
    const client = this.getClient();
    const { data, error } = await client
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('table_number', { ascending: true });
    
    if (error) throw new Error(`Failed to fetch tables: ${error.message}`);
    return data;
  }

  async createTable(table: Omit<Tables['tables']['Insert'], 'id' | 'created_at'>) {
    const client = this.getClient();
    const { data, error } = await client
      .from('tables')
      .insert(table)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create table: ${error.message}`);
    return data;
  }

  // Session operations
  async createDeviceSession(session: Omit<Tables['device_sessions']['Insert'], 'id' | 'created_at'>) {
    const client = this.getClient();
    const { data, error } = await client
      .from('device_sessions')
      .insert(session)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to create device session: ${error.message}`);
    return data;
  }

  async updateDeviceSession(sessionToken: string, updates: Partial<Tables['device_sessions']['Update']>) {
    const client = this.getClient();
    const { data, error } = await client
      .from('device_sessions')
      .update(updates)
      .eq('session_token', sessionToken)
      .select()
      .single();
    
    if (error) throw new Error(`Failed to update device session: ${error.message}`);
    return data;
  }
}

export const apiService = new ApiService();
export default apiService;