import type { ScrewConfig } from '../config/screw'
import StepperField from './StepperField'
import ScrewEditor from './ScrewEditor'

interface Props {
  screw: ScrewConfig
  screwDistance: number
  pegCount: number
  onScrewChange: (screw: ScrewConfig) => void
  onScrewDistanceChange: (v: number) => void
}

export default function ScrewPanel({ screw, screwDistance, pegCount, onScrewChange, onScrewDistanceChange }: Props) {
  const boardDiameterMm = (pegCount * screwDistance) / Math.PI

  return (
    <div className="flex shrink-0 flex-col gap-4 rounded-[1px] border border-line bg-bg-1 p-5">
      <div className="section-label">
        <span className="font-mono text-[0.62rem] uppercase tracking-wide-3 text-red">02 — SCREW</span>
      </div>

      <ScrewEditor screw={screw} onChange={onScrewChange} />

      <div className="flex flex-col gap-1.5">
        <StepperField
          label="Screw Distance (mm)"
          value={screwDistance}
          min={3}
          max={50}
          step={0.5}
          format={(v) => v.toFixed(1)}
          onChange={onScrewDistanceChange}
        />
        <span className="font-mono text-[0.56rem] uppercase tracking-wide-1 text-text-2 opacity-70">
          ≈ board Ø {boardDiameterMm.toFixed(0)}mm at {pegCount} pegs
        </span>
      </div>
    </div>
  )
}
