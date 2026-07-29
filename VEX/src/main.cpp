/*----------------------------------------------------------------------------------------*/
/*                                                                                        */
/*    Project:          String Art Robot                                                  */
/*    Module:           main.cpp                                                          */
/*    Author:           VEX                                                               */
/*    Created:          Mon July 20 2026                                                  */
/*    Description:      WIP                                                               */
/*                                                                                        */
/*----------------------------------------------------------------------------------------*/

#include "util.h"
#include "vex.h"

using namespace vex;

// CONFIGURATION
brain Brain;
timer Timer;
inertial BrainInertial = inertial();
motor PMotor1 = motor(PORT1);
motor PMotor2 = motor(PORT2);
motor PMotor3 = motor(PORT3);
motor_group PMotors = motor_group(PMotor1, PMotor2, PMotor3);
motor SMotor = motor(PORT4);
touchled TouchLED = touchled(PORT5);
bumper Bumper = bumper(PORT6);
optical Optical1 = optical(PORT7);
optical Optical2 = optical(PORT8);
optical Optical3 = optical(PORT9);
optical Optical4 = optical(PORT10);
optical Optical5 = optical(PORT11);

enum Status { INSERTSD, CALIBRATE, MENU, START, RUNNING, CHANGETHREAD, NOTHREAD, FINISH, ERROR };
enum Button { CHECK, RIGHT, LEFT };
enum Progress { LINE, PROGRESS, CURRENTCOLOR, FUTURECOLOR, ENDTIME };
enum Position { PMOTORS, SMOTOR };
enum Sling { IN, CW, CCW };
enum Pids { PKP, PKD, SKP, SKD };
enum RawConfig {
  SLOTS,    // 1 to 8
  TIME2,    // 1 to 9 * 10
  TIME1,    // 1 to 9 * 1
  LINES4,   // 1 to 9 * 1000
  LINES3,   // 1 to 9 * 100
  LINES2,   // 1 to 9 * 10
  LINES1,   // 1 to 9 * 1
  COLORS2,  // 1 to 9 * 10
  COLORS1,  // 1 to 9 * 1
  LENGTHA2, // 1 to 9, 99 < use 100 to 109, < 199 < use 110 to 119 1 in 2nd digit converts to 200
  LENGTHA1, // 1 to 9, 99 < use 1 to 9 for 2nd digit
  LENGTHB2, // 1 to 9, 99 < use 100 to 109, < 199 < use 110 to 119 1 in 2nd digit converts to 200
  LENGTHB1, // 1 to 9, 99 < use 1 to 9 for 2nd digit
  LENGTHC2, // 1 to 9, 99 < use 100 to 109, < 199 < use 110 to 119 1 in 2nd digit converts to 200
  LENGTHC1, // 1 to 9, 99 < use 1 to 9 for 2nd digit
  LENGTHD2, // 1 to 9, 99 < use 100 to 109, < 199 < use 110 to 119 1 in 2nd digit converts to 200
  LENGTHD1, // 1 to 9, 99 < use 1 to 9 for 2nd digit
  LENGTHE2, // 1 to 9, 99 < use 100 to 109, < 199 < use 110 to 119 1 in 2nd digit converts to 200
  LENGTHE1, // 1 to 9, 99 < use 1 to 9 for 2nd digit
};

enum Config {
  SLOT,
  TIME,
  LINES,
  COLORS,
  LENGTHA,
  LENGTHB,
  LENGTHC,
  LENGTHD,
  LENGTHE,
};

// COLOR & DIR | 62 CW, 60, CCW, 65 - 69 Color CW, 97 - 101 Color CCW
// PIN1        | 1 to 120 (DON'T USE 10 OR 13)
// PIN2        | 1 to 120 (DON'T USE 10 OR 13)

const int RAWCONFIGNUM = 19, CONFIGNUM = 9, SLOTNUM = 8, SLOTSIZE = 4096, MAXPOINTS = 500;
const double PINRATIO = 288.0 * 0.25;
const double pid[4] = {1, 1, 1, 1};

void calibrate(int &state) {
  state = CALIBRATE;
  // BrainInertial.calibrate();
  // while (BrainInertial.isCalibrating()) { wait(25, msec); }
  // BrainInertial.resetRotation();
  // PMotors.resetPosition();
  SMotor.resetPosition();
  TouchLED.on(vex::purple, 100);
  if (!Brain.SDcard.isInserted()) { state = INSERTSD; }
  Timer.reset();
}

