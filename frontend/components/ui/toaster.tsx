"use client";

import { Toaster as SonnerToaster, type ToasterProps } from "sonner";
import { useTheme } from "next-themes";

export function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <SonnerToaster
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group relative flex w-full max-w-sm items-center justify-between space-x-4 rounded-md border p-6 shadow-lg transition-all",
          title: "text-sm font-semibold",
          description: "text-sm opacity-90",
          actionButton:
            "inline-flex h-8 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring",
          cancelButton:
            "inline-flex h-8 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring",
        },
      }}
      {...props}
    />
  );
}
