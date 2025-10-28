"use client";
import React from "react";
import { Button } from "./ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "./ui/select";
import { Slider } from "./ui/slider";
import { Loader2 } from "lucide-react";
import { TopicCombobox } from "./combobox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Subject {
  name: string;
  topics: string[];
}

interface QuestionGeneratorProps {
  subjects: Record<string, Subject>;
  selectedSubject: string;
  selectedTopic: string;
  setSelectedTopic: (val: string) => void;
  handleSubjectChange: (val: string) => void;
  subjectsLoading: boolean;

  numQuestions: number;
  setNumQuestions: (val: number) => void;

  useCurrentAffairs: boolean;
  setUseCurrentAffairs: (val: boolean) => void;

  selectedModel: string;
  setSelectedModel: (val: string) => void;

  isGenerateDisabled: boolean;
  loading: boolean;
  onGenerate: () => void;
  mode: "topic" | "keyword" | "paper" | "currentAffairs";
  dailyLimitReached?: boolean;
  
  // NEW: Keyword query props for mutually exclusive keyword mode
  keywordQuery: string;
  setKeywordQuery: (val: string) => void;
  onGenerateFromKeywords: () => void;
  // Models prop
  models: { id: string; name: string }[];
  
  // NEW: News source selection
  newsSource: string;
  setNewsSource: (val: string) => void;
  
  // NEW: Keywords for current affairs mode
  fetchedKeywords: string[];
  selectedKeyword: string;
  setSelectedKeyword: (val: string) => void;
}

