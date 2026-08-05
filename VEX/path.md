# Current Path Route

Decoded directly from `path.txt` (`src/main.cpp:34` header layout, `src/main.cpp:340`
points layout).

SLOT 1 | LINES 16 | COLORS 1

`moveToNail()`/`pMove()` treats `PIN1+PIN2+PIN3` as an absolute nail index
0-287 (`MAXNAIL = 287`, `src/main.cpp:18`). Consecutive lines are ordered so
the computed displacement is always at least 5 (`STOLERANCE = 5`,
`src/main.cpp:19`), and the min edge (Pin 0) and max edge (Pin 287) are kept
non-adjacent (they're exactly 287 apart, which used to collapse to a zero
displacement in the old `moveToNail` wrap math).

`Pin` is the raw index (0-287, `Pin1+Pin2+Pin3`) as stored in `path.txt`.

## Lines 1-12 — normal branch coverage

Plain CW/CCW moves, a single thread color change (real string-art paths only
switch thread once, not every line), and the min/max edges.

| Line | Dir | Pin | Pin1 | Pin2 | Pin3 | Color |
|-----:|-----|----:|-----:|-----:|-----:|-------|
| 1  | CW  | 150 | 40  | 50  | 60  |  |
| 2  | CCW | 125 | 100 | 20  | 5   |  |
| 3  | CW  | 90  | 30  | 30  | 30  | → color 2 |
| 4  | CW  | 40  | 20  | 20  | 0   |  |
| 5  | CW  | 0   | 0   | 0   | 0   | min edge |
| 6  | CW  | 45  | 15  | 15  | 15  |  |
| 7  | CW  | 287 | 120 | 120 | 47  | max edge |
| 8  | CCW | 120 | 40  | 40  | 40  |  |
| 9  | CCW | 50  | 50  | 0   | 0   |  |
| 10 | CCW | 180 | 60  | 60  | 60  |  |
| 11 | CCW | 140 | 70  | 0   | 70  |  |
| 12 | CCW | 220 | 120 | 100 | 0   |  |

## Lines 13-16 — pin 287 from both sides

Isolates nail 287 approached two different ways through `pMove()`, to
separate a real direction bug from the seam-dithering bug at
`src/main.cpp:126-132`:

- **Line 14** approaches from Pin 200: `err = 287-200 = 87`, under the 144
  wrap threshold — a plain, unwrapped approach.
- **Line 16** approaches from Pin 50: `err = 287-50 = 237` → wraps to `-51`
  — the platter crosses the 0/287 seam to get there.

| Line | Dir | Pin | Pin1 | Pin2 | Pin3 | Note |
|-----:|-----|----:|-----:|-----:|-----:|------|
| 13 | CW  | 200 | 70  | 70  | 60 | positions the platter away from the seam |
| 14 | CW  | 287 | 120 | 120 | 47 | approach to 287, unwrapped (err=87) |
| 15 | CCW | 50  | 50  | 0   | 0  | positions the platter on the other side of the seam |
| 16 | CW  | 287 | 120 | 120 | 47 | approach to 287, wrapped (err=237→-51) |
