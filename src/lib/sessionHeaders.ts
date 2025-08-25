import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://iwbwmwnhdthjkzgbpgil.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3Yndtd25oZHRoamt6Z2JwZ2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NTA0OTUsImV4cCI6MjA2NjAyNjQ5NX0.Xc7MpDLtjuSBuIabQL5bi-36_TiVHdAhdYOaSiRQ2xM";

// Helper to create Supabase client with session headers
export const createClientWithSessionHeaders = (sessionToken?: string) => {
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

// Get session token from localStorage
export const getSessionToken = (): string | null => {
  return localStorage.getItem('session_token');
};

// Set session token in localStorage
export const setSessionToken = (token: string): void => {
  localStorage.setItem('session_token', token);
};

// Remove session token from localStorage
export const clearSessionToken = (): void => {
  localStorage.removeItem('session_token');
};