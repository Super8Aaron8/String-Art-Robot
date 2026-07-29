# String Art — Path Generator

Turns an image into a peg-and-thread sequence for a string art robot. Runs entirely
client-side (no backend) — upload an image, tune the parameters below, generate, export.

## Running it

```
npm install
npm run dev      # dev server
npm run build    # production build
```

## How generation works

Pegs are placed evenly around a circle. For each thread color, a greedy algorithm
repeatedly picks the next peg that reduces the most remaining "error" between the
current rendered result and the target image, draws a straight line to it, subtracts
that line's contribution, and repeats — the same family of algorithm used by most
string-art generators. Colors are processed one at a time, in the order listed in the
**Thread** panel, each producing its own continuous peg sequence.

## Parameters

### 01 — Input (image cropper)

| Control | What it does |
|---|---|
| **Drag** | Pans the image within the pegboard frame. |
| **Scroll wheel** | Zooms in/out, same as the Zoom field. |
| **Zoom** | `0.30x`–`2.50x`, default `1.00x`. `1.00x` exactly covers the circular frame with no padding. Below `1.00x` the image shrinks *inside* the frame, extending past its own edges and revealing white padding in the pegboard circle — useful when the subject shouldn't be cropped tight. Above `1.00x` zooms in / crops tighter. |
| **Reset** | Returns zoom/pan to `1.00x`, centered. |
| **Change** | Opens the file picker to swap the source image. |

The red circle overlay shows exactly what falls inside the pegboard — anything outside
it is never seen by the algorithm.

### 02 — Board

| Control | Range | Default | What it does |
|---|---|---|---|
| **Peg Count** | 36–400 | 150 | Number of pegs/nails evenly spaced around the circular board. More pegs = finer possible detail and more, shorter thread segments; fewer pegs = coarser, more angular results. |
| **Min Peg Dist** | 1–60 | 15 | Minimum spacing (in peg indices, measured around the circle) allowed between two pegs the algorithm connects directly. Prevents the algorithm from picking trivial, very short adjacent-peg lines that add thread length without adding much visual darkness. Raise it to force longer, more structural lines; lower it to allow finer local detail. |
| **Line Weight** | 0.02–0.30 | 0.09 | How much darkness/color a single thread pass removes from the remaining error each time a line crosses a pixel. Higher = each line "counts" more, so the image darkens in fewer lines (bolder, less nuanced). Lower = more lines needed to reach full darkness (subtler gradients, more thread). |

### 03 — Image

| Control | Range | Default | What it does |
|---|---|---|---|
| **Contrast** | -100–100 | 20 | Standard contrast adjustment applied to the cropped image before it's fed to the algorithm. Higher contrast pushes mid-tones toward black/white, which tends to make the generated result bolder and more graphic; lower contrast keeps more gradual shading. |
| **Brightness** | -100–100 | 0 | Standard brightness offset applied the same way, before generation. |

Both adjustments only affect what the algorithm "sees" — they're applied to the working
copy of the image, not the original file.

### 04 — Thread

| Control | What it does |
|---|---|
| **Multi-Color** | Toggles between a single black thread and a list of multiple thread colors. Turning it on splits the current line budget 60/40 into black + red as a starting point; turning it off collapses back to one black thread. |
| **Color swatch / hex** | The thread's color, used both to render the preview and to pick which lines it "explains" during generation (each color's pass targets the residual color error closest to its own hue). |
| **Lines** | 10–5000 per color, default 5000 (single color) / 3000+2000 (split on enabling multi-color). How many peg-to-peg segments that color's pass will draw at most — generation stops early if no candidate line still reduces error. |
| **+ Add Color** *(multi-color only)* | Adds another thread color, run after the existing ones in the same list order. |
| **✕** *(multi-color only)* | Removes a color (at least one must remain). |

Colors run as complete, independent passes in list order — the first color's full
sequence is generated, then the second's, etc. This models a robot that fully finishes
one spool before switching threads, rather than interleaving colors line-by-line.

### 05 — Preview & output

- **Generate Path** — runs the algorithm with the current settings and renders the
  result as SVG line paths (one continuous path per color, matching how the physical
  thread runs).
- **Export .txt** — downloads the peg sequence(s) as a text file.
- **Stats row** (Pegs / Total Lines / Colors) — summary of the last generated result.

## Known placeholders

Two things are intentionally left as drafts, pending specifics about the physical robot:

- **Export format** — currently `COLOR #hex LINES=n` header + comma-separated peg
  indices per color. Update `src/lib/exportPath.ts` once the exact sequence format the
  robot firmware expects is known (delimiters, coordinates vs. indices, units, etc.).
- **Multi-color sequencing** — currently one full sequential pass per color (see above).
  If the robot actually interleaves colors, has a fixed palette, or needs a different
  color-separation model, that logic lives in `src/lib/stringArt.ts`.
