// import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr';
// import { cookies } from 'next/headers';
// import { UserRole } from '@/types';

// // Validate environment variables
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// if (!supabaseUrl || !supabaseAnonKey) {
//   throw new Error(
//     'Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined in .env.local'
//   );
// }

// // Browser client for Client Components (useAuth, forms, etc.)
// export const createBrowserSupabaseClient = () => {
//   return createBrowserClient(
//     supabaseUrl!,
//     supabaseAnonKey!,
//     {
//       auth: {
//         autoRefreshToken: true,
//         persistSession: true,
//         detectSessionInUrl: true,
//       },
//     }
//   );
// };

// // Server client for Server Components and API routes
// export const createServerSupabaseClient = async () => {
//   const cookieStore = await cookies();
//   return createServerClient(
//     supabaseUrl!,
//     supabaseAnonKey!,
//     {
//       cookies: {
//         get(name: string) {
//           return cookieStore.get(name)?.value;
//         },
//         set(name: string, value: string, options: CookieOptions) {
//           try {
//             cookieStore.set({ name, value, ...options });
//           } catch (error) {}
//         },
//         remove(name: string, options: CookieOptions) {
//           try {
//             cookieStore.set({ name, value: '', ...options });
//           } catch (error) {}
//         },
//       },
//     }
//   );
// };

// // Legacy export for backward compatibility - will update AuthContext next
// export const supabase = createBrowserSupabaseClient();

// // Auth helpers (for API routes)
// export const signUp = async (email: string, password: string, name: string, role: UserRole) => {
//   const supabase = createBrowserSupabaseClient();
//   const { data, error } = await supabase.auth.signUp({
//     email,
//     password,
//     options: {
//       data: {
//         name,
//         role,
//       },
//     },
//   });
//   return { data, error };
// };

// export const signIn = async (email: string, password: string) => {
//   const supabase = createBrowserSupabaseClient();
//   const { data, error } = await supabase.auth.signInWithPassword({
//     email,
//     password,
//   });
//   return { data, error };
// };

// export const signOut = async () => {
//   const supabase = createBrowserSupabaseClient();
//   const { error } = await supabase.auth.signOut();
//   return { error };
// };

// export const getCurrentUser = async () => {
//   const supabase = createBrowserSupabaseClient();
//   const { data: { user } } = await supabase.auth.getUser();
//   return user;
// };

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