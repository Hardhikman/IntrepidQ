"use client";

import { GeneratedQuestion } from "@/lib/supabase";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";

// Dynamically import mermaid only on client side
let mermaid: any;
if (typeof window !== "undefined") {
  import("mermaid").then((module) => {
    mermaid = module.default;
    mermaid.initialize({ 
      startOnLoad: false,
      theme: 'default',
      themeVariables: {
        primaryTextColor: '#000000',
        textColor: '#000000',
        darkTextColor: '#000000'
      }
    });
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
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<"text" | "diagram">("text");
  const diagramRef = useRef<HTMLDivElement>(null);
  
  const isAnyLoading = loadingAnswer !== null;         // true if some answer is generating
  const isThisLoading = loadingAnswer === index;       // true if THIS question is generating

  // Convert answer to mermaid diagram format
  const convertToMermaid = (answer: any): string => {
    if (!answer) return "";
    
    // Clean text by removing literal "\n" characters
    const cleanText = (text: string) => {
      if (!text) return "";
      return text
        .replace(/\\n/g, " ") // Replace literal "\n" with spaces
        .trim();
    };
    
    // Escape text for mermaid syntax
    const escapeForMermaid = (text: string) => {
      if (!text) return "";
      return text
        .replace(/"/g, '\\"') // Escape quotes
        .replace(/\n/g, '\\n') // Escape actual newlines
        .replace(/</g, '&lt;') // Escape HTML characters
        .replace(/>/g, '&gt;')
        .replace(/&/g, '&amp;');
    };
    
    const intro = cleanText(answer.introduction) || "";
    const bodyItems = answer.body || [];
    const conclusion = cleanText(answer.conclusion) || "";
    
    // Create a mindmap structure
    let diagram = `mindmap\n`;
    diagram += `  root["${escapeForMermaid(question.question)}"]\n`;
    
    if (intro) {
      diagram += `    intro["Introduction:\\n${escapeForMermaid(intro)}"]\n`;
    }
    
    if (bodyItems.length > 0) {
      diagram += `    body["Key Points"]\n`;
      bodyItems.forEach((item: string, i: number) => {
        // Clean and escape each body item
        const cleanItem = cleanText(item);
        diagram += `      point${i}["${escapeForMermaid(cleanItem)}"]\n`;
      });
    }
    
    if (conclusion) {
      diagram += `    conclusion["Conclusion:\\n${escapeForMermaid(conclusion)}"]\n`;
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

  // Re-render diagram when view mode, answer, or theme changes
  useEffect(() => {
    if (viewMode === "diagram" && answer) {
      renderDiagram();
    }
  }, [viewMode, answer, index, theme]);

  return (
    <div className="space-y-4 mb-6">
      {/* User bubble - Made responsive */}
      <div className="flex gap-2 sm:gap-3 items-start">
        <div className="rounded-full bg-gradient-to-r from-blue-500 to-orange-500 text-white w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center font-bold text-base sm:text-lg">
          IQ.ai
        </div>
        <div className="bg-muted border border-border p-2 sm:p-3 rounded-lg max-w-[85%] sm:max-w-[80%]">
          {question.thinking && (
            <p className="text-xs text-muted-foreground italic mb-1 sm:mb-2 select-none">
              💭 {question.thinking}
            </p>
          )}
          <p className="whitespace-pre-wrap font-medium text-foreground select-none text-sm sm:text-base" style={{ fontFamily: "'Inter', sans-serif" }}>
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
          <div className="bg-muted border border-border p-2 sm:p-3 rounded-lg max-w-[85%] sm:max-w-[80%]">
            {/* View mode toggle buttons */}
            <div className="flex gap-2 mb-2">
              <button
                className={`px-3 py-1 text-xs rounded ${viewMode === "text" ? "bg-primary text-primary-foreground" : "bg-muted-foreground text-muted"}`}
                onClick={() => setViewMode("text")}
              >
                Text View
              </button>
              <button
                className={`px-3 py-1 text-xs rounded ${viewMode === "diagram" ? "bg-primary text-primary-foreground" : "bg-muted-foreground text-muted"}`}
                onClick={() => setViewMode("diagram")}
              >
                Diagram View
              </button>
            </div>

            {viewMode === "text" ? (
              <>
                <h4 className="font-bold mb-1 sm:mb-2 text-sm sm:text-base text-foreground">Answer:</h4>
                <p className="mb-1 sm:mb-2 text-sm text-foreground">
                  <strong>Introduction:</strong> {answer.introduction}
                </p>
                <div className="mb-1 sm:mb-2">
                  <strong className="text-foreground">Body:</strong>
                  <ul className="list-disc pl-4 sm:pl-5 text-sm text-foreground">
                    {answer.body?.map((pt: string, i: number) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-sm text-foreground">
                  <strong>Conclusion:</strong> {answer.conclusion}
                </p>
              </>
            ) : (
              <div>
                <h4 className="font-bold mb-1 sm:mb-2 text-sm sm:text-base text-foreground">Answer Diagram:</h4>
                <div ref={diagramRef} className="mermaid-diagram-container overflow-auto max-h-96 border border-border rounded-lg p-4 bg-background" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="ml-7 sm:ml-10">
          {onGenerateAnswer && (
            <Button
              className="bg-primary text-primary-foreground text-xs sm:text-sm h-8 sm:h-10"
              onClick={() => onGenerateAnswer(index, question.question)}
              disabled={isAnyLoading} // ✅ disables all if one is generating
            >
              {isThisLoading ? "Generating..." : "Generate brainstorming ideas"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};