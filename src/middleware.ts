import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  // Run on admin + customer-account routes (session refresh + guard).
  matcher: ['/admin/:path*', '/account/:path*'],
}