void loadFile(int &state, int points[], int config[]) { // TODO Add slots
  int rawConfig[RAWCONFIGNUM] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
  if (Brain.SDcard.exists("path.txt")) {
    int fileSize = Brain.SDcard.size("path.txt");
    uint8_t buffer[fileSize];
    Brain.SDcard.loadfile("path.txt", buffer, sizeof(buffer));
    for (int i = 0; i < RAWCONFIGNUM; i++) {
      rawConfig[i] = buffer[i];
      //  + (rawConfig[SLOTS] * SLOTSIZE)
      printf("Config %d ", i);
      printf("%d\n", rawConfig[i]);
      wait(25, msec);
    }
    config[SLOT] = rawConfig[SLOTS];
    config[TIME] = (10 * rawConfig[TIME2]) + (1 * rawConfig[TIME1]);
    config[LINES] = (1000 * rawConfig[LINES4]) + (100 * rawConfig[LINES3]) +
                    (10 * rawConfig[LINES2]) + (1 * rawConfig[LINES1]);
    config[COLORS] = (10 * rawConfig[COLORS2]) + (1 * rawConfig[COLORS1]);
    printf("Slot %d\n", config[SLOT]);
    printf("Time %d\n", config[TIME]);
    printf("Lines %d\n", config[LINES]);
    printf("Colors %d\n", config[COLORS]);

    for (int i = 0; i < (fileSize - RAWCONFIGNUM); i++) {
      points[i] = buffer[i + RAWCONFIGNUM];
      //  + (rawConfig[SLOTS] * SLOTSIZE)
      printf("Bit %d ", i);
      printf("%d\n", points[i]);
      wait(25, msec);
    }
  } else {
    state = INSERTSD;
  }
  state = MENU;
}

void screen(int &state, int config[], int progress[], double position[]) {
  Brain.Screen.clearScreen();
  Brain.Screen.setCursor(1, 1);
  if (state == INSERTSD) {
    Brain.Screen.print("Insert SD-Card &");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("Restart Program");
  } else if (state == CALIBRATE) {
    Brain.Screen.print("Calibrating and");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("Loading Points");
  } else if (state == MENU) {
    Brain.Screen.print("Menu");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("Slot:%d", config[SLOT]);
  } else if (state == START) {
    Brain.Screen.print("Start");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("Time:%d", config[TIME]);
    Brain.Screen.setCursor(3, 1);
    Brain.Screen.print("Lines:%d", config[LINES]);
    Brain.Screen.setCursor(4, 1);
    Brain.Screen.print("Colors:%d", config[COLORS]);
  } else if (state == RUNNING) {
    Brain.Screen.print("Running");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("P:%f", position[PMOTORS]);
    Brain.Screen.setCursor(3, 1);
    Brain.Screen.print("S:%f", position[SMOTOR]);
    Brain.Screen.setCursor(4, 1);
    Brain.Screen.print("L:%d", progress[LINE]);
  } else if (state == CHANGETHREAD) {
    Brain.Screen.print("Change Thread");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("To %d", progress[FUTURECOLOR]);
  } else if (state == NOTHREAD) {
    Brain.Screen.print("Progress");
  } else if (state == FINISH) {
    Brain.Screen.print("Finished");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("%f", Timer.value());
  } else {
    Brain.Screen.print("ERROR");
  }
}

void touchLed(int &state) {
  if (state == CALIBRATE) {
    TouchLED.setColor(vex::purple);
  } else if (state == MENU) {
    TouchLED.setColor(vex::blue);
  } else if (state == START) {
    TouchLED.setBlink(vex::green, 0.5, 0.5);
    while (!TouchLED.pressing()) { wait(10, msec); }
    state = RUNNING;
    touchLed(state);
  } else if (state == RUNNING) {
    TouchLED.setBlink(vex::green, 1, 0);
  } else if (state == CHANGETHREAD) {
    TouchLED.setBlink(vex::yellow, 0.5, 0.5);
    while (!TouchLED.pressing()) { wait(10, msec); }
    state = RUNNING;
    touchLed(state);
  } else if (state == NOTHREAD) {
    TouchLED.setBlink(vex::yellow, 0.5, 0.5);
    while (!TouchLED.pressing()) { wait(10, msec); }
    state = RUNNING;
    touchLed(state);
  } else if (state == FINISH) {
    TouchLED.setBlink(vex::white, 0.5, 0.5);
  } else {
    TouchLED.setBlink(vex::red, 0.5, 0.5);
  }
}

void menu(int &state, int config[]) {
  while (state == MENU) {
    if (Brain.buttonRight.pressing()) {
      while (Brain.buttonRight.pressing()) { wait(10, msec); }
      config[SLOT]++;
      clamp(config[SLOT], 1, SLOTNUM);
    } else if (Brain.buttonLeft.pressing()) {
      while (Brain.buttonLeft.pressing()) { wait(10, msec); }
      config[SLOT]--;
      clamp(config[SLOT], 1, SLOTNUM);
    } else if (Brain.buttonCheck.pressing()) {
      while (Brain.buttonCheck.pressing()) { wait(10, msec); }
      state = START;
      clamp(config[SLOT], 1, SLOTNUM);
    }
    wait(25, msec);
  }
}

void detectThread(int &state) {
  if (state == RUNNING) {
    color nothread = vex::yellow;
    if (Optical1.color() == nothread || Optical2.color() == nothread ||
        Optical3.color() == nothread || Optical4.color() == nothread ||
        Optical5.color() == nothread) {
      state = NOTHREAD;
    }
  }
}

