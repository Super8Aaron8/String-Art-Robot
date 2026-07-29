import StepperField from './StepperField'

export interface ImageAdjustments {
  contrast: number
  brightness: number
}

interface Props {
  pegCount: number
  minPegDistance: number
  lineWeight: number
  adjustments: ImageAdjustments
  onPegCountChange: (v: number) => void
  onMinPegDistanceChange: (v: number) => void
  onLineWeightChange: (v: number) => void
  onAdjustmentsChange: (v: ImageAdjustments) => void
}

export default function ConfigPanel({
  pegCount,
  minPegDistance,
  lineWeight,
  adjustments,
  onPegCountChange,
  onMinPegDistanceChange,
  onLineWeightChange,
  onAdjustmentsChange,
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
        min={0.02}
        max={0.3}
        step={0.01}
        format={(v) => v.toFixed(2)}
        onChange={onLineWeightChange}
      />

      <div className="section-label pt-1">
        <span className="font-mono text-[0.62rem] uppercase tracking-wide-3 text-red">04 — IMAGE</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StepperField
          label="Contrast"
          value={adjustments.contrast}
          min={-100}
          max={100}
          step={1}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, contrast: v })}
        />
        <StepperField
          label="Brightness"
          value={adjustments.brightness}
          min={-100}
          max={100}
          step={1}
          onChange={(v) => onAdjustmentsChange({ ...adjustments, brightness: v })}
        />
      </div>
    </div>
  )
}
