import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Simple client-side gating — full auth check happens client-side in AuthProvider.
  // For real protection use Firebase session cookies.
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
