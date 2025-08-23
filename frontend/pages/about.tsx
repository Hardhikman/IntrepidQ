"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-r from-orange-50 to-blue-50 p-4 space-y-6">
      {/* Header - Paper Style */}
      <Card className="max-w-4xl mx-auto shadow-xl border-0">
        <CardHeader className="py-10 text-center bg-white">
          <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-gray-800 mb-6 leading-tight">
            IntrepidQ: A Minimalistic AI RAG System
            <br />
            that Curates Context-Aware Q&A
            <br />
            Designed to Make You Think
          </CardTitle>
          <div className="h-px bg-gray-300 w-24 mx-auto mb-6"></div>
          <p className="text-base md:text-lg text-gray-600 font-serif italic max-w-3xl mx-auto leading-relaxed">
            An intelligent retrieval-augmented generation platform for 
            UPSC Civil Services Examination preparation methodology
          </p>
          <p className="text-xs md:text-sm text-gray-500 font-serif mt-6">
            Research Paper
          </p>
        </CardHeader>
      </Card>

      {/* Main Content - Paper Style */}
      <Card className="max-w-4xl mx-auto shadow-xl border-0">
        <CardContent className="p-8 md:p-12 bg-white">
          
          {/* Abstract */}
          <div className="mb-10">
            <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
              Abstract
            </h2>
            <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
              <span className="inline-block w-8"></span>IntrepidQ represents a paradigm shift in competitive examination preparation through its 
              implementation of a minimalistic <span className="underline decoration-orange-500 decoration-2 font-medium">AI Retrieval-Augmented Generation (RAG) system</span>. This platform 
              curates <span className="underline decoration-blue-500 decoration-2 font-medium">context-aware questions</span> and answers specifically designed to stimulate <span className="underline decoration-green-500 decoration-2 font-medium">critical thinking</span> 
              for <span className="underline decoration-purple-500 decoration-2 font-medium">UPSC Civil Services Examination (CSE) Mains</span> preparation. By combining advanced <span className="underline decoration-red-500 decoration-2 font-medium">vector search 
              algorithms</span> with <span className="underline decoration-indigo-500 decoration-2 font-medium">large language models</span>, IntrepidQ retrieves relevant contextual information from 
              <span className="underline decoration-yellow-600 decoration-2 font-medium">Previous Year Questions (PYQ)</span> databases and generates cognitively challenging questions that 
              mirror contemporary examination patterns. The system's <span className="underline decoration-teal-500 decoration-2 font-medium">minimalistic approach</span> ensures focused, 
              distraction-free learning while maintaining sophisticated AI capabilities for optimal preparation efficiency.
            </p>
          </div>

          {/* Introduction */}
          <div className="mb-10">
            <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
              1. Introduction
            </h2>
            <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify mb-4">
              <span className="inline-block w-8"></span>The preparation landscape for <span className="underline decoration-orange-500 decoration-2 font-medium">competitive examinations</span>, particularly the <span className="underline decoration-purple-500 decoration-2 font-medium">UPSC Civil Services 
              Examination</span>, has remained largely static despite technological advances. Traditional <span className="underline decoration-red-500 decoration-2 font-medium">coaching 
              methodologies</span> often rely on outdated <span className="underline decoration-yellow-600 decoration-2 font-medium">question banks</span> that fail to reflect contemporary examination 
              patterns and thematic evolution.
            </p>
            <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
              <span className="inline-block w-8"></span>IntrepidQ emerges as a solution to this persistent challenge, employing <span className="underline decoration-blue-500 decoration-2 font-medium">cutting-edge AI 
              technologies</span> to democratize access to high-quality, <span className="underline decoration-green-500 decoration-2 font-medium">contextually aware practice questions</span>. 
              This platform represents the convergence of <span className="underline decoration-indigo-500 decoration-2 font-medium">pedagogical expertise</span> and <span className="underline decoration-teal-500 decoration-2 font-medium">technological innovation</span>, 
              designed specifically for the modern UPSC aspirant.
            </p>
          </div>

          {/* Methodology */}
          <div className="mb-10">
            <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
              2. Methodology & Architecture
            </h2>
            
            <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3 mt-6">
              2.1 Core Technology Stack
            </h3>
            <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify mb-4">
              <span className="inline-block w-8"></span>The platform is built upon a <span className="underline decoration-blue-500 decoration-2 font-medium">microservices architecture</span> utilizing <span className="underline decoration-green-500 decoration-2 font-medium">FastAPI</span> for backend 
              operations and <span className="underline decoration-orange-500 decoration-2 font-medium">Next.js</span> for frontend implementation. The AI engine leverages <span className="underline decoration-purple-500 decoration-2 font-medium">Groq's 
              high-performance language models</span>, integrated through <span className="underline decoration-red-500 decoration-2 font-medium">LangChain workflows</span> for optimal 
              question generation pipelines.
            </p>
            
            <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3 mt-6">
              2.2 Question Generation Process
            </h3>
            <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
              <span className="inline-block w-8"></span>The system employs a <span className="underline decoration-indigo-500 decoration-2 font-medium">three-stage process</span>: (i) <span className="underline decoration-teal-500 decoration-2 font-medium">contextual analysis</span> of Previous Year Questions 
              (PYQ) using <span className="underline decoration-yellow-600 decoration-2 font-medium">vector similarity search</span>, (ii) <span className="underline decoration-pink-500 decoration-2 font-medium">thematic pattern recognition</span> through advanced 
              <span className="underline decoration-cyan-500 decoration-2 font-medium">NLP algorithms</span>, and (iii) <span className="underline decoration-lime-500 decoration-2 font-medium">adaptive question synthesis</span> maintaining examination standards 
              while incorporating contemporary relevance.
            </p>
          </div>

          {/* Features & Capabilities */}
          <div className="mb-10">
            <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
              3. Features & Capabilities
            </h2>
            
            <div className="space-y-5">
              <div>
                <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3">
                  3.1 Intelligent Question Synthesis
                </h3>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                  <span className="inline-block w-8"></span>The platform generates questions through <span className="underline decoration-blue-500 decoration-2 font-medium">sophisticated AI models</span> trained on extensive 
                  <span className="underline decoration-purple-500 decoration-2 font-medium">UPSC question databases</span>, ensuring adherence to <span className="underline decoration-orange-500 decoration-2 font-medium">examination patterns</span> while maintaining 
                  <span className="underline decoration-green-500 decoration-2 font-medium">conceptual depth</span> and <span className="underline decoration-red-500 decoration-2 font-medium">analytical rigor</span>.
                </p>
              </div>
              
              <div>
                <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3">
                  3.2 Adaptive Learning Framework
                </h3>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                  <span className="inline-block w-8"></span>Users can select between <span className="underline decoration-indigo-500 decoration-2 font-medium">topic-specific generation</span> and <span className="underline decoration-teal-500 decoration-2 font-medium">comprehensive paper simulation</span>, 
                  allowing for <span className="underline decoration-yellow-600 decoration-2 font-medium">targeted preparation strategies</span> aligned with individual <span className="underline decoration-pink-500 decoration-2 font-medium">learning objectives</span> 
                  and examination timelines.
                </p>
              </div>
              
              <div>
                <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3">
                  3.3 Real-time Performance Analytics
                </h3>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                  <span className="inline-block w-8"></span>The system provides <span className="underline decoration-cyan-500 decoration-2 font-medium">comprehensive performance tracking</span> and <span className="underline decoration-lime-500 decoration-2 font-medium">analytical insights</span>, 
                  enabling users to monitor progress, identify <span className="underline decoration-rose-500 decoration-2 font-medium">knowledge gaps</span>, and optimize 
                  preparation strategies through <span className="underline decoration-violet-500 decoration-2 font-medium">data-driven approaches</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Implementation */}
          <div className="mb-10">
            <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
              4. Implementation & User Experience
            </h2>
            <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify mb-4">
              <span className="inline-block w-8"></span>The <span className="underline decoration-blue-500 decoration-2 font-medium">user interface</span> emphasizes simplicity and functionality, providing an <span className="underline decoration-green-500 decoration-2 font-medium">intuitive 
              workflow</span> that requires minimal technical expertise. The <span className="underline decoration-orange-500 decoration-2 font-medium">three-step process</span>—subject 
              selection, mode configuration, and question generation—ensures <span className="underline decoration-purple-500 decoration-2 font-medium">accessibility</span> while 
              maintaining sophisticated backend operations.
            </p>
            <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
              <span className="inline-block w-8"></span><span className="underline decoration-red-500 decoration-2 font-medium">Security measures</span> include <span className="underline decoration-indigo-500 decoration-2 font-medium">enterprise-grade authentication protocols</span> and <span className="underline decoration-teal-500 decoration-2 font-medium">data protection 
              standards</span>, ensuring user privacy and platform reliability throughout the preparation journey.
            </p>
          </div>

          {/* Conclusion */}
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-800 mb-4 border-b-2 border-gray-200 pb-2">
              5. Conclusion
            </h2>
            <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
              <span className="inline-block w-8"></span>IntrepidQ represents a <span className="underline decoration-yellow-600 decoration-2 font-medium">significant advancement</span> in competitive examination preparation 
              technology. By combining <span className="underline decoration-pink-500 decoration-2 font-medium">artificial intelligence</span> with <span className="underline decoration-cyan-500 decoration-2 font-medium">pedagogical expertise</span>, the platform 
              offers a <span className="underline decoration-lime-500 decoration-2 font-medium">transformative approach</span> to UPSC CSE Mains preparation, addressing both the 
              quality and accessibility challenges inherent in traditional methodologies. <span className="underline decoration-rose-500 decoration-2 font-medium">Future 
              developments</span> will focus on expanded subject coverage, enhanced AI capabilities, and 
              deeper integration of <span className="underline decoration-violet-500 decoration-2 font-medium">performance analytics</span> to further optimize learning outcomes.
            </p>
          </div>

          {/* Call to Action - Academic Style */}
          <div className="text-center bg-gray-50 border-2 border-gray-200 rounded-lg p-6 md:p-8 mt-10">
            <h3 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-4">
              Begin Your Enhanced Preparation Journey
            </h3>
            <p className="text-sm md:text-base text-gray-600 font-serif mb-6 max-w-2xl mx-auto leading-relaxed">
              Experience the future of UPSC preparation through scientifically-designed, 
              AI-powered question generation tailored to contemporary examination standards.
            </p>
            <Button 
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-orange-600 to-blue-600 hover:from-orange-700 hover:to-blue-700 text-white font-serif px-6 md:px-8 py-2 md:py-3 text-sm md:text-base"
            >
              Access Platform →
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}