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
  mode: "topic" | "keyword" | "paper";
  dailyLimitReached?: boolean;
  
  // NEW: Keyword query props for mutually exclusive keyword mode
  keywordQuery: string;
  setKeywordQuery: (val: string) => void;
  onGenerateFromKeywords: () => void;
  // Models prop
  models: { id: string; name: string }[];
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
}) => {
  return (
    <TooltipProvider delayDuration={0}>
      <section className="bg-white rounded-xl shadow-md border border-gray-200">
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
                <SelectTrigger className="h-10 w-32 sm:w-36 bg-orange-50 border border-orange-300 rounded-lg text-sm">
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
                <SelectTrigger className="h-10 w-36 sm:w-44 bg-blue-50 border border-blue-300 rounded-lg text-sm">
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
          {mode === "topic" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-56 sm:w-72 bg-orange-50 border border-orange-300 rounded-lg">
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

          {/* Keyword input field - only shown when in keyword mode */}
          {mode === "keyword" && (
            <div className="w-56 sm:w-72 bg-purple-50 border border-purple-300 rounded-lg">
              <input
                type="text"
                placeholder="Enter a keyword"
                value={keywordQuery}
                onChange={(e) => setKeywordQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border-0 bg-transparent focus:ring-0"
                disabled={loading || dailyLimitReached}
              />
            </div>
          )}

          {/* Current Affairs Toggle - Made responsive */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-2">
                <Switch
                  id="useCurrentAffairs"
                  checked={useCurrentAffairs}
                  onCheckedChange={setUseCurrentAffairs}
                />
                <Label
                  htmlFor="useCurrentAffairs"
                  className="text-xs font-medium text-gray-700 cursor-pointer"
                >
                  📰 CA
                </Label>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Include Current Affairs (6 months)</p>
            </TooltipContent>
          </Tooltip>

          {/* Slider - Made responsive */}
          {(mode === "topic" || mode === "keyword") && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer">
                  <span className="text-gray-700 text-xs">#</span>
                  <span className="text-gray-800 font-semibold text-sm">
                    {numQuestions}
                  </span>
                  <div className="w-20 sm:w-24">
                    <Slider
                      min={1}
                      max={10}
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
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : mode === "keyword"
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600'
                      : 'bg-gradient-to-r from-orange-500 to-blue-500 hover:from-orange-600 hover:to-blue-600'
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
              <p>{dailyLimitReached ? "Daily Limit Reached" : mode === "keyword" ? "Generate from Keywords" : "Send Request"}</p>
            </TooltipContent>
          </Tooltip>
          
        </div>
      </section>
    </TooltipProvider>
  );
};
