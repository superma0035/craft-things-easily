import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://iwbwmwnhdthjkzgbpgil.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3Yndtd25oZHRoamt6Z2JwZ2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NTA0OTUsImV4cCI6MjA2NjAyNjQ5NX0.Xc7MpDLtjuSBuIabQL5bi-36_TiVHdAhdYOaSiRQ2xM";

// Session token manager for secure session handling
class SessionTokenManager {
  private sessionToken: string | null = null;

  setSessionToken(token: string | null) {
    this.sessionToken = token;
  }

  getSessionToken(): string | null {
    return this.sessionToken;
  }

  clearSessionToken() {
    this.sessionToken = null;
  }

  // Create a Supabase client with session token headers
  createClient() {
    const headers: Record<string, string> = {};
    if (this.sessionToken) {
      headers['x-session-token'] = this.sessionToken;
    }
    
    return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: {
        headers,
      },
    });
  }
}

export const sessionTokenManager = new SessionTokenManager();

// Enhanced Supabase client that automatically includes session tokens
export const createSupabaseClientWithSession = () => {
  return sessionTokenManager.createClient();
};