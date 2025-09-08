import type React from "react"

// Consolidated interface with all required props
export interface AIntrepidQLogoProps {
  size?: "small" | "medium" | "large"
  className?: string
}

export const AIntrepidQLogo: React.FC<AIntrepidQLogoProps> = ({ size = "medium", className = "" }) => {
  // Define responsive size classes
  const sizeClasses = {
    small: "text-lg xs:text-xl sm:text-2xl",
    medium: "text-2xl xs:text-3xl sm:text-4xl",
    large: "text-4xl xs:text-5xl sm:text-6xl",
  }

  const smallerSizeClasses = {
    small: "text-sm xs:text-base sm:text-lg",
    medium: "text-lg xs:text-xl sm:text-2xl",
    large: "text-xl xs:text-2xl sm:text-3xl",
  }

  return (
    <div className={`inline-block ${className}`}>
      <div className="inline-flex items-center">
        {/* AI letters with gradient border and no background */}
        <div
          className="inline-flex items-center px-0.5 py-0 rounded-full border"
          style={{
            borderImage: "linear-gradient(90deg, #FFB366 0%, #87CEEB 100%) 1",
            background: "transparent",
          }}
        >
          <div className={`inline-flex items-center ${sizeClasses[size]}`}>
            <span
              className="font-bold"
              style={{
                color: "#4169E1",
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontWeight: "700",
              }}
            >
              A
            </span>

            <span
              className="font-bold"
              style={{
                color: "#FF6347",
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontWeight: "700",
              }}
            >
              I
            </span>
          </div>
        </div>

        <div className={`inline-flex items-center ${smallerSizeClasses[size]}`}>
          {/* ntrepid in orange color */}
          <span
            className="font-bold"
            style={{
              color: "#FF6347",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: "700",
            }}
          >
            ntrepid
          </span>

          {/* Q in blue color matching the A */}
          <span
            className="font-bold"
            style={{
              color: "#4169E1",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontWeight: "700",
              marginLeft: "0.1em",
            }}
          >
            Q
          </span>
        </div>
      </div>
    </div>
  )
}

export default AIntrepidQLogo
