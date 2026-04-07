//proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}
// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/about',
  '/privacy-policy',
  '/api/auth/login-notification',
];

// Role-based route access
const PATIENT_ROUTES = ['/patient/dashboard', '/patient'];
const CAREGIVER_ROUTES = ['/caregiver/dashboard', '/caregiver'];
const AUTHENTICATED_ROUTES = ['/settings'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // STEP 0: Skip middleware for static files and API routes (except auth)
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/fonts/') ||
    (pathname.startsWith('/api/') && !pathname.includes('/auth/'))
  ) {
    return NextResponse.next();
  }

  // STEP 1: Check if this is a public route
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    // Allow access to public routes
    return NextResponse.next();
  }

  // STEP 2: Create Supabase client for middleware
  const res = NextResponse.next();
  const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        res.cookies.set({ name, value: '', ...options });
      },
    },
  }
);

  try {
    // STEP 3: Get session
    const {
    data: { user },
    error: userError,
    } = await supabase.auth.getUser();

    // If no session, redirect to login
    if (!user || userError) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // STEP 4: Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, locked_until')
      .eq('id', user.id)
      .single();

    // If profile not found, redirect to register to complete profile
    if (profileError || !profile) {
      const redirectUrl = new URL('/register', request.url);
      redirectUrl.searchParams.set('message', 'Please complete your profile');
      return NextResponse.redirect(redirectUrl);
    }

    // STEP 5: Check if account is locked
    if (profile.locked_until) {
      const lockedUntil = new Date(profile.locked_until);
      if (lockedUntil > new Date()) {
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set(
          'error',
          `Account locked until ${lockedUntil.toLocaleTimeString()}`
        );
        return NextResponse.redirect(redirectUrl);
      }
    }

    const userRole = profile.role;

    // STEP 6: Check role-based access
    const isPatientRoute = PATIENT_ROUTES.some(route =>
      pathname.startsWith(route)
    );
    const isCaregiverRoute = CAREGIVER_ROUTES.some(route =>
      pathname.startsWith(route)
    );

    // Patient trying to access caregiver routes
    if (isCaregiverRoute && userRole === 'patient') {
      const redirectUrl = new URL('/patient/dashboard', request.url);
      redirectUrl.searchParams.set('error', 'Access denied. Redirected to patient dashboard.');
      return NextResponse.redirect(redirectUrl);
    }

    // Caregiver trying to access patient routes
    if (isPatientRoute && (userRole === 'caregiver_primary' || userRole === 'caregiver_secondary')) {
      const redirectUrl = new URL('/caregiver/dashboard', request.url);
      redirectUrl.searchParams.set('error', 'Access denied. Redirected to caregiver dashboard.');
      return NextResponse.redirect(redirectUrl);
    }

    // STEP 7: All checks passed - allow access
    return res;

  } catch (error) {
    console.error('Middleware error:', error);
    
    // On error, redirect to login for safety
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('error', 'Authentication error. Please login again.');
    return NextResponse.redirect(redirectUrl);
  }
}

// Configure which routes middleware runs on
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf)$).*)',
  ],
};