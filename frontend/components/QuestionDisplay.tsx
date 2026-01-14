"use client";

import { GeneratedQuestion } from "@/lib/supabase";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";

interface QuestionDisplayProps {
  question: GeneratedQuestion;
  answer: any;
  index: number;
  onGenerateAnswer?: (index: number, question: string) => void;
  loadingAnswer?: number | null;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  answer,
  index,
  onGenerateAnswer,
  loadingAnswer,
}) => {
  const { theme, resolvedTheme } = useTheme();
  const [viewMode, setViewMode] = useState<"text" | "diagram">("text");
  const diagramRef = useRef<HTMLDivElement>(null);
  const [mermaidLoaded, setMermaidLoaded] = useState(false);
  const [mermaidError, setMermaidError] = useState<string | null>(null);
  const mermaidRef = useRef<any>(null);
  const renderIdRef = useRef(0);

  const isAnyLoading = loadingAnswer !== null;
  const isThisLoading = loadingAnswer === index;

  // Initialize mermaid on mount
  useEffect(() => {
    const loadMermaid = async () => {
      try {
        const module = await import("mermaid");
        mermaidRef.current = module.default;
        setMermaidLoaded(true);
      } catch (error) {
        console.error("Failed to load Mermaid:", error);
        setMermaidError("Failed to load diagram library");
      }
    };

    if (typeof window !== "undefined" && !mermaidRef.current) {
      loadMermaid();
    }
  }, []);

  // Configure mermaid when theme changes
  useEffect(() => {
    if (mermaidRef.current && mermaidLoaded) {
      const isDark = resolvedTheme === 'dark';
      mermaidRef.current.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        themeVariables: isDark ? {
          primaryTextColor: '#e5e5e5',
          textColor: '#e5e5e5',
          lineColor: '#888888',
          fontSize: '14px',
          nodeBkg: '#1e1e1e',
          nodeBorder: '#444444',
          mainBkg: '#1e1e1e',
          background: '#0a0a0a',
        } : {
          primaryTextColor: '#333333',
          textColor: '#333333',
          lineColor: '#666666',
          fontSize: '14px',
          nodeBkg: '#ffffff',
          nodeBorder: '#666666',
          mainBkg: '#ffffff',
          background: '#ffffff',
        },
        mindmap: {
          useMaxWidth: true,
          padding: 20,
        }
      });
    }
  }, [resolvedTheme, mermaidLoaded]);

  // Truncate text for diagram nodes
  const truncateText = (text: string, maxLen: number = 80): string => {
    if (!text) return "";
    const clean = text.replace(/[\n\r]+/g, " ").replace(/\s+/g, " ").trim();
    return clean.length > maxLen ? clean.substring(0, maxLen) + "..." : clean;
  };

  // Escape text for mermaid syntax
  const escapeForMermaid = (text: string): string => {
    if (!text) return "";
    return text
      .replace(/"/g, "'")
      .replace(/[<>]/g, "")
      .replace(/[{}]/g, "")
      .replace(/[#$]/g, "")
      .replace(/[\[\]]/g, "")
      .replace(/[()]/g, "");
  };

  // Convert answer to mermaid diagram format
  const convertToMermaid = useCallback((answer: any): string => {
    if (!answer) return "";

    const questionText = truncateText(escapeForMermaid(question.question), 50);
    const intro = truncateText(escapeForMermaid(answer.introduction), 60);
    const bodyItems = answer.body || [];
    const conclusion = truncateText(escapeForMermaid(answer.conclusion), 60);

    // Use flowchart for better compatibility
    let diagram = `flowchart TD\n`;
    diagram += `  Q["${questionText}"]\n`;

    if (intro) {
      diagram += `  I["Intro: ${intro}"]\n`;
      diagram += `  Q --> I\n`;
    }

    if (bodyItems.length > 0) {
      diagram += `  B["Key Points"]\n`;
      diagram += `  ${intro ? 'I' : 'Q'} --> B\n`;

      bodyItems.slice(0, 5).forEach((item: string, i: number) => {
        const cleanItem = truncateText(escapeForMermaid(item), 50);
        if (cleanItem) {
          diagram += `  P${i}["${i + 1}. ${cleanItem}"]\n`;
          diagram += `  B --> P${i}\n`;
        }
      });
    }

    if (conclusion) {
      diagram += `  C["Conclusion: ${conclusion}"]\n`;
      diagram += `  ${bodyItems.length > 0 ? 'B' : (intro ? 'I' : 'Q')} --> C\n`;
    }

    return diagram;
  }, [question.question]);

  // Render mermaid diagram
  const renderDiagram = useCallback(async () => {
    if (!diagramRef.current || !mermaidRef.current || !answer) return;

    try {
      renderIdRef.current += 1;
      const diagramDefinition = convertToMermaid(answer);
      const uniqueId = `mermaid-${index}-${Date.now()}-${renderIdRef.current}`;

      const { svg } = await mermaidRef.current.render(uniqueId, diagramDefinition);

      if (diagramRef.current) {
        diagramRef.current.innerHTML = svg;
      }
    } catch (error: any) {
      console.error("Error rendering Mermaid diagram:", error);
      if (diagramRef.current) {
        diagramRef.current.innerHTML = `<div class="text-red-500 p-4">
          <p class="font-bold">Diagram rendering failed</p>
          <p class="text-sm mt-2">The answer content may contain characters that cannot be displayed in diagram form.</p>
        </div>`;
      }
    }
  }, [answer, index, convertToMermaid]);

  // Re-render diagram when view mode, answer, or theme changes
  useEffect(() => {
    if (viewMode === "diagram" && answer && mermaidLoaded) {
      // Add a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        renderDiagram();
      }, 100);
      return () => clearTimeout(timer);
    } else if (viewMode === "diagram" && diagramRef.current && !answer) {
      // Clear diagram when there's no answer
      diagramRef.current.innerHTML = '<div class="text-gray-500 p-4">No answer to display as diagram</div>';
    }
  }, [viewMode, answer, index, resolvedTheme, mermaidLoaded, renderDiagram]);

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
                <div ref={diagramRef} className="mermaid-diagram-container overflow-auto max-h-96 border border-border rounded-lg p-4 bg-background">
                  {mermaidLoaded ? (
                    <div className="text-gray-500">Loading diagram...</div>
                  ) : mermaidError ? (
                    <div className="text-yellow-700 p-4">
                      <p>Mermaid library failed to load.</p>
                      <p className="text-sm mt-2">{mermaidError}</p>
                    </div>
                  ) : (
                    <div className="text-gray-500">Initializing diagram library...</div>
                  )}
                </div>
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