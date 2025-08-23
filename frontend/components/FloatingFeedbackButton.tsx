"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Extend the Window interface to inform TypeScript about the global supabase object.
// This helps avoid TypeScript errors when accessing window.supabase.
declare global {
  interface Window {
    supabase: any;
  }
}

// This is the recommended and secure way to handle client-side keys in Next.js.
// Next.js replaces these variables with their actual values at build time.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function FloatingFeedbackButton() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState("");
  const [feedbackType, setFeedbackType] = useState<"bug" | "feature" | null>(null);
  const [supabase, setSupabase] = useState<any>(null);
  const { toast } = useToast();

  // This useEffect hook dynamically loads the Supabase library via a script tag.This method bypasses the Next.js build process for this library,
  // which should finally resolve the "Could not resolve" compilation error.
  useEffect(() => {
    // This function initializes the Supabase client once the script is loaded.
    const initializeClient = () => {
      if (window.supabase) {
        // Use the keys read from the environment variables at the top of the file.
        if (supabaseUrl && supabaseAnonKey) {
            setSupabase(window.supabase.createClient(supabaseUrl, supabaseAnonKey));
        } else {
            console.error("Supabase environment variables are not set. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured and the server has been restarted.");
             toast({
              title: "Configuration Error",
              description: "Feedback service is not configured.",
              variant: "destructive",
            });
        }
      } else {
        console.error("Supabase client not found on window object.");
        toast({
          title: "Initialization Error",
          description: "Could not connect to the feedback service.",
          variant: "destructive",
        });
      }
    };

    // Check if the script is already on the page to avoid adding it multiple times.
    const existingScript = document.querySelector('script[src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"]');
    if (existingScript) {
      if (window.supabase) {
        initializeClient();
      } else {
        existingScript.addEventListener('load', initializeClient);
      }
      return;
    }

    // If the script isn't there, create it and add it to the page.
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = true;
    script.onload = initializeClient; // Initialize the client after the script loads.
    script.onerror = () => {
      console.error("Failed to load Supabase script.");
      toast({
        title: "Script Load Error",
        description: "Could not load the feedback service script.",
        variant: "destructive",
      });
    };

    document.body.appendChild(script);

  }, [toast]);

  const submitFeedback = async () => {
    if (!feedbackType) {
      toast({
        title: "Feedback Type Required",
        description: "Please select if this is a bug report or feature request.",
        variant: "destructive",
      });
      return;
    }

    if (!comment.trim()) {
      toast({
        title: "Comment Required",
        description: "Please provide details about your feedback.",
        variant: "destructive",
      });
      return;
    }

    if (!supabase) {
      toast({
        title: "Service Unavailable",
        description: "The feedback service is not ready. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Login required",
          description: "Please sign in to submit feedback.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/website_feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: feedbackType,
          comment: comment.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to submit feedback (${res.status})`);
      }

      toast({ title: "Thanks!", description: "Feedback submitted." });
      setOpen(false);
      setComment("");
      setFeedbackType(null);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Unable to submit feedback.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // If the component is not configured correctly, render a disabled button.
  if (!supabaseUrl || !supabaseAnonKey) {
     return (
        <div className="fixed bottom-4 right-4 z-50">
             <Button
                className="rounded-full shadow-lg"
                variant={"destructive"}
                disabled
                title="Feedback component is not configured correctly. Check environment variables."
             >
                🗣️ Feedback (Error)
            </Button>
        </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <Card className="mb-2 w-64 sm:w-72 shadow-xl">
          <CardContent className="p-3 sm:p-4 space-y-3">
            <div className="text-sm sm:text-base font-medium">Website Feedback</div>
            <div className="flex gap-2">
              <Button
                variant={feedbackType === "bug" ? "default" : "outline"}
                disabled={submitting}
                onClick={() => setFeedbackType("bug")}
                className="w-full text-sm sm:text-base"
              >
                🐞 Bug
              </Button>
              <Button
                variant={feedbackType === "feature" ? "default" : "outline"}
                disabled={submitting}
                onClick={() => setFeedbackType("feature")}
                className="w-full text-sm sm:text-base"
              >
                💡 Feature
              </Button>
            </div>
            <textarea
              className="w-full border rounded p-2 text-sm"
              rows={4}
              placeholder="Describe your feedback in detail..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                variant="default"
                disabled={submitting || !feedbackType || !comment.trim() || !supabase}
                onClick={submitFeedback}
                className="text-sm sm:text-base"
              >
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Button
        className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white text-sm sm:text-base"
        onClick={() => setOpen((v) => !v)}
        variant={open ? "secondary" : "default"}
      >
        🗣️ Feedback
      </Button>
    </div>
  );
}
