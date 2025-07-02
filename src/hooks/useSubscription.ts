import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier?: string | null;
  subscription_end?: string | null;
}

export const useSubscription = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const fetchSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
    if (!session?.access_token) {
      throw new Error('No active session');
    }

    const { data, error } = await supabase.functions.invoke('check-subscription', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('Error checking subscription:', error);
      throw new Error(error.message || 'Failed to check subscription status');
    }

    return data;
  };

  const { data: subscriptionStatus, refetch: refetchSubscription } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: fetchSubscriptionStatus,
    enabled: !!user && !!session?.access_token,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });

  const createCheckoutSession = useMutation({
    mutationFn: async ({ priceId, mode = 'subscription' }: { priceId?: string; mode?: string }) => {
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, mode },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create checkout session');
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error) => {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Failed",
        description: error instanceof Error ? error.message : "Failed to start checkout process",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const openCustomerPortal = useMutation({
    mutationFn: async () => {
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to open customer portal');
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error) => {
      console.error('Customer portal error:', error);
      toast({
        title: "Portal Access Failed",
        description: error instanceof Error ? error.message : "Failed to open customer portal",
        variant: "destructive",
      });
    },
  });

  const refreshSubscriptionStatus = useCallback(async () => {
    await refetchSubscription();
  }, [refetchSubscription]);

  return {
    subscriptionStatus,
    isLoading: isLoading || createCheckoutSession.isPending || openCustomerPortal.isPending,
    createCheckoutSession: createCheckoutSession.mutate,
    openCustomerPortal: openCustomerPortal.mutate,
    refreshSubscriptionStatus,
  };
};