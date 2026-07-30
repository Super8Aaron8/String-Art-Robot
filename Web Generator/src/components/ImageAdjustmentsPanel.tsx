import StepperField from './StepperField'
import type { ImageAdjustments } from '../lib/imageProcessing'

interface Props {
  adjustments: ImageAdjustments
  onAdjustmentsChange: (v: ImageAdjustments) => void
}

export default function ImageAdjustmentsPanel({ adjustments, onAdjustmentsChange }: Props) {
  const patch = (v: Partial<ImageAdjustments>) => onAdjustmentsChange({ ...adjustments, ...v })

  return (
    <div className="flex shrink-0 flex-col gap-4 rounded-[1px] border border-line bg-bg-1 p-5">
      <div className="section-label">
        <span className="font-mono text-[0.62rem] uppercase tracking-wide-3 text-red">02 — IMAGE</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StepperField
          label="Contrast"
          value={adjustments.contrast}
          min={-100}
          max={100}
          step={1}
          onChange={(v) => patch({ contrast: v })}
        />
        <StepperField
          label="Brightness"
          value={adjustments.brightness}
          min={-100}
          max={100}
          step={1}
          onChange={(v) => patch({ brightness: v })}
        />
        <StepperField
          label="Saturation"
          value={adjustments.saturation}
          min={-100}
          max={100}
          step={1}
          onChange={(v) => patch({ saturation: v })}
        />
        <StepperField
          label="Gamma"
          value={adjustments.gamma}
          min={0.2}
          max={3}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => patch({ gamma: v })}
        />
      </div>

      <StepperField
        label="Blur (px)"
        value={adjustments.blur}
        min={0}
        max={8}
        step={0.5}
        format={(v) => v.toFixed(1)}
        onChange={(v) => patch({ blur: v })}
      />

      <div className="flex flex-col gap-2">
        <button
          onClick={() => patch({ grayscale: !adjustments.grayscale })}
          className={`flex items-center justify-between rounded-[1px] border px-3 py-2 transition-colors ${
            adjustments.grayscale ? 'border-red text-red' : 'border-line-2 text-text-1'
          }`}
        >
          <span className="font-mono text-[0.62rem] uppercase tracking-wide-2">Grayscale</span>
          <span className="font-mono text-[0.62rem]">{adjustments.grayscale ? 'ON' : 'OFF'}</span>
        </button>
        <button
          onClick={() => patch({ invert: !adjustments.invert })}
          className={`flex items-center justify-between rounded-[1px] border px-3 py-2 transition-colors ${
            adjustments.invert ? 'border-red text-red' : 'border-line-2 text-text-1'
          }`}
        >
          <span className="font-mono text-[0.62rem] uppercase tracking-wide-2">Invert</span>
          <span className="font-mono text-[0.62rem]">{adjustments.invert ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  )
}
