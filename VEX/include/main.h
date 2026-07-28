#pragma once

// COLOR & DIR | 62 CW, 60, CCW, 65 - 69 Color CW, 97 - 101 Color CCW
// PIN1        | 0 to 120 (DON'T USE 10 OR 13)
// PIN2        | 0 to 120 (DON'T USE 10 OR 13)

enum Button { CHECK, RIGHT, LEFT };
enum Progress { LINE, PROGRESS, CURRENTCOLOR, FUTURECOLOR, ENDTIME };
enum Position { PMOTORS, SMOTOR };
enum Sling { IN, CW, CCW };
enum Pid { PKP, PKD, SKP, SKD };
enum State {
  INSERTSD,
  CALIBRATE,
  MENU,
  START,
  RUNNING,
  CHANGETHREAD,
  NOTHREAD,
  FINISH,
  ERROR
};
enum RawConfig {
  SLOTS,    // 0 to 8
  LINES4,   // 0 to 9 * 1000
  LINES3,   // 0 to 9 * 100
  LINES2,   // 0 to 9 * 10
  LINES1,   // 0 to 9 * 1
  COLORS2,  // 0 to 9 * 10
  COLORS1,  // 0 to 9 * 1
  LENGTHA2, // 0 to 9, 99 < use 100 to 109, < 199 < use 110 to 119 1 in 2nd digit converts to 200
  LENGTHA1, // 0 to 9, 99 < use 1 to 9 for 2nd digit
  LENGTHB2, // 0 to 9, 99 < use 100 to 109, < 199 < use 110 to 119 1 in 2nd digit converts to 200
  LENGTHB1, // 0 to 9, 99 < use 1 to 9 for 2nd digit
  LENGTHC2, // 0 to 9, 99 < use 100 to 109, < 199 < use 110 to 119 1 in 2nd digit converts to 200
  LENGTHC1, // 0 to 9, 99 < use 1 to 9 for 2nd digit
  LENGTHD2, // 0 to 9, 99 < use 100 to 109, < 199 < use 110 to 119 1 in 2nd digit converts to 200
  LENGTHD1, // 0 to 9, 99 < use 1 to 9 for 2nd digit
  LENGTHE2, // 0 to 9, 99 < use 100 to 109, < 199 < use 110 to 119 1 in 2nd digit converts to 200
  LENGTHE1, // 0 to 9, 99 < use 1 to 9 for 2nd digit
};
enum Config {
  SLOT,
  LINES,
  COLORS,
  LENGTHA,
  LENGTHB,
  LENGTHC,
  LENGTHD,
  LENGTHE,
};