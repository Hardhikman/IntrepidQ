"use client";

import { QuestionDisplay } from "./QuestionDisplay";
import { GeneratedQuestion } from "@/lib/supabase";
import { Card, CardContent } from "./ui/card";

interface ChatWindowProps {
  questions: GeneratedQuestion[];
  answers: Record<number, any>;
  loading: boolean;
  onGenerateAnswer?: (index: number, question: string) => void;
  answerLoadingIndex?: number | null;   // ✅ this is the active index
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  questions,
  answers,
  loading,
  onGenerateAnswer,
  answerLoadingIndex,
}) => {
  // Collect context and news from all questions (use the first one that has them)
  let context: string[] = [];
  let newsContent = "";
  let meta: any = {};
  
  // Find the first question that has context or news content
  for (const q of questions) {
    const qContext = (q as any).context || [];
    const qMeta = (q as any).meta || {};
    const qNewsContent = qMeta.news_content || "";
    
    if (qContext.length > 0 || qNewsContent) {
      context = qContext;
      meta = qMeta;
      newsContent = qNewsContent;
      break;
    }
  }

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-200 shadow-lg p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
      <h3 className="mb-4 sm:mb-6 text-lg sm:text-xl font-bold text-gray-900 border-b pb-2">📄 Context-Aware questions</h3>
      <div className="space-y-6">
        {questions.map((q, i) => (
          <QuestionDisplay
            key={q.id || i}
            question={q}
            answer={answers[i]}
            index={i}
            onGenerateAnswer={onGenerateAnswer}
            loadingAnswer={answerLoadingIndex}   // ✅ pass the actual index
          />
        ))}

        {loading && (
          <div className="flex gap-2 sm:gap-3 items-start ml-8 sm:ml-10 animate-pulse">
            <div className="rounded-full bg-gradient-to-r from-blue-500 to-orange-500 text-white w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center font-bold text-base sm:text-lg">
              IQ.ai
            </div>
            <div className="bg-blue-50 border border-blue-200 px-2 py-1 sm:px-3 sm:py-2 rounded-lg max-w-[80%] text-xs sm:text-sm italic text-gray-600">
              💭 Generating insights...
            </div>
          </div>
        )}
        
        {/* Context Information - Show retrieved documents at the end of all questions */}
        {context && context.length > 0 && (
          <div className="mt-6">
            <Card className="bg-blue-50 border border-blue-200">
              <CardContent className="p-3">
                <h4 className="font-bold text-blue-800 mb-2 text-sm sm:text-base flex items-center">
                  <span className="mr-2">📚</span> Context Documents(PYQ)
                </h4>
                <div className="space-y-2">
                  {context.map((doc: string, idx: number) => (
                    <div key={idx} className="text-xs sm:text-sm bg-white p-2 rounded border border-blue-100">
                      <p className="text-gray-700">{doc}</p>
                    </div>
                  ))}
                </div>
                {meta && (
                  <div className="mt-2 text-xs text-gray-500">
                    <span>Cached examples: {meta.cached_examples || 0}</span>
                    {meta.news_included && (
                      <span className="ml-2">📰 News included ({meta.news_content_length || 0} chars)</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* News Content - Show news used for current affairs questions at the end of all questions */}
        {newsContent && (
          <div className="mt-4">
            <Card className="bg-green-50 border border-green-200">
              <CardContent className="p-3">
                <h4 className="font-bold text-green-800 mb-2 text-sm sm:text-base flex items-center">
                  <span className="mr-2">📰</span> News Contents
                </h4>
                <div className="text-xs sm:text-sm bg-white p-2 rounded border border-green-100">
                  <p className="text-gray-700 whitespace-pre-wrap">{newsContent}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};