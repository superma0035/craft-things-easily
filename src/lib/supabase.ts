import { supabase as mainClient } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://iwbwmwnhdthjkzgbpgil.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3Yndtd25oZHRoamt6Z2JwZ2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NTA0OTUsImV4cCI6MjA2NjAyNjQ5NX0.Xc7MpDLtjuSBuIabQL5bi-36_TiVHdAhdYOaSiRQ2xM";

/**
 * Main Supabase client - use this for all authenticated operations
 */
export const supabase = mainClient;

/**
 * Create a Supabase client with custom session headers
 * Only use this for customer-facing operations that require session tokens
 */
export const createClientWithSession = (sessionToken?: string) => {
  const token = sessionToken || localStorage.getItem('session_token');
  
  const headers: Record<string, string> = {};
  if (token) {
    headers['x-session-token'] = token;
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers,
    },
  });
};

/**
 * Session token utilities
 */
export const sessionStorage = {
  getToken: (): string | null => localStorage.getItem('session_token'),
  
  setToken: (token: string): void => {
    localStorage.setItem('session_token', token);
  },
  
  clearToken: (): void => {
    localStorage.removeItem('session_token');
  },
  
  getCustomerName: (): string | null => localStorage.getItem('customer_name'),
  
  setCustomerName: (name: string): void => {
    localStorage.setItem('customer_name', name);
  },
};
