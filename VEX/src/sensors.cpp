#include "sensors.h"
#include "config.h"
#include "main.h"

using namespace vex;

void screen(int state, int arr[], double darr[]) { // Written by Aaron Lew
  Brain.Screen.clearScreen();
  Brain.Screen.setCursor(1, 1);
  if (state == INSERTSD) {
    Brain.Screen.print("Insert SD-Card &");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("Restart Program");
  } else if (state == LOADFILE) {
    Brain.Screen.print("Loading Points");
  } else if (state == CALIBRATE) {
    Brain.Screen.print("Calibrating");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("Ensure Bumper");
    Brain.Screen.setCursor(3, 1);
    Brain.Screen.print("Is On");
  } else if (state == MENU) {
    Brain.Screen.print("Menu");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("Slot:%d", arr[SLOT]);
    Brain.Screen.setCursor(3, 1);
    Brain.Screen.print("Lines:%d", arr[LINES]);
    Brain.Screen.setCursor(4, 1);
    Brain.Screen.print("Colors:%d", arr[COLORS]);
  } else if (state == START) {
    Brain.Screen.print("Start");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("Lines:%d", arr[LINES]);
    Brain.Screen.setCursor(3, 1);
    Brain.Screen.print("Lines:%d", arr[COLORS]);
    Brain.Screen.setCursor(4, 1);
    Brain.Screen.print("Total Length:%d",
                       arr[LENGTHA] + arr[LENGTHB] + arr[LENGTHC] + arr[LENGTHD] + arr[LENGTHE]);
    Brain.Screen.setCursor(5, 1);
    Brain.Screen.print("A:%dB:%dC:%dD:%dE:%d", arr[LENGTHA], arr[LENGTHB], arr[LENGTHC],
                       arr[LENGTHD], arr[LENGTHE]);
  } else if (state == RUNNING) {
    Brain.Screen.print("Running");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("Line:%d/%d", arr[LINE], arr[LINES]);
  } else if (state == CHANGETHREAD) {
    Brain.Screen.print("Change Thread");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("To %d", arr[FUTURECOLOR]);
  } else if (state == NOTHREAD) {
    Brain.Screen.print("No Thread");
  } else if (state == FINISH) {
    Brain.Screen.print("Finished");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("%d", arr[ENDTIME]);
  } else {
    Brain.Screen.print("ERROR");
  }
}

void touchLed(int &state) { // Written by Aaron Lew
  if (state == LOADFILE) {
    TouchLED.setColor(vex::purple);
  } else if (state == CALIBRATE) {
    TouchLED.setBlink(vex::purple, 0.5, 0.5);
    while (!TouchLED.pressing()) { wait(25, msec); }
  } else if (state == MENU) {
    TouchLED.setColor(vex::blue);
  } else if (state == START) {
    TouchLED.setBlink(vex::green, 0.5, 0.5);
    while (!TouchLED.pressing()) { wait(25, msec); }
    state = RUNNING;
    screen(state);
    touchLed(state);
  } else if (state == RUNNING) {
    TouchLED.setBlink(vex::green, 1, 0);
  } else if (state == CHANGETHREAD) {
    TouchLED.setBlink(vex::yellow, 0.5, 0.5);
    while (!TouchLED.pressing()) { wait(25, msec); }
    state = RUNNING;
    screen(state);
    touchLed(state);
  } else if (state == NOTHREAD) {
    TouchLED.setBlink(vex::yellow, 0.5, 0.5);
    while (!TouchLED.pressing()) { wait(25, msec); }
    state = RUNNING;
    screen(state);
    touchLed(state);
  } else if (state == FINISH) {
    TouchLED.setBlink(vex::white, 0.5, 0.5);
    while (!TouchLED.pressing()) { wait(25, msec); }
    Brain.programStop();
  } else {
    TouchLED.setBlink(vex::red, 0.5, 0.5);
    while (true) { wait(25, msec); }
  }
}

void calibrateThread(color thread[4]) { // Written by Aaron Lew
  thread[0] = Optical1.color();
  thread[1] = Optical2.color();
  thread[2] = Optical3.color();
  thread[3] = Optical4.color();
}

void detectThread(int &state, color thread[4]) { // Written by Aaron Lew
  if (state == RUNNING) {
    if (Optical1.color() != thread[0] || Optical2.color() != thread[1] ||
        Optical3.color() != thread[2] || Optical4.color() != thread[3]) {
      state = NOTHREAD;
      screen(state);
      touchLed(state);
    }
  }
}