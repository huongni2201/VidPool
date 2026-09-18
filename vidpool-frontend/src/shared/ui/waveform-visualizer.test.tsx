import { fireEvent, render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { WaveformVisualizer } from "./waveform-visualizer"

describe("WaveformVisualizer", () => {
  it("renders the requested number of bars", () => {
    const { container } = render(<WaveformVisualizer barCount={24} />)
    const bars = container.firstElementChild?.children
    expect(bars?.length).toBe(24)
  })

  it("calls onSeek when container is clicked", () => {
    const onSeek = vi.fn()
    const { container } = render(<WaveformVisualizer onSeek={onSeek} />)
    const root = container.firstElementChild as HTMLElement
    // Mock getBoundingClientRect
    vi.spyOn(root, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 36,
      right: 200,
      bottom: 36,
      x: 0,
      y: 0,
      toJSON: () => {},
    })

    fireEvent.click(root, { clientX: 100 })
    expect(onSeek).toHaveBeenCalledWith(0.5)
  })
})
