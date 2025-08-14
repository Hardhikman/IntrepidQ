"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// We will load the Supabase client dynamically to avoid build errors.
let createClient;

export default function FloatingFeedbackButton() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [supabase, setSupabase] = useState(null);
  const { toast } = useToast();

  // Initialize the Supabase client dynamically on component mount.
  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        if (!createClient) {
          const supabaseModule = await import("https://esm.sh/@supabase/supabase-js");
          createClient = supabaseModule.createClient;
        }
        // IMPORTANT: Replace these with your actual Supabase URL and Anon Key.
        // It's best practice to use environment variables for these values.
        const supabaseUrl = "https://your-project-id.supabase.co";
        const supabaseAnonKey = "your-supabase-anon-key";
        setSupabase(createClient(supabaseUrl, supabaseAnonKey));
      } catch (error) {
        console.error("Error initializing Supabase client:", error);
        toast({
          title: "Initialization Error",
          description: "Could not connect to the feedback service.",
          variant: "destructive",
        });
      }
    };

    initializeSupabase();
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
      const sessionResponse = await supabase.auth.getSession();
      const token = sessionResponse.data.session?.access_token;

      if (!token) {
        toast({
          title: "Login required",
          description: "Please sign in to submit feedback.",
          variant: "destructive",
        });
        return;
      }

      const res = await fetch("/api/question_feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
