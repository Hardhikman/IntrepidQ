"use client";

import { GeneratedQuestion } from "@/lib/supabase";
import { Button } from "./ui/button";

interface QuestionDisplayProps {
  question: GeneratedQuestion;
  answer: any;
  index: number;
  onGenerateAnswer?: (index: number, question: string) => void;
  loadingAnswer?: number | null;  // ✅ becomes index or null
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  answer,
  index,
  onGenerateAnswer,
  loadingAnswer,
}) => {
  const isAnyLoading = loadingAnswer !== null;         // true if some answer is generating
  const isThisLoading = loadingAnswer === index;       // true if THIS question is generating

  return (
    <div className="space-y-4 mb-6">
      {/* User bubble */}
      <div className="flex gap-3 items-start">
        <div className="rounded-full bg-orange-500 text-white w-8 h-8 flex items-center justify-center font-bold">
          U
        </div>
        <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg max-w-[80%]">
          {question.thinking && (
            <p className="text-xs text-gray-500 italic mb-2 select-none">
              💭 {question.thinking}
            </p>
          )}
          <p className="whitespace-pre-wrap font-medium text-gray-900 select-none">
            Q{index + 1}: {question.question}
          </p>
        </div>
      </div>

      {/* AI Answer bubble or inline Generate button */}
      {answer ? (
        <div className="flex gap-3 items-start ml-10">
          <div className="rounded-full bg-blue-600 text-white w-8 h-8 flex items-center justify-center font-bold">
            AI
          </div>
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg max-w-[80%]">
            <h4 className="font-bold mb-2">Answer:</h4>
            <p className="mb-2">
              <strong>Introduction:</strong> {answer.introduction}
            </p>
            <div className="mb-2">
              <strong>Body:</strong>
              <ul className="list-disc pl-5">
                {answer.body?.map((pt: string, i: number) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
            <p>
              <strong>Conclusion:</strong> {answer.conclusion}
            </p>
          </div>
        </div>
      ) : (
        <div className="ml-10">
          {onGenerateAnswer && (
            <Button
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm"
              onClick={() => onGenerateAnswer(index, question.question)}
              disabled={isAnyLoading} // ✅ disables all if one is generating
            >
              {isThisLoading ? "Generating..." : "Generate Answer"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};