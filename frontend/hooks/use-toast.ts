"use client";

import { toast as sonnerToast, type ToastT } from "sonner";

type ToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive"; // keep variants for styling logic
} & ToastT;

export function toast({ title, description, variant = "default", ...props }: ToastInput) {
  const message = [title, description].filter(Boolean).join(" — ") || "";

  // Variant-based color mapping (Shadcn colors into Sonner)
  const className =
    variant === "destructive"
      ? "bg-destructive text-destructive-foreground border-destructive"
      : "bg-background text-foreground border-border";

  return sonnerToast(message, {
    className,
    ...props,
  });
}
