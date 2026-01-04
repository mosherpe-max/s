'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const GolfBallIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 12c-2 0-2.83 1-4 1s-2-1-4-1" />
    <path d="m15.5 15.5-3-3" />
    <path d="M20 16c-2 0-2.83-1-4-1s-2 1-4 1" />
    <path d="M4 16c2 0 2.83-1 4-1s2 1 4 1" />
    <path d="M12 12c2 0 2.83-1 4-1s2 1 4 1" />
    <path d="M4 8c2 0 2.83 1 4 1s2-1-4-1" />
    <path d="m8.5 8.5 3 3" />
    <path d="M20 8c-2 0-2.83 1-4 1s-2-1-4-1" />
  </svg>
);

export default function LoginPage() {
  const message = 'Prototyping Mode';
  const description = 'User authentication is currently disabled for development.';

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-background p-4">
      <Card className="w-full max-w-sm mx-auto shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <GolfBallIcon className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="font-headline text-3xl">
            {message}
          </CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent></CardContent>
      </Card>
    </div>
  );
}
