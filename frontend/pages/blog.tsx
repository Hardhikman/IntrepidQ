"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Sample blog posts data
const blogPosts = [
  {
    id: 1,
    title: "How IntrepidQ Enhances UPSC Preparation",
    date: "August 24, 2025",
    excerpt: "IntrepidQ offers a unique approach to UPSC preparation by leveraging advanced AI models to generate context-aware questions that closely mimic the actual examination pattern..."
  },
  {
    id: 2,
    title: "Webapp Updates and New Features",
    date: "August 20, 2025",
    excerpt: "We're constantly improving IntrepidQ with new features and updates to enhance your UPSC preparation experience. This post covers the latest webapp updates..."
  }
];

export default function BlogPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-r from-orange-50 to-blue-50 p-4 space-y-6">
      {/* Header - Paper Style */}
      <Card className="max-w-4xl mx-auto shadow-xl border-0">
        <CardHeader className="py-10 text-center bg-white">
          <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-gray-800 mb-6 leading-tight">
            IntrepidQ Blog
            <br />
            Educational Resources & Updates
          </CardTitle>
          <div className="h-px bg-gray-300 w-24 mx-auto mb-6"></div>
          <p className="text-base md:text-lg text-gray-600 font-serif italic max-w-3xl mx-auto leading-relaxed">
            Articles, guides, and updates to enhance your UPSC preparation journey
          </p>
        </CardHeader>
      </Card>

      {/* Blog Posts - Paper Style */}
      <div className="max-w-4xl mx-auto space-y-6">
        {blogPosts.map((post) => (
          <Card key={post.id} className="shadow-md border-0 hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-8 bg-white">
              <div className="space-y-3 font-serif">
                <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-800 mb-2">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  {post.date}
                </p>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                  <span className="inline-block w-8"></span>
                  {post.excerpt}
                </p>
                <div className="pt-4">
                  <Button
                    variant="outline"
                    className="text-purple-600 border-purple-300 hover:bg-purple-50"
                  >
                    Read More
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Back to Home button */}
      <div className="max-w-4xl mx-auto pt-6 text-center">
        <Button
          onClick={() => router.push('/')}
          className="bg-gradient-to-r from-orange-400 to-blue-500 hover:from-orange-500 hover:to-blue-600 text-white"
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
}
