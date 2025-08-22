"use client";

import { QuestionDisplay } from "./QuestionDisplay";
import { GeneratedQuestion } from "@/lib/supabase";

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
  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-200 shadow-lg p-6 max-h-[70vh] overflow-y-auto">
      <h3 className="mb-6 text-xl font-bold text-gray-900 border-b pb-2">📄 Generated Q&A</h3>
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
          <div className="flex gap-3 items-start ml-10 animate-pulse">
            <div className="rounded-full bg-blue-600 text-white w-8 h-8 flex items-center justify-center font-bold">
              AI
            </div>
            <div className="bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg max-w-[80%] text-sm italic text-gray-600">
              💭 Thinking...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};