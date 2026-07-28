/*----------------------------------------------------------------------------------------*/
/*                                                                                        */
/*    Project:          String Art Robot                                                  */
/*    Module:           main.cpp                                                          */
/*    Author:           VEX                                                               */
/*    Created:          Mon July 20 2026                                                  */
/*    Description:      WIP                                                               */
/*                                                                                        */
/*----------------------------------------------------------------------------------------*/

#include "config.h"
#include "sensors.h"
#include "util.h"
#include "vex.h"
#include "main.h"

const int RAWCONFIGNUM = 17, CONFIGNUM = 9, SLOTNUM = 8, SLOTSIZE = 4096, MAXPOINTS = 500;
const double PINRATIO = 288.0 * 0.25, TOLERANCE = 0.5;
const double pid[4] = {1, 1, 1, 1};

void calibrate(int &state) {
  state = CALIBRATE;
  PMotors.resetPosition();
  SMotor.resetPosition();
  TouchLED.on(vex::purple, 100);
  if (!Brain.SDcard.isInserted()) { state = INSERTSD; }
  Timer.reset();
  touchLed(state);
  screen(state);
}

void loadFile(int &state, int points[], int config[]) { // TODO add slots
  int rawConfig[RAWCONFIGNUM] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
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
    config[LINES] = (1000 * rawConfig[LINES4]) + (100 * rawConfig[LINES3]) +
                    (10 * rawConfig[LINES2]) + (1 * rawConfig[LINES1]);
    config[COLORS] = (10 * rawConfig[COLORS2]) + (1 * rawConfig[COLORS1]);
    printf("Slot %d\n", config[SLOT]);
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
    touchLed(state);
    screen(state, config);
  }
  state = MENU;
  touchLed(state);
  screen(state, config);
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
      touchLed(state);
      screen(state, config);
    }
    wait(25, msec);
  }
}

void updateMotorPosition(double position[2]) {
  double pos1 = 0, pos2 = 0, pos3 = 0;
  pos1 = PMotor1.position(rev) * PINRATIO;
  pos2 = PMotor2.position(rev) * PINRATIO;
  pos3 = PMotor3.position(rev) * PINRATIO;
  position[PMOTORS] = normalize(((pos1 + pos2 + pos3) / 3.0), 288, true);
  position[SMOTOR] = normalize(SMotor.position(deg), 360, false);
}

double getMotorPosition(int motor = 0) {
  double pos1 = 0, pos2 = 0, pos3 = 0, ppos = 0, spos = 0;
  pos1 = PMotor1.position(rev) * PINRATIO;
  pos2 = PMotor2.position(rev) * PINRATIO;
  pos3 = PMotor3.position(rev) * PINRATIO;
  ppos = normalize(((pos1 + pos2 + pos3) / 3.0), 288, true);
  spos = normalize(SMotor.position(deg), 360, false);
  if (motor == 1) {
    return ppos;
  } else if (motor == 2) {
    return spos;
  }
  return 0;
}

void platterMove(double target, double timeout = 1) { 
  double tar = target / PINRATIO;
  PMotors.setVelocity(100, percent);
  PMotors.spinTo(tar, rev, true);

  // TODO finish P controller, dynamic direction changing
  double delta = target - getMotorPosition(1);
  double error = delta;
  int velocity = 100;
  if (delta > 0) {
    PMotors.spin(forward);
  } else {
    PMotors.spin(reverse);
  }
  wait(10, msec);
  while (Timer.value() < timeout && error >= TOLERANCE && velocity > 10) {
    error = target - getMotorPosition(1);
    velocity = 100 * pid[PKP] * abs(error / delta);
    clamp(velocity, 10, 100);
    if (error > 0) {
      PMotors.spin(forward, velocity, pct);
    } else {
      PMotors.spin(reverse, velocity, pct);
    }
    wait(10, msec);
  }
  PMotors.stop(hold);
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
          screen(state);
          touchLed(state);
        } else if (points[i] <= 101 && points[i] >= 97) {
          dir = CCW;
          progress[FUTURECOLOR] = points[i] - 96;
          state = CHANGETHREAD;
          screen(state);
          touchLed(state);
        } else {
          state = ERROR;
          screen(state);
          touchLed(state);
        }
        if (state == RUNNING) {
          move = points[i + 1] + points[i + 2];
          platterMove(move);
          slingMove(dir);
        }
      } else {
        state = ERROR;
        screen(state);
        touchLed(state);
      }
      progress[PROGRESS] = 100.0 * (progress[LINE] / config[LINES]);
      clamp(progress[PROGRESS], 0, 100);
      progress[LINE]++;
      screen(state, progress);
    }
    wait(10, msec);
  }
  state = FINISH;
  screen(state);
  touchLed(state);
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

  setvbuf(stdout, NULL, _IONBF, 0); // for console display
  printf("\033[2J");                // clear console display
  printf("Boot\n");
  calibrate(state);
  printf("Calibrate\n");
  loadFile(state, points, config);
  printf("LoadFile\n");
  screen(state, config);
  printf("Screen\n");
  touchLed(state);
  printf("touchLed\n");

  // thread motorThread = thread(motorTest);

  while (true) {
    menu(state, config);
    printf("Menu\n");
    updateMotorPosition(position);
    screen(state, config, position);
    printf("MotorPosition\n");
    printf("%d\n", state);
    move(state, points, config, progress);
    printf("Move\n");
    detectThread(state);
    printf("DetectThread\n");

    if (!Brain.SDcard.isInserted()) {
      state = INSERTSD;
      touchLed(state);
      screen(state);
    }

    wait(10, msec);
  }
}