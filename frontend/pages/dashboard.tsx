"use client";

import { Dashboard } from '@/components/Dashboard';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  return (
    <Dashboard onNavigateToGenerator={() => router.push('/')} />
  );
}