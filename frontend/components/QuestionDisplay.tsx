"use client";

import { GeneratedQuestion } from "@/lib/supabase";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { useState, useEffect, useRef } from "react";

// Dynamically import mermaid only on client side
let mermaid: any;
if (typeof window !== "undefined") {
  import("mermaid").then((module) => {
    mermaid = module.default;
    mermaid.initialize({ startOnLoad: false });
  });
}

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
  const [viewMode, setViewMode] = useState<"text" | "diagram">("text");
  const diagramRef = useRef<HTMLDivElement>(null);
  
  const isAnyLoading = loadingAnswer !== null;         // true if some answer is generating
  const isThisLoading = loadingAnswer === index;       // true if THIS question is generating

  // Convert answer to mermaid diagram format
  const convertToMermaid = (answer: any): string => {
    if (!answer) return "";
    
    const intro = answer.introduction || "";
    const bodyItems = answer.body || [];
    const conclusion = answer.conclusion || "";
    
    // Create a mindmap structure
    let diagram = `mindmap\n`;
    diagram += `  root["${question.question}"]\n`;
    
    if (intro) {
      diagram += `    intro["Introduction:\\n${intro}"]\n`;
    }
    
    if (bodyItems.length > 0) {
      diagram += `    body["Key Points"]\n`;
      bodyItems.forEach((item: string, i: number) => {
        diagram += `      point${i}["${item}"]\n`;
      });
    }
    
    if (conclusion) {
      diagram += `    conclusion["Conclusion:\\n${conclusion}"]\n`;
    }
    
    return diagram;
  };

  // Render mermaid diagram
  const renderDiagram = async () => {
    if (viewMode === "diagram" && diagramRef.current && mermaid && answer) {
      try {
        const diagramDefinition = convertToMermaid(answer);
        const { svg, bindFunctions } = await mermaid.render(
          `mermaid-diagram-${index}`,
          diagramDefinition
        );
        if (diagramRef.current) {
          diagramRef.current.innerHTML = svg;
          if (bindFunctions) bindFunctions(diagramRef.current);
        }
      } catch (error) {
        console.error("Error rendering Mermaid diagram:", error);
        if (diagramRef.current) {
          diagramRef.current.innerHTML = `<p>Error rendering diagram</p>`;
        }
      }
    }
  };

  // Re-render diagram when view mode or answer changes
  useEffect(() => {
    if (viewMode === "diagram" && answer) {
      renderDiagram();
    }
  }, [viewMode, answer, index]);

  return (
    <div className="space-y-4 mb-6">
      {/* User bubble - Made responsive */}
      <div className="flex gap-2 sm:gap-3 items-start">
        <div className="rounded-full bg-gradient-to-r from-blue-500 to-orange-500 text-white w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center font-bold text-base sm:text-lg">
          IQ.ai
        </div>
        <div className="bg-blue-50 border border-blue-200 p-2 sm:p-3 rounded-lg max-w-[85%] sm:max-w-[80%]">
          {question.thinking && (
            <p className="text-xs text-blue-500 italic mb-1 sm:mb-2 select-none">
              💭 {question.thinking}
            </p>
          )}
          <p className="whitespace-pre-wrap font-medium text-gray-900 select-none text-sm sm:text-base" style={{ fontFamily: "'Inter', sans-serif" }}>
            Q{index + 1}: {question.question}
          </p>
        </div>
      </div>

      {/* AI Answer bubble or inline Generate button - Made responsive */}
      {answer ? (
        <div className="flex gap-2 sm:gap-3 items-start ml-7 sm:ml-10">
          <div className="rounded-full bg-gradient-to-r from-blue-500 to-orange-500 text-white w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center font-bold text-base sm:text-lg">
            IQ.ai
          </div>
          <div className="bg-blue-50 border border-blue-200 p-2 sm:p-3 rounded-lg max-w-[85%] sm:max-w-[80%]">
            {/* View mode toggle buttons */}
            <div className="flex gap-2 mb-2">
              <button
                className={`px-3 py-1 text-xs rounded ${viewMode === "text" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}
                onClick={() => setViewMode("text")}
              >
                Text View
              </button>
              <button
                className={`px-3 py-1 text-xs rounded ${viewMode === "diagram" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}
                onClick={() => setViewMode("diagram")}
              >
                Diagram View
              </button>
            </div>

            {viewMode === "text" ? (
              <>
                <h4 className="font-bold mb-1 sm:mb-2 text-sm sm:text-base text-blue-800">Answer:</h4>
                <p className="mb-1 sm:mb-2 text-sm">
                  <strong>Introduction:</strong> {answer.introduction}
                </p>
                <div className="mb-1 sm:mb-2">
                  <strong>Body:</strong>
                  <ul className="list-disc pl-4 sm:pl-5 text-sm">
                    {answer.body?.map((pt: string, i: number) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-sm">
                  <strong>Conclusion:</strong> {answer.conclusion}
                </p>
              </>
            ) : (
              <div>
                <h4 className="font-bold mb-1 sm:mb-2 text-sm sm:text-base text-blue-800">Answer Diagram:</h4>
                <div ref={diagramRef} className="mermaid-diagram-container overflow-auto max-h-96" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="ml-7 sm:ml-10">
          {onGenerateAnswer && (
            <Button
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs sm:text-sm h-8 sm:h-10"
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