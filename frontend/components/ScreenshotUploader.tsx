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
      
      // Check file count (max 5)
      if (fileArray.length > 5) {
        toast({
          title: "Too many files",
          description: "You can upload maximum 5 images",
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
          Strictly one *legible* answer per request for effective evaluation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Area */}
        <div className="space-y-2">
          <Label>Upload Image/s with no question (Max 5 - 5MB each)</Label>
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

        {/* Evaluation Results - Improved Display */}
        {evaluationResult && (
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Evaluation Results</Label>
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
              {/* Overall Rating */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <h3 className="font-bold text-lg text-blue-800">Overall Rating: {evaluationResult.overall_rating}</h3>
              </div>

              {/* Evaluation Details */}
              {Object.entries(evaluationResult.evaluation).map(([category, details]: [string, any]) => (
                <div key={category} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-bold text-md capitalize mb-3 text-gray-800">
                    {category.replace(/_/g, ' ')}
                  </h3>
                  
                  {typeof details === 'object' && details !== null ? (
                    <div className="space-y-3">
                      {/* Rating */}
                      {details.rating && (
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Rating:</span>
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            details.rating === 'Good' ? 'bg-green-100 text-green-800' :
                            details.rating === 'Better' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {details.rating}
                          </span>
                        </div>
                      )}

                      {/* Strengths */}
                      {details.strengths && details.strengths.length > 0 && (
                        <div>
                          <span className="font-medium text-green-700">Strengths:</span>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {details.strengths.map((strength: string, index: number) => (
                              <li key={index} className="text-green-600">{strength}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Weaknesses */}
                      {details.weaknesses && details.weaknesses.length > 0 && (
                        <div>
                          <span className="font-medium text-red-700">Areas for Improvement:</span>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {details.weaknesses.map((weakness: string, index: number) => (
                              <li key={index} className="text-red-600">{weakness}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Improvements */}
                      {details.improvements && details.improvements.length > 0 && (
                        <div>
                          <span className="font-medium text-blue-700">Suggestions:</span>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {details.improvements.map((improvement: string, index: number) => (
                              <li key={index} className="text-blue-600">{improvement}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Nested Categories (like in body section) */}
                      {Object.entries(details).map(([subCategory, subDetails]: [string, any]) => {
                        if (subCategory !== 'rating' && subCategory !== 'strengths' && subCategory !== 'weaknesses' && subCategory !== 'improvements' && typeof subDetails === 'object' && subDetails !== null) {
                          return (
                            <div key={subCategory} className="ml-4 mt-3 pt-3 border-t border-gray-100">
                              <h4 className="font-semibold capitalize text-gray-700">{subCategory.replace(/_/g, ' ')}</h4>
                              <div className="mt-2 space-y-2">
                                {subDetails.rating && (
                                  <div className="flex items-center">
                                    <span className="font-medium mr-2">Rating:</span>
                                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                                      subDetails.rating === 'Good' ? 'bg-green-100 text-green-800' :
                                      subDetails.rating === 'Better' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {subDetails.rating}
                                    </span>
                                  </div>
                                )}
                                
                                {subDetails.strengths && subDetails.strengths.length > 0 && (
                                  <div>
                                    <span className="font-medium text-green-700">Strengths:</span>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                      {subDetails.strengths.map((strength: string, index: number) => (
                                        <li key={index} className="text-green-600">{strength}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {subDetails.weaknesses && subDetails.weaknesses.length > 0 && (
                                  <div>
                                    <span className="font-medium text-red-700">Areas for Improvement:</span>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                      {subDetails.weaknesses.map((weakness: string, index: number) => (
                                        <li key={index} className="text-red-600">{weakness}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {subDetails.improvements && subDetails.improvements.length > 0 && (
                                  <div>
                                    <span className="font-medium text-blue-700">Suggestions:</span>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                      {subDetails.improvements.map((improvement: string, index: number) => (
                                        <li key={index} className="text-blue-600">{improvement}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  ) : (
                    <p>{String(details)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

