// Public marketing pages (and the patron Terms), served on kooporder.com. They use the same site header
// as the home page, aren't treated as patron pages, and stay on the marketing
// domain (see src/middleware.ts).
export const MARKETING_PATHS = ['/', '/golf', '/bowling', '/terms'];

export function isMarketingPath(pathname: string | null | undefined): boolean {
  return !!pathname && MARKETING_PATHS.includes(pathname);
}
