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

// Truncate text to max length with ellipsis
function truncateText(text: string, maxLength: number = 60): string {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + "..."
}

// Highlight matched text in search
function HighlightedText({ text, query, truncated }: { text: string; query: string; truncated: string }) {
  const displayText = truncated || text
  if (!query) return <>{displayText}</>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi")
  const parts = displayText.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="font-semibold text-yellow-300">
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
  const { resolvedTheme } = useTheme()

  // Filter items based on search query
  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return items
    return items.filter(item =>
      item.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [items, searchQuery])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-10 w-full justify-between bg-gradient-to-r from-orange-600 to-orange-700 text-white border-0 rounded-lg text-sm shadow hover:from-orange-700 hover:to-orange-800",
            className
          )}
          disabled={disabled}
          title={value || placeholder || "Select Topic..."}
        >
          <span className="truncate block max-w-[85%] text-left">
            {truncateText(value, 35) || placeholder || "Select Topic..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-70 text-white" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0 bg-gradient-to-br from-orange-600 to-orange-700 border-0 rounded-xl shadow-2xl"
        align="start"
      >
        <Command className="bg-transparent text-white" shouldFilter={false}>
          <CommandInput
            placeholder="Search topics..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-10 bg-white/10 text-white placeholder-white/70 border-0 focus:ring-2 focus:ring-white/30 rounded-lg my-2 mx-2 text-sm [&_input]:text-white [&_input]:placeholder-white/70"
          />
          <CommandList className="max-h-[280px] overflow-y-auto px-1 pb-2">
            <CommandEmpty className="text-white/80 py-4 text-center text-sm">
              No topics found.
            </CommandEmpty>
            <CommandGroup className="bg-transparent">
              {filteredItems.map((item, idx) => {
                const isSelected = value === item
                const truncatedItem = truncateText(item, 55)

                return (
                  <CommandItem
                    key={`${item}-${idx}`}
                    value={item}
                    onSelect={(currentValue) => {
                      onChange(currentValue)
                      setOpen(false)
                      setSearchQuery("")
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg mx-1 mb-1 cursor-pointer transition-colors",
                      "text-white/90 hover:text-white",
                      isSelected
                        ? "bg-white/20 text-white font-medium"
                        : "hover:bg-white/10"
                    )}
                    title={item}
                  >
                    {/* Checkmark */}
                    <span className="w-4 flex-shrink-0">
                      <Check
                        className={cn(
                          "h-4 w-4",
                          isSelected ? "opacity-100 text-white" : "opacity-0"
                        )}
                      />
                    </span>

                    {/* Topic text - truncated with tooltip */}
                    <span className="flex-1 leading-tight">
                      <HighlightedText
                        text={item}
                        query={searchQuery}
                        truncated={truncatedItem}
                      />
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}