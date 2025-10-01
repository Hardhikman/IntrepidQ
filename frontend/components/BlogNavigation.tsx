"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function BlogNavigation() {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <Button asChild>
        <Link href="/blogs">Blog</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/docs">Documentation</Link>
      </Button>
    </div>
  );
}