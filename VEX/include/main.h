#pragma once

// COLOR & DIR | 62 CW, 60, CCW, 65 - 69 Color CW, 97 - 101 Color CCW
// PIN1        | 0 to 120 (DON'T USE 10 OR 13) | (PIN1 + PIN2 + PIN3) max 287
// PIN2        | 0 to 120 (DON'T USE 10 OR 13) | (PIN1 + PIN2 + PIN3) max 287
// PIN3        | 0 to 120 (DON'T USE 10 OR 13) | (PIN1 + PIN2 + PIN3) max 287

enum Button { CHECK, RIGHT, LEFT };
enum Progress { LINE, PROGRESS, CURRENTCOLOR, FUTURECOLOR, ENDTIME };
enum Position { PMOTORS, SMOTOR };
enum Sling { CCW = -1, IN = 0, CW = 1 };
enum Pid { PKP, PKD, SKP, SKD };
enum State {
  INSERTSD,
  LOADFILE,
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
  LENGTHA2, // 0 to 120 (DON'T USE 10 OR 13)
  LENGTHA1, // 0 to 120 (DON'T USE 10 OR 13)
  LENGTHB2, // 0 to 120 (DON'T USE 10 OR 13)
  LENGTHB1, // 0 to 120 (DON'T USE 10 OR 13)
  LENGTHC2, // 0 to 120 (DON'T USE 10 OR 13)
  LENGTHC1, // 0 to 120 (DON'T USE 10 OR 13)
  LENGTHD2, // 0 to 120 (DON'T USE 10 OR 13)
  LENGTHD1, // 0 to 120 (DON'T USE 10 OR 13)
  LENGTHE2, // 0 to 120 (DON'T USE 10 OR 13)
  LENGTHE1, // 0 to 120 (DON'T USE 10 OR 13)
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