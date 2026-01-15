import type React from "react"

export interface AIntrepidQLogoProps {
  size?: "small" | "medium" | "large"
  className?: string
}

export const AIntrepidQLogo: React.FC<AIntrepidQLogoProps> = ({ size = "medium", className = "" }) => {
  // AI pill and Q size classes
  const pillSizeClasses = {
    small: "text-sm sm:text-base px-1.5 py-0.5",
    medium: "text-base sm:text-lg px-2 py-0.5",
    large: "text-lg sm:text-xl px-2.5 py-1",
  }

  // ntrepid is smaller than AI and Q
  const ntrepidSizeClasses = {
    small: "text-xs sm:text-sm",
    medium: "text-sm sm:text-base",
    large: "text-base sm:text-lg",
  }

  // Q matches the AI pill size
  const qSizeClasses = {
    small: "text-sm sm:text-base",
    medium: "text-base sm:text-lg",
    large: "text-lg sm:text-xl",
  }

  return (
    <div className={`inline-block ${className}`}>
      <div className="inline-flex items-baseline gap-0.5">
        {/* AI pill with gradient background */}
        <span
          className={`inline-flex items-center rounded-md font-bold ${pillSizeClasses[size]}`}
          style={{
            background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
            color: "#ffffff",
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          AI
        </span>

        {/* ntrepid - smaller text */}
        <span
          className={`font-bold ${ntrepidSizeClasses[size]}`}
          style={{
            color: "#F97316",
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          ntrepid
        </span>

        {/* Q - same size as AI pill */}
        <span
          className={`font-bold ${qSizeClasses[size]}`}
          style={{
            color: "#3B82F6",
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginLeft: "-0.1em",
          }}
        >
          Q
        </span>
      </div>
    </div>
  )
}

export default AIntrepidQLogo
