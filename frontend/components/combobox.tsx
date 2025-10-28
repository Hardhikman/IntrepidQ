"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useTheme } from "next-themes"

// 🔹 Highlight matched text
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const regex = new RegExp(`(${query})`, "gi")
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="font-semibold text-yellow-300">
            {part}
          </span>
        ) : (
          <span key={i} className="text-white">{part}</span>
        )
      )}
    </>
  )
}

export function TopicCombobox({
  items,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  items: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const { theme } = useTheme()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-10 w-full justify-between truncate bg-gradient-to-r from-orange-600 to-orange-700 text-white border-0 rounded-lg text-sm shadow hover:from-orange-700 hover:to-orange-800",
            value ? "" : "",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate block max-w-[85%]">
            {value || placeholder || "Select Topic..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-white" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0 bg-gradient-to-r from-orange-600 to-orange-700 border-0 rounded-lg shadow-lg">
        <Command className="bg-transparent text-white">
          <CommandInput
            placeholder="Search topics..."
            className="h-9 bg-white/10 text-white placeholder-white/70 border-0 focus:ring-1 focus:ring-white/50 rounded-lg my-2 mx-2 [&_input]:text-white [&_input]:placeholder-white/70"
          />
          <CommandList className="max-h-[250px] overflow-y-auto bg-transparent">
            <CommandEmpty className="text-white/80 py-2 text-center">No topics found.</CommandEmpty>
            <CommandGroup className="bg-transparent text-white">
              {items.map((item, idx) => (
                <CommandItem
                  key={`${item}-${idx}`}
                  value={item}
                  onSelect={(currentValue) => {
                    onChange(currentValue)
                    setOpen(false)
                  }}
                  className="flex items-start gap-2 px-2 py-2 text-sm text-white hover:bg-white/10 rounded-md mx-1 aria-selected:bg-white/10 aria-selected:text-white"
                >
                  {/* 🔹 Left column: checkmark (fixed width) */}
                  <span className="w-4 flex justify-center">
                    <Check
                      className={cn(
                        "h-4 w-4 text-white",
                        value === item ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </span>

                  {/* 🔹 Right column: text (aligned and wraps) */}
                  <span className="flex-1 whitespace-normal leading-snug">
                    <HighlightedText text={item} query={searchQuery} />
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}