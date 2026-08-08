import StepperField from './StepperField'
import { LINE_WEIGHT_MIN, LINE_WEIGHT_MAX } from '../lib/patterns'

interface Props {
  pegCount: number
  minPegDistance: number
  lineWeight: number
  onPegCountChange: (v: number) => void
  onMinPegDistanceChange: (v: number) => void
  onLineWeightChange: (v: number) => void
}

export default function ConfigPanel({
  pegCount,
  minPegDistance,
  lineWeight,
  onPegCountChange,
  onMinPegDistanceChange,
  onLineWeightChange,
}: Props) {
  return (
    <div className="flex shrink-0 flex-col gap-4 rounded-[1px] border border-line bg-bg-1 p-5">
      <div className="section-label">
        <span className="font-mono text-[0.62rem] uppercase tracking-wide-3 text-red">03 — BOARD</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StepperField label="Peg Count" value={pegCount} min={36} max={400} step={1} onChange={onPegCountChange} />
        <StepperField
          label="Min Peg Dist"
          value={minPegDistance}
          min={1}
          max={60}
          step={1}
          onChange={onMinPegDistanceChange}
        />
      </div>

      <StepperField
        label="Line Weight"
        value={lineWeight}
        min={LINE_WEIGHT_MIN}
        max={LINE_WEIGHT_MAX}
        step={0.01}
        format={(v) => v.toFixed(2)}
        onChange={onLineWeightChange}
      />
    </div>
  )
}
