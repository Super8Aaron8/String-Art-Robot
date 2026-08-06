#pragma once

// COLOR & DIR | 62 CW, 60 CCW, 65 - 69 Color CW, 97 - 101 Color CCW
// PIN1        | 0 to 120 (DON'T USE 10 OR 13) | (PIN1 + PIN2 + PIN3) min 0 max 287
// PIN2        | 0 to 120 (DON'T USE 10 OR 13) | (PIN1 + PIN2 + PIN3) min 0 max 287
// PIN3        | 0 to 120 (DON'T USE 10 OR 13) | (PIN1 + PIN2 + PIN3) min 0 max 287

enum Progress { LINE, PROGRESS, CURRENTCOLOR, FUTURECOLOR, ENDTIME };
enum Position { PMOTORS, SMOTOR };
enum Sling { CCW = -1, IN = 0, CW = 1 };
enum Pid { PKP, PEXIT, SKP, SEXIT };
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
  ERROR,
};
enum RawConfig {
  SLOTS,    // 1 to 8
  LINES4,   // 0 to 9 * 1000 (Thousands digit)
  LINES3,   // 0 to 9 * 100  (Hundreds digit)
  LINES2,   // 0 to 9 * 10   (Tens digit)
  LINES1,   // 0 to 9 * 1    (Ones digit)
  COLORS2,  // 0 to 9 * 10   (Tens digit)
  COLORS1,  // 0 to 9 * 1    (Ones digit)
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