void platterMove(double target) { // TODO finish P controller
  double tar = target / PINRATIO;
  PMotors.setVelocity(100, percent);
  PMotors.spinTo(tar, rev, true);

  // double delta = target - position[PMOTORS];
  // double error = delta;
  // int velocity = 100;
  // if (delta > 0) {
  //   PMotors.spin(forward);
  // } else {
  //   PMotors.spin(reverse);
  // }
  // wait(10, msec);
  // while (error >= TOLERANCE && velocity > 10) {
  //   error = target - position[PMOTORS];
  //   velocity = 100 * pid[PKP] * abs(error / delta);
  //   clamp(velocity, 10, 100);
  //   if (error > 0) {
  //     PMotors.spin(forward, velocity, pct);
  //   } else {
  //     PMotors.spin(reverse, velocity, pct);
  //   }
  //   wait(10, msec);
  // }
  // PMotors.stop(hold);
}

void slingMove(int move) {
  if (move == IN) {
    SMotor.setVelocity(100, percent);
    SMotor.spinTo(0, deg, true);
  } else if (move == CW) {
    SMotor.setVelocity(100, percent);
    SMotor.spinFor(-180, deg, true);
  } else if (move == CCW) {
    SMotor.setVelocity(100, percent);
    SMotor.spinFor(180, deg, true);
  }
}

void motorPosition(double position[2]) {
  double pos1 = 0, pos2 = 0, pos3 = 0;
  pos1 = PMotor1.position(rev) * PINRATIO;
  pos2 = PMotor2.position(rev) * PINRATIO;
  pos3 = PMotor3.position(rev) * PINRATIO;
  position[PMOTORS] = normalize(((pos1 + pos2 + pos3) / 3.0), 288, true);
  position[SMOTOR] = normalize(SMotor.position(deg), 360, false);
}

void move(int &state, int points[], int config[], int progress[]) {
  touchLed(state);
  int dir = 0, move = 0;
  while (!(state == INSERTSD || state == ERROR || state == FINISH) &&
         progress[LINE] < config[LINES]) {
    int i = 3 * progress[LINE];
    if (state == RUNNING) {
      if ((points[i] != 10 && points[i] != 13) || (points[i + 1] != 10 && points[i + 1] != 13) ||
          (points[i + 2] != 10 && points[i + 2] != 13)) {
        if (points[i] == 62) {
          dir = CW;
        } else if (points[i] == 60) {
          dir = CCW;
        } else if (points[i] <= 69 && points[i] >= 65) {
          dir = CW;
          progress[FUTURECOLOR] = points[i] - 64;
          state = CHANGETHREAD;
          touchLed(state);
        } else if (points[i] <= 101 && points[i] >= 97) {
          dir = CCW;
          progress[FUTURECOLOR] = points[i] - 96;
          state = CHANGETHREAD;
          touchLed(state);
        } else {
          state = ERROR;
        }
        if (state == RUNNING) {
          move = points[i + 1] + points[i + 2];
          platterMove(move);
          slingMove(dir);
        }
      } else {
        state = ERROR;
      }
      progress[PROGRESS] = 100.0 * (progress[LINE] / config[LINES]);
      clamp(progress[PROGRESS], 0, 100);
      progress[LINE]++;
    }
    wait(10, msec);
  }
  state = FINISH;
}

void motorTest() {
  while (true) {
    while (Brain.buttonLeft.pressing()) {
      platterMove(150);
      slingMove(CCW);
      // PMotor1.spin(forward, 100, percent);
      // wait(10, msec);
    }
    while (Brain.buttonRight.pressing()) {
      platterMove(50);
      slingMove(CW);
      // PMotor2.spin(forward, 100, percent);
      // wait(10, msec);
    }
    while (Brain.buttonCheck.pressing()) {
      platterMove(25);
      slingMove(IN);
      // PMotor3.spin(forward, 100, percent);
      // wait(10, msec);
    }
    wait(10, msec);
  }
}

int main() {
  int state = CALIBRATE;
  double position[2] = {0, 0};
  int progress[5] = {0, 0, 0, 0, 0};
  int config[CONFIGNUM] = {0, 0, 0, 0, 0, 0, 0, 0, 0};
  int points[MAXPOINTS] = {0};

  setvbuf(stdout, NULL, _IONBF, 0);
  printf("\033[2J");
  printf("Boot\n");
  calibrate(state);
  printf("Calibrate\n");
  loadFile(state, points, config);
  printf("LoadFile\n");

  // thread motorThread = thread(motorTest);

  while (true) {
    screen(state, config, progress, position);
    printf("Screen\n");
    touchLed(state);
    printf("touchLed\n");
    menu(state, config);
    printf("Menu\n");
    motorPosition(position);
    printf("MotorPosition\n");
    printf("%d\n", state);
    touchLed(state);
    move(state, points, config, progress);
    printf("Move\n");
    detectThread(state);
    printf("DetectThread\n");

    if (!Brain.SDcard.isInserted()) { state = INSERTSD; }
    wait(10, msec);
  }
}
// thisisanedit