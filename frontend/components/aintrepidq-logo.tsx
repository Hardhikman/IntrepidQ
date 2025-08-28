interface AIntrepidQLogoProps {
  size?: "small" | "medium" | "large"
  className?: string
}

export function AIntrepidQLogo({ size = "medium", className = "" }: AIntrepidQLogoProps) {
  const sizeClasses = {
    small: "text-3xl",
    medium: "text-5xl",
    large: "text-7xl",
  }

  return (
    <div className={`inline-block ${sizeClasses[size]} ${className}`}>
      <div
        className="relative"
        style={{
          fontFamily: "cursive",
          transform: "rotate(-2deg)",
          letterSpacing: "0.05em",
        }}
      >
        {/* A with slight forward lean */}
        <span
          className="text-blue-600 inline-block"
          style={{
            transform: "rotate(5deg) translateY(-2px)",
            fontWeight: "300",
          }}
        >
          A
        </span>

        {/* Slanted I positioned after A */}
        <span
          className="text-orange-500 inline-block"
          style={{
            transform: "rotate(25deg) translateX(-8px) translateY(-5px)",
            fontSize: "0.9em",
            fontWeight: "400",
          }}
        >
          I
        </span>

        {/* ntrepid flowing naturally */}
        <span
          className="text-blue-600 inline-block"
          style={{
            transform: "translateX(-5px)",
            fontWeight: "300",
          }}
        >
          ntrepid
        </span>

        {/* Q with flourish */}
        <span
          className="text-orange-500 inline-block relative"
          style={{
            transform: "rotate(-3deg)",
            fontWeight: "400",
          }}
        >
          Q{/* Decorative underline flourish */}
          <div
            className="absolute -bottom-2 left-0 w-full h-0.5 bg-orange-500 opacity-60"
            style={{
              transform: "rotate(-5deg) scaleX(1.2)",
              borderRadius: "2px",
            }}
          />
        </span>
      </div>
    </div>
  )
}