export const QuestionGenerator: React.FC<QuestionGeneratorProps> = ({
  subjects,
  selectedSubject,
  selectedTopic,
  setSelectedTopic,
  handleSubjectChange,
  subjectsLoading,
  numQuestions,
  setNumQuestions,
  useCurrentAffairs,
  setUseCurrentAffairs,
  selectedModel,
  setSelectedModel,
  isGenerateDisabled,
  loading,
  onGenerate,
  mode,
  dailyLimitReached = false,
  // NEW: Keyword query props
  keywordQuery,
  setKeywordQuery,
  onGenerateFromKeywords,
  // Models prop
  models,
  // NEW: News source props
  newsSource,
  setNewsSource,
  // NEW: Keywords for current affairs mode
  fetchedKeywords,
  selectedKeyword,
  setSelectedKeyword,
}) => {
  return (
    <TooltipProvider delayDuration={0}>
      <section className="bg-card rounded-xl shadow-md border border-border">
        <div className={cn(
          "flex flex-wrap gap-2 sm:gap-3 p-3 items-center",
          mode === "paper" 
            ? "justify-center" 
            : "justify-center sm:justify-start"
        )}>

          {/* GS Paper dropdown - Made responsive */}
          <Select
            value={selectedSubject}
            onValueChange={handleSubjectChange}
            disabled={subjectsLoading}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectTrigger className="h-10 w-32 sm:w-36 bg-gradient-to-r from-orange-600 to-orange-700 text-white border-0 rounded-lg text-sm shadow hover:from-orange-700 hover:to-orange-800">
                  <SelectValue placeholder="Select GS" />
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent><p>GS Paper</p></TooltipContent>
            </Tooltip>
            <SelectContent>
              <SelectItem value="GS1">📚 GS1</SelectItem>
              <SelectItem value="GS2">🏛️ GS2</SelectItem>
              <SelectItem value="GS3">🔬 GS3</SelectItem>
              <SelectItem value="GS4">⚖️ GS4</SelectItem>
            </SelectContent>
          </Select>

          {/* AI Model Selector - Made responsive */}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectTrigger className="h-10 w-36 sm:w-44 bg-gradient-to-r from-orange-600 to-orange-700 text-white border-0 rounded-lg text-sm shadow hover:from-orange-700 hover:to-orange-800">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent><p>AI Model</p></TooltipContent>
            </Tooltip>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Topic Combobox - Made responsive - only shown when in topic mode */}
          {(mode === "topic" || mode === "currentAffairs") && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-56 sm:w-72">
                  <TopicCombobox
                    items={subjects[selectedSubject]?.topics || []}
                    value={selectedTopic}
                    onChange={setSelectedTopic}
                    placeholder={
                      subjectsLoading ? "Loading..." : `Select Topic`
                    }
                    disabled={
                      subjectsLoading ||
                      !subjects[selectedSubject]?.topics?.length
                    }
                    className="w-full text-sm"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent><p>GS Topics</p></TooltipContent>
            </Tooltip>
          )}

          {/* Keyword selection dropdown - only shown when in current affairs mode and keywords are available */}
          {mode === "currentAffairs" && fetchedKeywords.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-56 sm:w-72">
                  <TopicCombobox
                    items={fetchedKeywords}
                    value={selectedKeyword}
                    onChange={setSelectedKeyword}
                    placeholder="Select or search keywords..."
                    className="w-full text-sm"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent><p>Select Keyword for Current Affairs Search</p></TooltipContent>
            </Tooltip>
          )}

          {/* Keyword input field - only shown when in keyword mode */}
          {mode === "keyword" && (
            <div className="w-56 sm:w-72 bg-background border border-input rounded-lg">
              <input
                type="text"
                placeholder="Enter a keyword"
                value={keywordQuery}
                onChange={(e) => setKeywordQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border-0 bg-transparent focus:ring-0 text-foreground"
                disabled={loading || dailyLimitReached}
              />
            </div>
          )}

          {/* Current Affairs Toggle - Made responsive - only shown in paper mode */}
          {/* Removed this section to disable current affairs in paper mode */}

          {/* News Source Selector - only shown when current affairs is enabled */}
          {mode === "currentAffairs" && (
            <Select value={newsSource} onValueChange={setNewsSource}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SelectTrigger className="h-10 w-36 bg-gradient-to-r from-orange-600 to-orange-700 text-white border-0 rounded-lg text-sm shadow hover:from-orange-700 hover:to-orange-800">
                    <SelectValue placeholder="News Source" />
                  </SelectTrigger>
                </TooltipTrigger>
                <TooltipContent><p>Select News Source</p></TooltipContent>
              </Tooltip>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="indianexpress">Indian Express</SelectItem>
                <SelectItem value="thehindu">The Hindu</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Slider - Made responsive */}
          {(mode === "topic" || mode === "keyword" || mode === "currentAffairs") && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer">
                  <span className="text-foreground font-semibold text-sm">How many?</span>
                  <span className="text-foreground font-semibold text-sm">
                    {numQuestions}
                  </span>
                  <div className="w-20 sm:w-24">
                    <Slider
                      min={1}
                      max={3}
                      step={1}
                      value={[numQuestions]}
                      onValueChange={(v) => setNumQuestions(v[0])}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent><p>Number of Questions</p></TooltipContent>
            </Tooltip>
          )}

          {/* Generate Button - Made responsive */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={mode === "keyword" ? onGenerateFromKeywords : onGenerate}
                disabled={isGenerateDisabled || (mode === "keyword" ? !keywordQuery.trim() : false)}
                className={`h-10 w-12 rounded-full text-white shadow text-base flex 
                           items-center justify-center transition-all duration-300 transform hover:scale-110 ${
                  dailyLimitReached 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : mode === "keyword"
                      ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
                      : mode === "currentAffairs"
                        ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
                        : 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
                }`}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : dailyLimitReached ? (
                  "🚫"
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{dailyLimitReached ? "Daily Limit Reached" : mode === "keyword" ? "Generate from Keywords" : mode === "currentAffairs" ? "Generate with Current Affairs" : "Send Request"}</p>
            </TooltipContent>
          </Tooltip>
          
        </div>
      </section>
    </TooltipProvider>
  );
};