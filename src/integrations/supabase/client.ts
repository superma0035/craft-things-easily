// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://iwbwmwnhdthjkzgbpgil.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3Yndtd25oZHRoamt6Z2JwZ2lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NTA0OTUsImV4cCI6MjA2NjAyNjQ5NX0.Xc7MpDLtjuSBuIabQL5bi-36_TiVHdAhdYOaSiRQ2xM";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);