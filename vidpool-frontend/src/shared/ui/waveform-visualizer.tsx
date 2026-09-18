interface WaveformVisualizerProps {
  isPlaying?: boolean
  progress?: number // 0 to 1
  height?: number
  barCount?: number
  color?: string
  activeColor?: string
  className?: string
  onSeek?: (progress: number) => void
}

export function WaveformVisualizer({
  isPlaying = false,
  progress = 0.35,
  height = 36,
  barCount = 48,
  color = "rgba(255, 255, 255, 0.2)",
  activeColor = "var(--primary)",
  className = "",
  onSeek,
}: WaveformVisualizerProps) {
  // Generate deterministic heights that look like realistic speech
  const bars = Array.from({ length: barCount }, (_, i) => {
    const sin1 = Math.sin((i / barCount) * Math.PI * 3.5)
    const sin2 = Math.cos((i / barCount) * Math.PI * 7.2)
    const raw = Math.abs(sin1 * 0.6 + sin2 * 0.4)
    // vary height between 15% and 95%
    return Math.max(15, Math.min(95, Math.round(raw * 100)))
  })

  return (
    <div
      className={`flex items-center gap-[2.5px] cursor-pointer select-none ${className}`}
      style={{ height: `${height}px` }}
      onClick={(e) => {
        if (!onSeek) return
        const rect = e.currentTarget.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const p = Math.max(0, Math.min(1, clickX / rect.width))
        onSeek(p)
      }}
    >
      {bars.map((h, i) => {
        const barProgress = i / barCount
        const isActive = barProgress <= progress
        return (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all duration-75 ${
              isPlaying && isActive ? "opacity-100" : ""
            }`}
            style={{
              height: `${h}%`,
              backgroundColor: isActive ? activeColor : color,
            }}
          />
        )
      })}
    </div>
  )
}
