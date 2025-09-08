"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, FileImage, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface ScreenshotUploaderProps {
  onTextExtracted: (text: string) => void;
}

export const ScreenshotUploader: React.FC<ScreenshotUploaderProps> = ({ onTextExtracted }) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [useEvaluation, setUseEvaluation] = useState(false);
  const [evaluationPrompt, setEvaluationPrompt] = useState("Evaluate this answer to the question : Add your question here");
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      const fileArray = Array.from(selectedFiles);
      
      // Check file count (max 2)
      if (fileArray.length > 2) {
        toast({
          title: "Too many files",
          description: "You can upload maximum 2 images",
          variant: "destructive"
        });
        return;
      }
      
      // Check file types
      const validFiles = fileArray.filter(file => file.type.startsWith('image/'));
      if (validFiles.length !== fileArray.length) {
        toast({
          title: "Invalid file type",
          description: "Please upload only image files",
          variant: "destructive"
        });
        return;
      }
      
      // Check file sizes (5MB max each)
      const oversizedFiles = fileArray.filter(file => file.size > 5 * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        toast({
          title: "File too large",
          description: "Each file must be smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setFiles(fileArray);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessScreenshots = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one image file to process",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setExtractedText("");
    setEvaluationResult(null);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      if (useEvaluation) {
        formData.append('evaluation_prompt', evaluationPrompt);
      }

      // Get auth token
      const sessionResponse = await supabase.auth.getSession();
      const token = sessionResponse.data.session?.access_token;

      // Determine endpoint based on evaluation setting
      const endpoint = useEvaluation ? '/api/evaluate_screenshot' : '/api/process_screenshot';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (useEvaluation) {
        setExtractedText(data.extracted_text);
        setEvaluationResult(data.evaluation);
        onTextExtracted(data.extracted_text);
      } else {
        setExtractedText(data.extracted_text);
        onTextExtracted(data.extracted_text);
      }

      toast({
        title: "Success",
        description: `Processed ${data.page_count} page(s) successfully`,
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process screenshots",
        variant: "destructive"
      });
      console.error("Screenshot processing error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileImage className="h-5 w-5" />
          Strictly one written answer (max 2 pages) per request
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Area */}
        <div className="space-y-2">
          <Label>Upload Image/s with no question (Max 2 - 5MB each)</Label>
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={handleUploadClick}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-600">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                PNG, JPG, JPEG up to 5MB each
              </p>
            </div>
          </div>
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="space-y-2">
            <Label>Selected Files</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <div className="flex items-center gap-2">
                    <FileImage className="h-4 w-4 text-gray-500" />
                    <span className="text-sm truncate">{file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evaluation Options */}
        <div className="flex items-center justify-between">
          <Label htmlFor="use-evaluation" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Use AI Evaluation with processing image/s
          </Label>
          <Switch
            id="use-evaluation"
            checked={useEvaluation}
            onCheckedChange={setUseEvaluation}
          />
        </div>

        {useEvaluation && (
          <div className="space-y-2">
            <Label>Evaluation Query</Label>
            <Textarea
              value={evaluationPrompt}
              onChange={(e) => setEvaluationPrompt(e.target.value)}
              placeholder="Enter evaluation query..."
              rows={3}
            />
          </div>
        )}

        {/* Process Button */}
        <Button
          className="w-full"
          onClick={handleProcessScreenshots}
          disabled={isProcessing || files.length === 0}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <FileImage className="mr-2 h-4 w-4" />
              PROCESS AND EVALUATE
            </>
          )}
        </Button>

        {/* Extracted Text */}
        {extractedText && (
          <div className="space-y-2">
            <Label>Extracted Text</Label>
            <Textarea
              value={extractedText}
              readOnly
              rows={6}
              className="font-mono text-sm"
            />
          </div>
        )}

        {/* Evaluation Results */}
        {evaluationResult && (
          <div className="space-y-2">
            <Label>Evaluation Results</Label>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(evaluationResult, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};