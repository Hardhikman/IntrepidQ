import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  
  // Check if URL contains hwp parameter
  if (url.searchParams.has('hwp')) {
    // Remove the hwp parameter
    url.searchParams.delete('hwp')
    
    // Redirect to clean URL
    return NextResponse.redirect(url)
  }
  
  // Check for other problematic parameters
  let hasModified = false
  const problematicParams = ['_rsc']
  
  problematicParams.forEach(param => {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param)
      hasModified = true
    }
  })
  
  if (hasModified) {
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}