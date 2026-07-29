import { useEffect, useState } from 'react'

interface Props {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  format?: (value: number) => string
}

export default function StepperField({ label, value, min, max, step, onChange, format }: Props) {
  const decimals = step < 1 ? String(step).split('.')[1]?.length ?? 2 : 0
  const display = (v: number) => (format ? format(v) : String(v))
  const [text, setText] = useState(display(value))

  useEffect(() => {
    setText(display(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const clamp = (v: number) => Math.min(max, Math.max(min, v))

  const commit = (raw: string) => {
    const parsed = parseFloat(raw.replace(/[^0-9.\-]/g, ''))
    if (!Number.isNaN(parsed)) onChange(clamp(Number(parsed.toFixed(decimals))))
    else setText(display(value))
  }

  const step_ = (dir: 1 | -1) => onChange(clamp(Number((value + dir * step).toFixed(decimals))))

  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <span className="font-mono text-[0.6rem] uppercase tracking-wide-2 text-text-2">{label}</span>
      <div className="flex items-stretch rounded-[1px] border border-line-2 focus-within:border-red">
        <button
          type="button"
          onClick={() => step_(-1)}
          className="w-7 shrink-0 font-mono text-text-1 transition-colors hover:bg-bg-2 hover:text-red"
        >
          –
        </button>
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
          className="w-full min-w-0 border-x border-line-2 bg-transparent py-1.5 text-center font-mono text-[0.72rem] text-text-0 outline-none"
        />
        <button
          type="button"
          onClick={() => step_(1)}
          className="w-7 shrink-0 font-mono text-text-1 transition-colors hover:bg-bg-2 hover:text-red"
        >
          +
        </button>
      </div>
    </div>
  )
}
