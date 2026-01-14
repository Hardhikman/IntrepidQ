import type React from "react"

export interface AIntrepidQLogoProps {
  size?: "small" | "medium" | "large"
  className?: string
}

export const AIntrepidQLogo: React.FC<AIntrepidQLogoProps> = ({ size = "medium", className = "" }) => {
  // Define responsive size classes
  const sizeClasses = {
    small: "text-base sm:text-lg",
    medium: "text-xl sm:text-2xl",
    large: "text-3xl sm:text-4xl",
  }

  const pillSizeClasses = {
    small: "text-xs sm:text-sm px-1.5 py-0.5",
    medium: "text-sm sm:text-base px-2 py-0.5",
    large: "text-base sm:text-lg px-2.5 py-1",
  }

  return (
    <div className={`inline-block ${className}`}>
      <div className="inline-flex items-center gap-0.5">
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

        {/* ntrepidQ text */}
        <span
          className={`font-bold ${sizeClasses[size]}`}
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          <span style={{ color: "#F97316" }}>ntrepid</span>
          <span style={{ color: "#3B82F6" }}>Q</span>
        </span>
      </div>
    </div>
  )
}

export default AIntrepidQLogo
