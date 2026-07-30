#include "sensors.h"
#include "config.h"
#include "main.h"

void screen(int state, int arr[], double darr[]) {
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
    Brain.Screen.print("A:%d B:%d C:%d D:%d E:%d", arr[LENGTHA], arr[LENGTHB], arr[LENGTHC],
                       arr[LENGTHD], arr[LENGTHE]);
  } else if (state == RUNNING) {
    Brain.Screen.print("Running");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("L:%d", arr[LINE]);
    Brain.Screen.setCursor(3, 1);
    Brain.Screen.print("Pmotor:%f", PMotor1.position(deg));
    Brain.Screen.setCursor(4, 1);
    Brain.Screen.print("Smotor:%f", (SMotor.position(deg) * 1.5));
  } else if (state == CHANGETHREAD) {
    Brain.Screen.print("Change Thread");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("To %d", arr[FUTURECOLOR]);
  } else if (state == NOTHREAD) {
    Brain.Screen.print("No Thread");
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
    while (state == FINISH) { wait(25, msec); }
  } else {
    TouchLED.setBlink(vex::red, 0.5, 0.5);
    while (true) { wait(25, msec); }
  }
}

void detectThread(int &state) {
  if (state == RUNNING) {
    color nothread = vex::yellow;
    if (Optical1.color() == nothread || Optical2.color() == nothread ||
        Optical3.color() == nothread || Optical4.color() == nothread ||
        Optical5.color() == nothread) {
      state = NOTHREAD;
      screen(state);
      touchLed(state);
    }
  }
}