"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function WebappUpdatesAndNewFeatures() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-r from-orange-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back button */}
        <div className="pt-6">
          <Button
            onClick={() => router.push('/blog')}
            className="bg-gradient-to-r from-orange-400 to-blue-500 hover:from-orange-500 hover:to-blue-600 text-white"
          >
            ← Back to Blog
          </Button>
        </div>

        {/* Blog Post - Paper Style */}
        <Card className="shadow-xl border-0">
          <CardHeader className="py-8 bg-white">
            <CardTitle className="text-2xl md:text-3xl font-serif font-bold text-gray-800 leading-tight">
              Webapp Updates and New Features
            </CardTitle>
            <p className="text-gray-500 mt-2">September 19, 2025</p>
          </CardHeader>
          <CardContent className="p-8 bg-white">
            <div className="space-y-6 font-serif text-gray-800">
              
              <h2 className="text-xl font-bold mt-8 mb-4">Introduction</h2>
              
              <p className="mb-4">
                We're constantly improving IntrepidQ with new features and updates to enhance your UPSC preparation experience. This post covers the latest webapp updates that are now available to all users.
              </p>
              
              <h2 className="text-xl font-bold mt-8 mb-4">New Question Generation Modes</h2>
              
              <p className="mb-4">
                We've expanded our question generation capabilities with three distinct modes to cater to different preparation needs:
              </p>
              
              <ul className="list-disc pl-8 mb-4 space-y-2">
                <li><strong>Topic-wise Mode</strong> - Generate questions based on specific UPSC syallbus topics</li>
                <li><strong>Keyword-based Mode</strong> - Create questions around specific keywords or concepts of USC CSE syllabus</li>
                <li><strong>Whole Paper Mode</strong> - Generate a complete 10-question each paper for full-length practice</li>
                <li><strong>Current affairs Mode</strong> - Create upto 3 CA questions for each keyword under syallbus topics</li>
              </ul>
              
              <h2 className="text-xl font-bold mt-8 mb-4">Enhanced Answer Evaluation System</h2>
              
              <p className="mb-4">
                Our new answer evaluation feature allows you to upload screenshots of your handwritten answers for AI-powered evaluation. Key features include:
              </p>
              
              <ul className="list-disc pl-8 mb-4 space-y-2">
                <li>Upload up to 5 images per evaluation request</li>
                <li>Detailed feedback organized by evaluation parameters</li>
                <li>Customizable evaluation prompts for specific questions</li>
                <li>Structured feedback with strengths, weaknesses, and improvement suggestions</li>
              </ul>
              
              <h2 className="text-xl font-bold mt-8 mb-4">Improved Dashboard and Analytics</h2>
              
              <p className="mb-4">
                The user dashboard has been enhanced with new features to help you track your progress:
              </p>
              
              <ul className="list-disc pl-8 mb-4 space-y-2">
                <li>A comprehensive overview of your test preparation journey</li>
                <li>Daily task limit tracking</li>
                <li>Track your progress towards each topic</li>
                <li>Detailed analytics on subject, topic, and mode usage</li>
                <li>History filtering by subject, mode, and time range</li>
              </ul>
              
              <h2 className="text-xl font-bold mt-8 mb-4">Model Selection and Customization</h2>
              
              <p className="mb-4">
                Users now have more control over the AI models used for question generation:
              </p>
              
              <ul className="list-disc pl-8 mb-4 space-y-2">
                <li>Multiple AI models to choose from including Llama, gemini, OpenAI and Moonshot</li>
                <li>Dynamic model selection based on performance metrics</li>
                <li>Ability to customize the number of questions generated</li>
              </ul>
              
              <h2 className="text-xl font-bold mt-8 mb-4">Current Affairs Integration</h2>
              
              <p className="mb-4">
                Only Current affairs mode supports latest news inclusion for question generation:
              </p>
              
              <ul className="list-disc pl-8 mb-4 space-y-2">
                <li>User control over the news source</li>
                <li>Context-aware questions that incorporate recent events</li>
                <li>Relevant for both topic-wise and keyword-based generation</li>
              </ul>
              
              <h2 className="text-xl font-bold mt-8 mb-4">User Experience Improvements</h2>
              
              <p className="mb-4">
                We've made several quality of life improvements to enhance your experience:
              </p>
              
              <ul className="list-disc pl-8 mb-4 space-y-2">
                <li>Responsive design that works seamlessly on all devices</li>
                <li>Improved loading states and user website feedback</li>
                <li>Better error handling and informative messages</li>
                <li>Streamlined authentication with Google OAuth</li>
                <li>Daily generation limits with clear indicators</li>
              </ul>
              
              <h2 className="text-xl font-bold mt-8 mb-4">Future Roadmap</h2>
              
              <p className="mb-4">
                We're continuously working to make IntrepidQ AI even better. Upcoming features include:
              </p>
              
              <ul className="list-disc pl-8 mb-4 space-y-2">
                <li>Improved question generation logic</li>
                <li>Enhanced user experience and interface</li>
                <li>Evaluation of performance of AI models with respect to retrieval and generation</li>
              </ul>
              
              <blockquote className="border-l-4 border-orange-400 pl-4 italic my-6">
                <p className="mb-2"><strong>We're committed to providing the best possible tools for your UPSC preparation. Stay tuned for more exciting updates!</strong></p>
              </blockquote>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
