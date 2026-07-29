import type { ScrewConfig } from '../config/screw'
import StepperField from './StepperField'

interface Props {
  screw: ScrewConfig
  onChange: (screw: ScrewConfig) => void
}

export default function ScrewEditor({ screw, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <StepperField
        label="Radius (mm)"
        value={screw.radius}
        min={0.5}
        max={15}
        step={0.1}
        format={(v) => v.toFixed(1)}
        onChange={(v) => onChange({ ...screw, radius: v })}
      />
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[0.6rem] uppercase tracking-wide-2 text-text-2">Color</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={screw.color}
            onChange={(e) => onChange({ ...screw, color: e.target.value })}
            className="h-7 w-7 shrink-0 cursor-pointer rounded-[1px] border border-line-2 bg-transparent p-0"
          />
          <input
            type="text"
            value={screw.color}
            onChange={(e) => onChange({ ...screw, color: e.target.value })}
            className="min-w-0 flex-1 border-b border-line bg-transparent font-mono text-[0.7rem] text-text-1 outline-none focus:border-red"
          />
        </div>
      </div>
    </div>
  )
}
