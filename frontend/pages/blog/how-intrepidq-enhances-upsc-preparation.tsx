"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ImageCard from '@/components/ImageCard';

export default function HowIntrepidQEnhancesUPSC() {
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
              How IntrepidQ Enhances UPSC Preparation
            </CardTitle>
            <p className="text-gray-500 mt-2">September 10, 2025</p>
          </CardHeader>
          <CardContent className="p-8 bg-white">
            <div className="space-y-6 font-serif text-gray-800">
              
              <h2 className="text-xl font-bold mt-8 mb-4">The Problem with Current Question Sources</h2>
              
              <p className="mb-4">
                Every UPSC aspirant knows that <strong>answer writing practice</strong> is the key to cracking Mains. Traditionally, aspirants rely on <strong>UPSC Mains test series</strong> or coaching institutes to get practice questions. But here lies the problem:
              </p>
              
              <ul className="list-disc pl-8 mb-4 space-y-2">
                <li>Many test series today simply <strong>copy UPSC Previous Year Questions (PYQs)</strong> without adding real value.</li>
                <li>Some institutes and websites even <strong>lift questions from chatbots</strong> like ChatGPT or Perplexity.</li>
                <li>The result? <strong>Irrelevant, poorly framed, or out-of-context questions</strong> that don't match the UPSC pattern.</li>
              </ul>
              
              <p className="mb-4">
                This lack of <strong>transparency in question selection</strong> puts serious aspirants at a disadvantage, wasting their time and energy.
              </p>
              
              <h2 className="text-xl font-bold mt-8 mb-4">How IntrepidQ Solves the Problem</h2>
              
              <p className="mb-4">
                <strong>IntrepidQ</strong> is built specifically for UPSC aspirants. It does <strong>not work like a chatbot</strong> or a random question generator. Instead, it is fully aligned with the <strong>official UPSC Mains syllabus</strong> and <strong>PYQs (Previous Year Questions)</strong>.
              </p>
              
              <p className="mb-4">
                This ensures that every single question you practice is:
              </p>
              
              <ul className="list-disc pl-8 mb-4 space-y-2">
                <li><strong>Relevant to the exam</strong></li>
                <li><strong>Contextually framed like actual UPSC questions</strong></li>
                <li><strong>Designed to test both content knowledge and analytical ability</strong></li>
              </ul>
              
              <p className="mb-4">
                Think of IntrepidQ as your <strong>PhD-level UPSC question maker</strong>, who frames questions exactly the way UPSC does.
              </p>
              
              <h2 className="text-xl font-bold mt-8 mb-4">Modes for Every Type of UPSC Aspirant</h2>
              
              <p className="mb-4">
                UPSC preparation is not the same for everyone. IntrepidQ offers <strong>two powerful modes</strong> to cater to all types of aspirants:
              </p>
              
              <ul className="list-disc pl-8 mb-4 space-y-2">
                <li><strong>Topic-Wise Mode</strong> → Perfect for beginners who want to build a strong foundation and cover the syllabus step by step.</li>
                <li><strong>Keyword Mode</strong> → Ideal for experienced aspirants who want to sharpen their skills and practice answer writing around UPSC keywords.</li>
                <li><strong>Both the above modes</strong> → Designed for working professionals also who have limited time and need <strong>distraction-free, high-quality practice questions</strong>.</li>
              </ul>
              
              {/* Image placeholder for Topic PYQ vs IQ comparison */}
              <div className="flex justify-center my-8">
                <ImageCard 
                  src="/images/Keywordmode PYQ vs IQ.png" 
                  alt="Comparison between UPSC PYQs and IntrepidQ-generated questions in Topic mode" 
                  caption="Keyword Mode: How IQ AI questions compare with actual UPSC PYQs" 
                />
              </div>
              
              <h2 className="text-xl font-bold mt-8 mb-4">Smart Customisation for Your Study Plan</h2>
              
              <p className="mb-4">
                Consistency is everything in UPSC preparation. With IntrepidQ, you can:
              </p>
              
              <ul className="list-disc pl-8 mb-4 space-y-2">
                <li><strong>Customise your timetable</strong> to balance revision and answer writing practice.</li>
                <li>Track progress by <strong>competing with your own past performance</strong>.</li>
                <li>Integrate IntrepidQ easily with <strong>self-study, coaching notes, or daily current affairs</strong>.</li>
              </ul>
              
              <p className="mb-4">
                Whether you are a coaching student, a self-study aspirant, or a stealth aspirant preparing from home—<strong>IntrepidQ adapts to your style.</strong>
              </p>
              
              {/* Image placeholder for Keyword PYQ vs IQ comparison */}
              <div className="flex justify-center my-8">
                <ImageCard 
                  src="/images/Topicmode PYQ vs IQ.png" 
                  alt="Comparison between UPSC PYQs and IntrepidQ-generated questions in Keyword mode" 
                  caption="Topic Mode: How IQ AI questions compare with actual UPSC PYQs" 
                />
              </div>
              
              <h2 className="text-xl font-bold mt-8 mb-4">Why IntrepidQ Matters for UPSC Aspirants</h2>
              
              <p className="mb-4">
                At the end of the day, <strong>UPSC Mains preparation</strong> is not about solving random questions. It's about:
              </p>
              
              <ul className="list-disc pl-8 mb-4 space-y-2">
                <li>Practicing <strong>exam-relevant questions</strong></li>
                <li>Developing <strong>clarity of thought and expression</strong></li>
                <li>Building <strong>consistency in answer writing</strong></li>
              </ul>
              
              <p className="mb-4">
                With IntrepidQ, you are not competing with vague test series—you are competing with yourself, improving day by day.
              </p>
              
              <blockquote className="border-l-4 border-orange-400 pl-4 italic my-6">
                <p className="mb-2"><strong>Believe in your preparation. Trust the process. Let IntrepidQ be your silent mentor on the road to UPSC success.</strong></p>
              </blockquote>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}