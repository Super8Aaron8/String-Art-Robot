import { useState } from 'react'
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
  const [open, setOpen] = useState(false)
  const boardDiameterMm = (pegCount * screwDistance) / Math.PI

  return (
    <div className="flex shrink-0 flex-col gap-4 rounded-[1px] border border-line bg-bg-1 p-5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-4 text-left">
        <span className="font-mono text-[0.62rem] uppercase tracking-wide-3 text-red">04 — SCREW</span>
        <span className="h-px flex-1 bg-white/[0.06]" />
        <span
          className={`shrink-0 font-mono text-[0.6rem] text-text-2 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <>
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
        </>
      )}
    </div>
  )
}
