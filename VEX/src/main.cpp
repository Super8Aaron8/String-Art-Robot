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

const int RAWCONFIGNUM = 17, CONFIGNUM = 7, SLOTNUM = 8, MAXPOINTS = 5000;
const double PINRATIO = 288.0 * 0.25, STOLERANCE = 5, PTOLERANCE = 0.75, NAILNUM = 288;
const double pid[2] = {2, 0.6};

void calibrate(int &state) {
  state = LOADFILE;
  screen(state);
  touchLed(state);
  PMotors.resetPosition();
  SMotor.resetPosition();
  SMotor.stop(hold);
  PMotors.stop(hold);
  SMotor.setStopping(hold);
  PMotors.setStopping(hold);
  TouchLED.on(vex::purple, 100);
  if (!Brain.SDcard.isInserted()) {
    state = INSERTSD;
    screen(state);
    touchLed(state);
  }
  Timer.reset();
}

void loadFile(int &state, int points[], int config[]) {
  int rawConfig[RAWCONFIGNUM] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
  if (Brain.SDcard.exists("path.txt")) {
    int fileSize = Brain.SDcard.size("path.txt");
    uint8_t buffer[fileSize];
    Brain.SDcard.loadfile("path.txt", buffer, sizeof(buffer));
    for (int i = 0; i < RAWCONFIGNUM; i++) {
      rawConfig[i] = buffer[i];
      wait(1, msec);
    }
    config[SLOT] = rawConfig[SLOTS];
    config[LINES] = (1000 * rawConfig[LINES4]) + (100 * rawConfig[LINES3]) +
                    (10 * rawConfig[LINES2]) + (1 * rawConfig[LINES1]);
    config[COLORS] = (10 * rawConfig[COLORS2]) + (1 * rawConfig[COLORS1]);
    for (int i = 0; i < (fileSize - RAWCONFIGNUM); i++) {
      points[i] = buffer[i + RAWCONFIGNUM];
      wait(1, msec);
    }
    state = CALIBRATE;
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
    screen(state, config);
    touchLed(state);
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
      Timer.reset();
    }
    wait(25, msec);
  }
}

void updateMotorPosition(double position[2]) {
  double pos1 = 0, pos2 = 0, pos3 = 0;
  pos1 = PMotor1.position(rev) * PINRATIO;
  pos2 = PMotor2.position(rev) * PINRATIO;
  pos3 = PMotor3.position(rev) * PINRATIO;
  position[PMOTORS] = dnormalize(((pos1 + pos2 + pos3) / 3.0), NAILNUM, true);
  position[SMOTOR] = SMotor.position(deg);
}

double getMotorPosition(int motor = 0) {
  double pos1 = 0, pos2 = 0, pos3 = 0, ppos = 0, spos = 0;
  pos1 = PMotor1.position(rev) * PINRATIO;
  pos2 = PMotor2.position(rev) * PINRATIO;
  pos3 = PMotor3.position(rev) * PINRATIO;
  ppos = dnormalize(((pos1 + pos2 + pos3) / 3.0), NAILNUM, true);
  spos = SMotor.position(deg);
  if (motor == 1) {
    return ppos;
  } else if (motor == 2) {
    return spos;
  }
  return 0;
}

void movePlatter(int &state, double target) {
  int dir = 0, count = 0, v = 100, error = 0;
  double pos = getMotorPosition(1);
  int position = pos;
  double err = 0;
  double dis[3] = {0, 0, 0};
  while (count < 5) {
    pos = getMotorPosition(1);
    position = pos;
    err = (target - pos);
    dis[0] = err;
    dis[1] = err - NAILNUM;
    dis[2] = err + NAILNUM;
    for (int i = 0; i < 2; i++) {
      for (int j = 0; j < 2 - i; j++) {
        if (fabs(dis[j]) > fabs(dis[j + 1])) {
          double tmp = dis[j];
          dis[j] = dis[j + 1];
          dis[j + 1] = tmp;
        }
      }
    }
    err = dis[0];
    if (err < 0) {
      dir = CCW;
    } else {
      dir = CW;
    }
    v = clamp(fabs(pid[PKP] * err), 0, 100);
    PMotors.spin(forward, dir * v, percent);
    (fabs(err) <= PTOLERANCE) ? count++ : count = 0;
    wait(10, msec);
    error = err;
  }
  PMotors.stop(hold);
  wait(50, msec);
}

void moveSling(int dir) {
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
    (error <= STOLERANCE) ? count++ : count = 0;
    wait(10, msec);
  }
  SMotor.stop(hold);
  wait(50, msec);
}

void calibratePlatter(int &state) {
  state = CALIBRATE;
  int count = 0;
  screen(state);
  touchLed(state);
  PMotors.setMaxTorque(0.01, Nm);
  PMotors.spin(forward, 20, percent);
  while (count <= 25) {
    if ((PMotor1.velocity(dps) == 0) && (PMotor2.velocity(dps) == 0) &&
        (PMotor3.velocity(dps) == 0)) {
      count++;
    } else {
      count = 0;
    }
    wait(10, msec);
  }
  count = 0;
  PMotors.stop();
  PMotors.setPosition(0, degrees);
  PMotor2.setMaxTorque(0.04, Nm);
  while (count <= 50) {
    if (PMotor2.velocity(dps) == 0) {
      count++;
    } else {
      PMotor2.spin(forward, -20, percent);
    }
    wait(10, msec);
  }
  PMotor2.stop();
  PMotor2.setPosition(0, degrees);
  PMotors.setVelocity(20, percent);
  wait(1, seconds);
  movePlatter(state, 120);
  movePlatter(state, 240);
  movePlatter(state, 0);
  state = MENU;
  screen(state);
  touchLed(state);
}

void move(int &state, int points[], int config[], int progress[]) {
  touchLed(state);
  int dir = 0;
  double move = 0;
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
          movePlatter(state, move);
          moveSling(dir);
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
  int state = LOADFILE;
  double pos[2] = {0, 0};
  int progress[5] = {0, 0, 0, 0, 0};
  int config[CONFIGNUM] = {0, 0, 0, 0, 0, 0, 0};
  int points[MAXPOINTS] = {0};
  color thread[4] = {};

  calibrate(state);
  loadFile(state, points, config);
  calibratePlatter(state);
  menu(state, config);
  calibrateThread(thread);

  while (true) {
    detectThread(state, thread);
    updateMotorPosition(pos);
    move(state, points, config, progress);
    screen(state, config, pos);
    wait(10, msec);
  }
}