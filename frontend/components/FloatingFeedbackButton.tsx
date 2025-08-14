"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Extend the Window interface to inform TypeScript about the global supabase object
declare global {
  interface Window {
    supabase: any;
  }
}

export default function FloatingFeedbackButton() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [supabase, setSupabase] = useState<any>(null);
  const { toast } = useToast();

  // Initialize the Supabase client by dynamically loading the script
  useEffect(() => {
    // Function to initialize the client once the script is loaded
    const initializeClient = () => {
      if (window.supabase) {
        // IMPORTANT: Replace these with your actual Supabase URL and Anon Key.
        const supabaseUrl = "https://your-project-id.supabase.co";
        const supabaseAnonKey = "your-supabase-anon-key";
        setSupabase(window.supabase.createClient(supabaseUrl, supabaseAnonKey));
      } else {
        console.error("Supabase client not found on window object.");
        toast({
          title: "Initialization Error",
          description: "Could not connect to the feedback service.",
          variant: "destructive",
        });
      }
    };

    // Check if the script is already on the page
    if (document.querySelector('script[src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"]')) {
      initializeClient();
      return;
    }

    // If not, create and append the script tag
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.async = true;

    script.onload = initializeClient;

    script.onerror = () => {
      console.error("Failed to load Supabase script.");
      toast({
        title: "Script Load Error",
        description: "Could not load the feedback service script.",
        variant: "destructive",
      });
    };

    document.body.appendChild(script);

    // Cleanup function to remove the script if the component unmounts
    return () => {
      const existingScript = document.querySelector('script[src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, [toast]);

  const submitFeedback = async () => {
    if (selectedRating === null) {
      toast({
        title: "Rating required",
        description: "Please select 'Good' or 'Bad' before submitting.",
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

      const res = await fetch("/api/question_feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          generation_id: "website_feedback",
          rating: selectedRating,
          comment: comment?.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to submit feedback (${res.status})`);
      }

      toast({ title: "Thanks!", description: "Feedback submitted." });
      setOpen(false);
      setComment("");
      setSelectedRating(null);
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

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <Card className="mb-2 w-64 shadow-xl">
          <CardContent className="p-3 space-y-3">
            <div className="text-sm font-medium">Rate your experience</div>
            <div className="flex gap-2">
              <Button
                variant={selectedRating === 5 ? "default" : "outline"}
                disabled={submitting}
                onClick={() => setSelectedRating(5)}
                className="w-full"
              >
                👍 Good
              </Button>
              <Button
                variant={selectedRating === 1 ? "default" : "outline"}
                disabled={submitting}
                onClick={() => setSelectedRating(1)}
                className="w-full"
              >
                👎 Bad
              </Button>
            </div>
            <textarea
              className="w-full border rounded p-2 text-sm"
              rows={3}
              placeholder="Share details (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                variant="default"
                disabled={submitting || selectedRating === null || !supabase}
                onClick={submitFeedback}
              >
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Button
        className="rounded-full shadow-lg"
        onClick={() => setOpen((v) => !v)}
        variant={open ? "secondary" : "default"}
      >
        🗣️ Feedback
      </Button>
    </div>
  );
}
