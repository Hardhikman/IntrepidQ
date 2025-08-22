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

// 🔹 Highlight matched text
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const regex = new RegExp(`(${query})`, "gi")
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="font-semibold text-orange-600">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between truncate",
            value ? "border-green-500" : "",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate block max-w-[85%]">
            {value || placeholder || "Select Topic..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0">
        <Command>
          <CommandInput
            placeholder="Search topics..."
            className="h-9"
            onValueChange={(val) => setSearchQuery(val)}
          />
          <CommandList className="max-h-[250px] overflow-y-auto">
            <CommandEmpty>No topics found.</CommandEmpty>
            <CommandGroup>
              {items.map((item, idx) => (
                <CommandItem
                  key={`${item}-${idx}`}
                  value={item}
                  onSelect={(currentValue) => {
                    onChange(currentValue)
                    setOpen(false)
                  }}
                  className="flex items-start gap-2 px-2 py-2 text-sm"
                >
                  {/* 🔹 Left column: checkmark (fixed width) */}
                  <span className="w-4 flex justify-center">
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === item ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </span>

                  {/* 🔹 Right column: text (aligned and wraps) */}
                  <span className="flex-1 whitespace-normal leading-snug text-gray-800">
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