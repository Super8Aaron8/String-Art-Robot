/*----------------------------------------------------------------------------------------*/
/*                                                                                        */
/*    Project:          String Art Robot                                                  */
/*    Module:           main.cpp                                                          */
/*    Author:           VEX                                                               */
/*    Created:          Mon July 20 2026                                                  */
/*    Description:      WIP                                                               */
/*                                                                                        */
/*----------------------------------------------------------------------------------------*/

#include "main.h"
#include "config.h"
#include "sensors.h"
#include "util.h"
#include "vex.h"

const int RAWCONFIGNUM = 17, CONFIGNUM = 9, SLOTNUM = 8, SLOTSIZE = 4096, MAXPOINTS = 500;
const double PINRATIO = 288.0 * 0.25, TOLERANCE = 5, BACKLASH = 3;
const double pid[4] = {1, 1, 0.6, 1};

void calibrate(int &state) {
  state = CALIBRATE;
  PMotors.resetPosition();
  SMotor.resetPosition();
  SMotor.stop(hold);
  TouchLED.on(vex::purple, 100);
  if (!Brain.SDcard.isInserted()) { state = INSERTSD; }
  Timer.reset();
  screen(state);
  touchLed(state);
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
      wait(5, msec);
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
      wait(5, msec);
    }
    state = MENU;
    screen(state, config);
    touchLed(state);
  } else {
    state = INSERTSD;
    screen(state, config);
    touchLed(state);
  }
}

void menu(int &state, int config[]) {
  while (state == MENU) {
    if (Brain.buttonRight.pressing()) {
      while (Brain.buttonRight.pressing()) { wait(10, msec); }
      config[SLOT]++;
      config[SLOT] = clamp(config[SLOT], 1, SLOTNUM);
      screen(state, config);
    } else if (Brain.buttonLeft.pressing()) {
      while (Brain.buttonLeft.pressing()) { wait(10, msec); }
      config[SLOT]--;
      config[SLOT] = clamp(config[SLOT], 1, SLOTNUM);
      screen(state, config);
    } else if (Brain.buttonCheck.pressing()) {
      while (Brain.buttonCheck.pressing()) { wait(10, msec); }
      state = START;
      config[SLOT] = clamp(config[SLOT], 1, SLOTNUM);
      screen(state, config);
      touchLed(state);
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
  position[SMOTOR] = SMotor.position(deg);
}

double getMotorPosition(int motor = 0) {
  double pos1 = 0, pos2 = 0, pos3 = 0, ppos = 0, spos = 0;
  pos1 = PMotor1.position(rev) * PINRATIO;
  pos2 = PMotor2.position(rev) * PINRATIO;
  pos3 = PMotor3.position(rev) * PINRATIO;
  ppos = normalize(((pos1 + pos2 + pos3) / 3.0), 288, true);
  spos = SMotor.position(deg);
  if (motor == 1) {
    return ppos;
  } else if (motor == 2) {
    return spos;
  }
  return 0;
}

void platterMove(double target) {
  double tar = target / PINRATIO;
  PMotors.setVelocity(100, percent);
  PMotors.spinTo(tar, rev, true);
}

void slingMove(int dir, int state, int config[], double position[]) {
  int pos = SMotor.position(deg);
  int target = pos + (dir * 240);
  int error = (dir == CW) ? target - pos : pos - target;
  int velocity = 100, count = 0;
  while (count <= 5) {
    pos = SMotor.position(deg);
    if ((target - pos) > 0) {
      error = target - pos;
      dir = CW;
    } else {
      error = pos - target;
      dir = CCW;
    }
    velocity = clamp((pid[SKP] * error), 0, 100);
    (velocity > 0) ? SMotor.spin(forward, dir * velocity, pct) : SMotor.stop(hold);
    screen(state, config, position);
    (error <= TOLERANCE) ? count++ : count = 0;
    printf("%d | %d | %d\n", count, error, velocity);
    wait(10, msec);
  }
  SMotor.stop(hold);
  wait(50, msec);
}

void move(int &state, int points[], int config[], int progress[], double position[]) {
  touchLed(state);
  int dir = 0, move = 0;
  while ((state != INSERTSD || state != ERROR || state != FINISH) &&
         (progress[LINE] < config[LINES])) {
    int i = 4 * progress[LINE];
    if (state == RUNNING) {
      if ((points[i] != 10 && points[i] != 13) || (points[i + 1] != 10 && points[i + 1] != 13) ||
          (points[i + 2] != 10 && points[i + 2] != 13) ||
          (points[i + 3] != 10 && points[i + 3] != 13)) {
        if (points[i] == 62) {
          dir = CW;
        } else if (points[i] == 60) {
          dir = CCW;
        } else if (points[i] <= 69 && points[i] >= 65) {
          dir = CW;
          progress[FUTURECOLOR] = points[i] - 64;
          state = CHANGETHREAD;
          screen(state, progress);
          touchLed(state);
        } else if (points[i] <= 101 && points[i] >= 97) {
          dir = CCW;
          progress[FUTURECOLOR] = points[i] - 96;
          state = CHANGETHREAD;
          screen(state, progress);
          touchLed(state);
        } else {
          state = ERROR;
          screen(state);
          touchLed(state);
        }
        if (state == RUNNING) {
          move = points[i + 1] + points[i + 2] + points[i + 3];
          printf("%d\n", move);
          platterMove(move);
          printf("Sling %f\n", SMotor.position(deg));
          slingMove(dir, state, config, position);
          printf("Done\n");
        }
      } else {
        state = ERROR;
        screen(state);
        touchLed(state);
      }
      progress[LINE]++;
      screen(state, progress);
    }
    wait(10, msec);
  }
  state = FINISH;
  screen(state);
  touchLed(state);
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
  menu(state, config);
  printf("Menu\n");

  while (true) {
    updateMotorPosition(position);
    screen(state, config, position);
    printf("MotorPosition\n");
    printf("%d\n", state);
    move(state, points, config, progress, position);
    printf("Move\n");
    // detectThread(state);
    printf("DetectThread\n");

    if (!Brain.SDcard.isInserted()) {
      state = INSERTSD;
      screen(state);
      touchLed(state);
    }

    wait(10, msec);
  }
}