# Current Path Route

SLOT 1 | LINES 12 | COLORS 1

A test path that exercises the normal branches of `move()` (`src/main.cpp:340`):
plain CW/CCW moves, a single thread color change (real string-art paths only
switch thread once, not every line), and the zero-distance and max-distance
(pin sum 287, the `PIN1+PIN2+PIN3` cap in `include/main.h:4-6`) edges. No pin
byte is 10 or 13.

| Line | Dir | Pin | Pin1 | Pin2 | Pin3 | Color |
|-----:|-----|----:|-----:|-----:|-----:|-------|
| 1  | CW  | 150 | 40  | 50  | 60  |  |
| 2  | CCW | 125 | 100 | 20  | 5   |  |
| 3  | CW  | 90  | 30  | 30  | 30  | → color 2 |
| 4  | CW  | 40  | 20  | 20  | 0   |  |
| 5  | CW  | 0   | 0   | 0   | 0   |  |
| 6  | CW  | 287 | 120 | 120 | 47  |  |
| 7  | CW  | 45  | 15  | 15  | 15  |  |
| 8  | CCW | 120 | 40  | 40  | 40  |  |
| 9  | CCW | 50  | 50  | 0   | 0   |  |
| 10 | CCW | 120 | 60  | 60  | 0   |  |
| 11 | CCW | 140 | 70  | 0   | 70  |  |
| 12 | CCW | 120 | 120 | 0   | 0   |  |
