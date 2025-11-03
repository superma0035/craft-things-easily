import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'restaurant_owner' | 'staff' | 'customer';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  created_by: string | null;
}

/**
 * Hook to fetch current user's roles
 * Returns empty array if user_roles table doesn't exist yet (before migration)
 */
export const useUserRoles = () => {
  return useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Direct query - will fail gracefully if table doesn't exist
        const response = await fetch(
          `https://iwbwmwnhdthjkzgbpgil.supabase.co/rest/v1/user_roles?user_id=eq.${user.id}`,
          {
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3Yndtd25oZHRoamt6Z2JwZ2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NTA0OTUsImV4cCI6MjA2NjAyNjQ5NX0.Xc7MpDLtjuSBuIabQL5bi-36_TiVHdAhdYOaSiRQ2xM',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'Content-Type': 'application/json',
            }
          }
        );

        if (!response.ok) {
          return [];
        }

        const data = await response.json();
        return data as UserRole[];
      } catch (error) {
        console.error('Failed to fetch user roles:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false, // Don't retry if table doesn't exist
  });
};

/**
 * Hook to check if user has a specific role
 */
export const useHasRole = (role: AppRole) => {
  const { data: roles = [], isLoading } = useUserRoles();
  
  const hasRole = Array.isArray(roles) ? roles.some(r => r.role === role) : false;
  
  return { hasRole, isLoading };
};

/**
 * Hook to check if user is a restaurant owner
 * Falls back to checking if user has restaurants
 */
export const useIsRestaurantOwner = () => {
  const { hasRole: hasRoleFromRoles, isLoading: rolesLoading } = useHasRole('restaurant_owner');
  
  // Also check if user has restaurants as fallback
  const { data: profileData } = useQuery({
    queryKey: ['profile-has-restaurant'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('profiles')
        .select('has_restaurant')
        .eq('id', user.id)
        .maybeSingle();
      
      return data;
    },
    enabled: !rolesLoading,
  });
  
  const isOwner = hasRoleFromRoles || profileData?.has_restaurant || false;
  
  return { hasRole: isOwner, isLoading: rolesLoading };
};

/**
 * Hook to check if user is an admin
 */
export const useIsAdmin = () => {
  return useHasRole('admin');
};
