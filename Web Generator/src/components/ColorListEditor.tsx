import type { ThreadColor } from '../types'
import { newId } from '../lib/id'
import StepperField from './StepperField'

interface Props {
  multiColor: boolean
  colors: ThreadColor[]
  totalLines: number
  onMultiColorChange: (v: boolean) => void
  onColorsChange: (colors: ThreadColor[]) => void
  onTotalLinesChange: (v: number) => void
}

export default function ColorListEditor({
  multiColor,
  colors,
  totalLines,
  onMultiColorChange,
  onColorsChange,
  onTotalLinesChange,
}: Props) {
  const updateColor = (id: string, patch: Partial<ThreadColor>) => {
    onColorsChange(colors.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const addColor = () => {
    onColorsChange([...colors, { id: newId('c'), hex: '#EF4444' }])
  }

  const removeColor = (id: string) => {
    if (colors.length <= 1) return
    onColorsChange(colors.filter((c) => c.id !== id))
  }

  return (
    <div className="flex shrink-0 flex-col gap-4 rounded-[1px] border border-line bg-bg-1 p-5">
      <div className="section-label">
        <span className="font-mono text-[0.62rem] uppercase tracking-wide-3 text-red">05 — THREAD</span>
      </div>

      <StepperField label="Total Lines" value={totalLines} min={100} max={20000} step={100} onChange={onTotalLinesChange} />

      <button
        onClick={() => onMultiColorChange(!multiColor)}
        className={`flex items-center justify-between rounded-[1px] border px-3 py-2 transition-colors ${
          multiColor ? 'border-red text-red' : 'border-line-2 text-text-1'
        }`}
      >
        <span className="font-mono text-[0.62rem] uppercase tracking-wide-2">Multi-Color</span>
        <span className="font-mono text-[0.62rem]">{multiColor ? 'ON' : 'OFF'}</span>
      </button>

      <div className="flex flex-col gap-2">
        {colors.map((color) => (
          <div key={color.id} className="flex items-center gap-2 rounded-[1px] border border-line bg-bg-2 p-3">
            <input
              type="color"
              value={color.hex}
              onChange={(e) => updateColor(color.id, { hex: e.target.value })}
              className="h-7 w-7 shrink-0 cursor-pointer rounded-[1px] border border-line-2 bg-transparent p-0"
            />
            <input
              type="text"
              value={color.hex}
              onChange={(e) => updateColor(color.id, { hex: e.target.value })}
              className="min-w-0 flex-1 border-b border-line bg-transparent font-mono text-[0.7rem] text-text-1 outline-none focus:border-red"
            />
            {multiColor && colors.length > 1 && (
              <button
                onClick={() => removeColor(color.id)}
                className="shrink-0 font-mono text-[0.7rem] text-text-2 hover:text-red"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {multiColor && (
        <button
          onClick={addColor}
          className="rounded-[1px] border border-line-2 py-2 font-mono text-[0.62rem] uppercase tracking-wide-2 text-text-1 hover:border-red hover:text-red"
        >
          + Add Color
        </button>
      )}

      <p className="font-mono text-[0.58rem] leading-relaxed text-text-2 opacity-70">
        Lines are allocated across colors automatically: at each step, whichever color's next thread would
        reduce the most error wins it. Threads are still exported and drawn one full color at a time, so the
        physical layering order can differ slightly from what the optimizer assumed — tell me how your robot
        actually handles thread switches and I'll tune this further.
      </p>
    </div>
  )
}
