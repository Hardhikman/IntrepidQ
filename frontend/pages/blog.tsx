"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

export default function BlogPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-r from-orange-50 to-blue-50 p-4 space-y-6">
      {/* Header */}
      <Card className="max-w-5xl mx-auto shadow-md">
        <CardHeader className="py-6 text-center">
          <CardTitle className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-orange-400 via-blue-400 to-orange-500 bg-clip-text text-transparent drop-shadow-sm">
            IntrepidQ Blog
          </CardTitle>
          <p className="text-xl text-gray-600 mt-4">
            Insights, Tips, and Updates for UPSC Preparation
          </p>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Card className="max-w-5xl mx-auto shadow-lg">
        <CardContent className="p-8">
          
          {/* Coming Soon Message */}
          <div className="text-center py-16">
            <BookOpen className="w-24 h-24 text-gray-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Blog Coming Soon! 📚
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto mb-8">
              We're preparing amazing content for UPSC aspirants. Stay tuned!
            </p>
            
            <Button 
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-orange-500 to-blue-500 hover:from-orange-600 hover:to-blue-600 text-white px-8 py-3 font-semibold"
            >
              🚀 Back to Generator
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}