
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined in .env.local');
}

let _browserClient: ReturnType<typeof createBrowserClient> | null = null;

export const createBrowserSupabaseClient = () => {
  if (_browserClient) return _browserClient;
  _browserClient = createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  return _browserClient;
};

// Legacy export for backward compatibility
export const supabase = createBrowserSupabaseClient();