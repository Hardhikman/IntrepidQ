interface AIntrepidQLogoProps {
  size?: "small" | "medium" | "large"
  className?: string
}

export function AIntrepidQLogo({ size = "medium", className = "" }: AIntrepidQLogoProps) {
  // Define responsive size classes
  const sizeClasses = {
    small: "text-xl xs:text-2xl sm:text-3xl",
    medium: "text-3xl xs:text-4xl sm:text-5xl",
    large: "text-5xl xs:text-6xl sm:text-7xl",
  }

  return (
    <div className={`inline-block ${sizeClasses[size]} ${className}`}>
      <div
        className="relative inline-flex items-center"
        style={{
          fontFamily: "cursive",
          transform: "rotate(-1deg)",
          letterSpacing: "0.03em",
        }}
      >
        {/* A with slight forward lean - reduced size */}
        <span
          className="text-blue-600"
          style={{
            transform: "rotate(3deg) translateY(-1px)",
            fontWeight: "300",
            display: "inline-block",
            fontSize: "0.95em",
          }}
        >
          A
        </span>

        {/* Slanted I positioned after A - with underline */}
        <span
          className="text-orange-500 relative"
          style={{
            transform: "rotate(15deg) translateX(-4px) translateY(-1px)",
            fontSize: "0.8em",
            fontWeight: "400",
            display: "inline-block",
            marginLeft: "-0.2em",
          }}
        >
          I
          {/* Decorative underline flourish for I */}
          <div
            className="absolute -bottom-1 left-0 w-full h-0.5 bg-orange-500 opacity-60"
            style={{
              transform: "rotate(-2deg) scaleX(1.1)",
              borderRadius: "1px",
            }}
          />
        </span>

        {/* ntrepid flowing naturally */}
        <span
          className="text-blue-600"
          style={{
            transform: "translateX(-2px)",
            fontWeight: "300",
            display: "inline-block",
            marginLeft: "-0.1em",
          }}
        >
          ntrepid
        </span>

        {/* Q with flourish - further reduced size */}
        <span
          className="text-orange-500 relative"
          style={{
            transform: "rotate(-1deg)",
            fontWeight: "400",
            display: "inline-block",
            marginLeft: "-0.1em",
            fontSize: "0.85em",
          }}
        >
          Q
          {/* Decorative underline flourish for Q */}
          <div
            className="absolute -bottom-1 left-0 w-full h-0.5 bg-orange-500 opacity-60"
            style={{
              transform: "rotate(-2deg) scaleX(1.1)",
              borderRadius: "1px",
            }}
          />
        </span>
      </div>
    </div>
  )
}
