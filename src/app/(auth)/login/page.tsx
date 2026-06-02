/**
 * DEPRECATED ROUTE
 * 
 * This file has been completely neutralized to resolve a Next.js parallel route conflict.
 * The primary authentication logic is now located at: src/app/login/page.tsx
 * 
 * To fix the build error "You cannot have two parallel pages that resolve to the same path",
 * this file must not have a default export.
 */

export const dynamic = 'force-static';
// No default export here ensures Next.js ignores this as a route segment.
