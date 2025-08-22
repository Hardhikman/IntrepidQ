"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TypographyH2, TypographyLarge, TypographyList } from '@/components/ui/typography';

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="max-w-4xl mx-auto mb-6 bg-orange-50/60 border-orange-100">
        <CardContent className="p-4 sm:p-6 md:p-10 text-center">
          <TypographyH2 />
          <div className="mt-6">
            <TypographyLarge />
          </div>
          <div className="mt-4 rounded-lg border border-orange-200 bg-white/80 p-4 lg:p-6 lg:border-l-4 lg:border-l-orange-300 inline-block text-left">
            <TypographyList />
          </div>
          <div className="text-center mt-6 text-orange-500">
            <Button onClick={() => router.push('/')}>
              Back to Generator
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}