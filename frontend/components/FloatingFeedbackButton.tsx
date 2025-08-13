"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function FloatingFeedbackButton() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState("");
  const { toast } = useToast();

  const submitFeedback = async (rating?: number) => {
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
          rating,
          comment: comment?.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed (${res.status})`);
      }

      toast({ title: "Thanks!", description: "Feedback submitted." });
      setOpen(false);
      setComment("");
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
        <Card className="mb-2 shadow-xl">
          <CardContent className="p-3 space-y-2">
            <div className="text-sm">Rate your experience</div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => submitFeedback(5)}
                title="Thumbs up"
              >
                👍 Good
              </Button>
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => submitFeedback(1)}
                title="Thumbs down"
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
                disabled={submitting}
                onClick={() => submitFeedback(undefined)}
              >
                Submit Comment
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
