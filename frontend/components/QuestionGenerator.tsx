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
  mode: "topic" | "paper";
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
}) => {
  return (
    <TooltipProvider delayDuration={0}>
      <section className="bg-white rounded-xl shadow-md border border-gray-200">
        <div className="flex flex-wrap gap-3 p-3 items-center">

          {/* GS Paper dropdown */}
          <Select
            value={selectedSubject}
            onValueChange={handleSubjectChange}
            disabled={subjectsLoading}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectTrigger className="h-10 w-36 bg-orange-50 border border-orange-300 rounded-lg text-sm">
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

          {/* AI Model Selector */}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectTrigger className="h-10 w-44 bg-blue-50 border border-blue-300 rounded-lg text-sm">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent><p>AI Model</p></TooltipContent>
            </Tooltip>
            <SelectContent>
              <SelectItem value="llama3-70b">Llama3 (70B)</SelectItem>
              <SelectItem value="deepseek-r1">DeepSeek (R1)</SelectItem>
              <SelectItem value="deepseek-v3">DeepSeek (V3)</SelectItem>
              <SelectItem value="moonshot-k2">Moonshot (K2)</SelectItem>
              <SelectItem value="gemma2-9b">Gemma2 (9B)</SelectItem>
            </SelectContent>
          </Select>

          {/* Topic Combobox */}
          {mode === "topic" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-72 bg-orange-50 border border-orange-300 rounded-lg">
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

          {/* Current Affairs Toggle */}
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

          {/* Slider */}
          {mode === "topic" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer">
                  <span className="text-gray-700 text-xs">#</span>
                  <span className="text-gray-800 font-semibold text-sm">
                    {numQuestions}
                  </span>
                  <div className="w-24">
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

          {/* Generate Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onGenerate}
                disabled={isGenerateDisabled}
                className="h-10 w-12 rounded-full bg-gradient-to-r from-orange-500 to-blue-500 
                           hover:from-orange-600 hover:to-blue-600 text-white shadow text-base flex 
                           items-center justify-center"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "→"
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Send Request</p></TooltipContent>
          </Tooltip>
        </div>
      </section>
    </TooltipProvider>
  );
};