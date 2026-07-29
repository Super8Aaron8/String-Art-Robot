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

enum Status
{
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
enum Button
{
  CHECK,
  RIGHT,
  LEFT
};
enum Progress
{
  LINE,
  PROGRESS,
  CURRENTCOLOR,
  FUTURECOLOR,
  ENDTIME
};
enum Position
{
  PMOTORS,
  SMOTOR
};
enum Sling
{
  IN,
  CW,
  CCW
};
enum Pids
{
  PKP,
  PKD,
  SKP,
  SKD
};
enum RawConfig
{
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

enum Config
{
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

void calibrate(int &state)
{
  state = CALIBRATE;
  // BrainInertial.calibrate();
  // while (BrainInertial.isCalibrating()) { wait(25, msec); }
  // BrainInertial.resetRotation();
  // PMotors.resetPosition();
  SMotor.resetPosition();
  TouchLED.on(vex::purple, 100);
  if (!Brain.SDcard.isInserted())
  {
    state = INSERTSD;
  }
  Timer.reset();
}

void loadFile(int &state, int points[], int config[])
{ // TODO Add slots
  int rawConfig[RAWCONFIGNUM] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
  if (Brain.SDcard.exists("path.txt"))
  {
    int fileSize = Brain.SDcard.size("path.txt");
    uint8_t buffer[fileSize];
    Brain.SDcard.loadfile("path.txt", buffer, sizeof(buffer));
    for (int i = 0; i < RAWCONFIGNUM; i++)
    {
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

    for (int i = 0; i < (fileSize - RAWCONFIGNUM); i++)
    {
      points[i] = buffer[i + RAWCONFIGNUM];
      //  + (rawConfig[SLOTS] * SLOTSIZE)
      printf("Bit %d ", i);
      printf("%d\n", points[i]);
      wait(25, msec);
    }
  }
  else
  {
    state = INSERTSD;
  }
  state = MENU;
}

void screen(int &state, int config[], int progress[], double position[])
{
  Brain.Screen.clearScreen();
  Brain.Screen.setCursor(1, 1);
  if (state == INSERTSD)
  {
    Brain.Screen.print("Insert SD-Card &");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("Restart Program");
  }
  else if (state == CALIBRATE)
  {
    Brain.Screen.print("Calibrating and");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("Loading Points");
  }
  else if (state == MENU)
  {
    Brain.Screen.print("Menu");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("Slot:%d", config[SLOT]);
  }
  else if (state == START)
  {
    Brain.Screen.print("Start");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("Time:%d", config[TIME]);
    Brain.Screen.setCursor(3, 1);
    Brain.Screen.print("Lines:%d", config[LINES]);
    Brain.Screen.setCursor(4, 1);
    Brain.Screen.print("Colors:%d", config[COLORS]);
  }
  else if (state == RUNNING)
  {
    Brain.Screen.print("Running");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("P:%f", position[PMOTORS]);
    Brain.Screen.setCursor(3, 1);
    Brain.Screen.print("S:%f", position[SMOTOR]);
    Brain.Screen.setCursor(4, 1);
    Brain.Screen.print("L:%d", progress[LINE]);
  }
  else if (state == CHANGETHREAD)
  {
    Brain.Screen.print("Change Thread");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("To %d", progress[FUTURECOLOR]);
  }
  else if (state == NOTHREAD)
  {
    Brain.Screen.print("Progress");
  }
  else if (state == FINISH)
  {
    Brain.Screen.print("Finished");
    Brain.Screen.setCursor(2, 1);
    Brain.Screen.print("%f", Timer.value());
  }
  else
  {
    Brain.Screen.print("ERROR");
  }
}

void touchLed(int &state)
{
  if (state == CALIBRATE)
  {
    TouchLED.setColor(vex::purple);
  }
  else if (state == MENU)
  {
    TouchLED.setColor(vex::blue);
  }
  else if (state == START)
  {
    TouchLED.setBlink(vex::green, 0.5, 0.5);
    while (!TouchLED.pressing())
    {
      wait(10, msec);
    }
    state = RUNNING;
    touchLed(state);
  }
  else if (state == RUNNING)
  {
    TouchLED.setBlink(vex::green, 1, 0);
  }
  else if (state == CHANGETHREAD)
  {
    TouchLED.setBlink(vex::yellow, 0.5, 0.5);
    while (!TouchLED.pressing())
    {
      wait(10, msec);
    }
    state = RUNNING;
    touchLed(state);
  }
  else if (state == NOTHREAD)
  {
    TouchLED.setBlink(vex::yellow, 0.5, 0.5);
    while (!TouchLED.pressing())
    {
      wait(10, msec);
    }
    state = RUNNING;
    touchLed(state);
  }
  else if (state == FINISH)
  {
    TouchLED.setBlink(vex::white, 0.5, 0.5);
  }
  else
  {
    TouchLED.setBlink(vex::red, 0.5, 0.5);
  }
}

void menu(int &state, int config[])
{
  while (state == MENU)
  {
    if (Brain.buttonRight.pressing())
    {
      while (Brain.buttonRight.pressing())
      {
        wait(10, msec);
      }
      config[SLOT]++;
      clamp(config[SLOT], 1, SLOTNUM);
    }
    else if (Brain.buttonLeft.pressing())
    {
      while (Brain.buttonLeft.pressing())
      {
        wait(10, msec);
      }
      config[SLOT]--;
      clamp(config[SLOT], 1, SLOTNUM);
    }
    else if (Brain.buttonCheck.pressing())
    {
      while (Brain.buttonCheck.pressing())
      {
        wait(10, msec);
      }
      state = START;
      clamp(config[SLOT], 1, SLOTNUM);
    }
    wait(25, msec);
  }
}

void detectThread(int &state)
{
  if (state == RUNNING)
  {
    color nothread = vex::yellow;
    if (Optical1.color() == nothread || Optical2.color() == nothread ||
        Optical3.color() == nothread || Optical4.color() == nothread ||
        Optical5.color() == nothread)
    {
      state = NOTHREAD;
    }
  }
}

void platterMove(double target)
{ // TODO finish P controller
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

void slingMove(int move)
{
  if (move == IN)
  {
    SMotor.setVelocity(100, percent);
    SMotor.spinTo(0, deg, true);
  }
  else if (move == CW)
  {
    SMotor.setVelocity(100, percent);
    SMotor.spinFor(-180, deg, true);
  }
  else if (move == CCW)
  {
    SMotor.setVelocity(100, percent);
    SMotor.spinFor(180, deg, true);
  }
}

void motorPosition(double position[2])
{
  double pos1 = 0, pos2 = 0, pos3 = 0;
  pos1 = PMotor1.position(rev) * PINRATIO;
  pos2 = PMotor2.position(rev) * PINRATIO;
  pos3 = PMotor3.position(rev) * PINRATIO;
  position[PMOTORS] = normalize(((pos1 + pos2 + pos3) / 3.0), 288, true);
  position[SMOTOR] = normalize(SMotor.position(deg), 360, false);
}

void move(int &state, int points[], int config[], int progress[])
{
  touchLed(state);
  int dir = 0, move = 0;
  while (!(state == INSERTSD || state == ERROR || state == FINISH) &&
         progress[LINE] < config[LINES])
  {
    int i = 3 * progress[LINE];
    if (state == RUNNING)
    {
      if ((points[i] != 10 && points[i] != 13) || (points[i + 1] != 10 && points[i + 1] != 13) ||
          (points[i + 2] != 10 && points[i + 2] != 13))
      {
        if (points[i] == 62)
        {
          dir = CW;
        }
        else if (points[i] == 60)
        {
          dir = CCW;
        }
        else if (points[i] <= 69 && points[i] >= 65)
        {
          dir = CW;
          progress[FUTURECOLOR] = points[i] - 64;
          state = CHANGETHREAD;
          touchLed(state);
        }
        else if (points[i] <= 101 && points[i] >= 97)
        {
          dir = CCW;
          progress[FUTURECOLOR] = points[i] - 96;
          state = CHANGETHREAD;
          touchLed(state);
        }
        else
        {
          state = ERROR;
        }
        if (state == RUNNING)
        {
          move = points[i + 1] + points[i + 2];
          platterMove(move);
          slingMove(dir);
        }
      }
      else
      {
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

void motorTest()
{
  while (true)
  {
    while (Brain.buttonLeft.pressing())
    {
      platterMove(150);
      slingMove(CCW);
      // PMotor1.spin(forward, 100, percent);
      // wait(10, msec);
    }
    while (Brain.buttonRight.pressing())
    {
      platterMove(50);
      slingMove(CW);
      // PMotor2.spin(forward, 100, percent);
      // wait(10, msec);
    }
    while (Brain.buttonCheck.pressing())
    {
      platterMove(25);
      slingMove(IN);
      // PMotor3.spin(forward, 100, percent);
      // wait(10, msec);
    }
    wait(10, msec);
  }
}

void moveplatter(double positionTarget, double &position, double backlashDeletionDegrees, double leftOffset)
{
  double leadingTarget = 0;
  double laggingTarget = 0;
  int direction = 1;
  int fastSpeed = 20;
  int midSpeed = 10;
  int slowSpeed = 2;
  double midDist = 130;
  double slowDist = 10;
  bool isthere1 = false;
  bool isthere2 = false;
  bool isthere3 = false;
  /* int prevnail = 0;
   int dist = 0;
   prevnail = dnormalize(position, 1440.0, false);
   if(prevnail<0)
   prevnail +=1440;
   prevnail = prevnail/5;

   dist = target-prevnail;

   if (fabs(dist)>(fabs(target+288-prevnail)))
   dist = target+288-prevnail;
   if (fabs(dist)>(fabs(target-288)-prevnail))
   dist = (target-288)-prevnail;

   positionTarget = position+dist*5;
   */
  // figure out how to find prevnail prevnail = 0;
  // figure out how to turn prevnail, target, current position into positiontarget

  if (position > positionTarget)
    direction = -1;

  else
    direction = 1;

  leadingTarget = positionTarget + direction * backlashDeletionDegrees;
  laggingTarget = positionTarget;

  position = positionTarget;

  if (direction == -1)
  {
    leadingTarget += leftOffset;
    laggingTarget += leftOffset;
  }

  if (fabs(PMotor3.position(degrees) - laggingTarget) > midDist)
  {
    PMotor1.spin(forward, direction * fastSpeed, percent);
    PMotor2.spin(forward, direction * fastSpeed, percent);
    PMotor3.spin(forward, direction * fastSpeed, percent);
  }
  // slow down when close (make this a PID later if u want)
  while (fabs(PMotor3.position(degrees) - laggingTarget) > midDist)
  {
  }
  if (fabs(PMotor3.position(degrees) - laggingTarget) > slowDist)
  {
    PMotor1.spin(forward, direction * midSpeed, percent);
    PMotor2.spin(forward, direction * midSpeed, percent);
    PMotor3.spin(forward, direction * midSpeed, percent);
  }
  while (fabs(PMotor3.position(degrees) - laggingTarget) > slowDist)
  {
  }
  PMotor1.spin(forward, direction * slowSpeed, percent);
  PMotor2.spin(forward, direction * slowSpeed, percent);
  PMotor3.spin(forward, direction * slowSpeed, percent);

  // for (int count = 0; count < 3;count++)

  while (!(isthere1 == true && isthere2 == true && isthere3 == true))
  {

    if (direction * (PMotor1.position(degrees) - leadingTarget) > 0)
    {
      isthere1 = true;
      PMotor1.stop(brake);
    }
    if (direction * (PMotor2.position(degrees) - leadingTarget) > 0)
    {
      isthere2 = true;
      PMotor2.stop(brake);
    }
    if (direction * (PMotor3.position(degrees) - laggingTarget) > 0)
    {
      isthere3 = true;
      PMotor3.stop(brake);
    }
  }
}

void zeroplatter(double backlashDeletionDegrees, double &leftOffset, double &position)
{
  double index = 0.5;
  bool correct = false;

  // instruct user to add bumper
  PMotor3.setPosition(0, degrees);
  PMotor2.setPosition(0, degrees);
  PMotor1.setPosition(0, degrees);

  while (!Bumper.pressing())
  {
    Brain.Screen.print("trying to zero");
    moveplatter(index, position, backlashDeletionDegrees, 0);
    index += 0.5;
    wait(0.5, seconds);
    Brain.Screen.print("trying to zero");
  }

  PMotor3.setPosition(0, degrees);
  PMotor1.setPosition(backlashDeletionDegrees, degrees);
  PMotor2.setPosition(backlashDeletionDegrees, degrees);
  index = 0.5;
  wait(5, seconds);
  // instruct user to remove bumper
  while (correct == false)
  {

    while (!(Brain.buttonRight.pressing() || Brain.buttonCheck.pressing()))
    {
    }
    if (Brain.buttonCheck.pressing())
      correct = true;
    else
    {
      while (Brain.buttonRight.pressing())
      {
      }

      moveplatter(index, position, backlashDeletionDegrees, 0);
      index += 0.5;
    }
  }
  PMotor3.setPosition(0, degrees);
  PMotor1.setPosition(backlashDeletionDegrees, degrees);
  PMotor2.setPosition(backlashDeletionDegrees, degrees);
  wait(3, seconds);
  moveplatter(25, position, backlashDeletionDegrees, 0);

  index = 25;
  correct = false;
  while (correct == false)
  {
    while (!(Brain.buttonLeft.pressing() || Brain.buttonCheck.pressing()))
    {
    }
    if (Brain.buttonCheck.pressing())
      correct = true;
    else
    {
      while (Brain.buttonLeft.pressing())
      {
      }

      moveplatter(index, position, backlashDeletionDegrees, 0);
      index -= 0.5;
    }
  }
  leftOffset = PMotor3.position(degrees);
  Brain.Screen.print("%.2f", leftOffset);
}

/*
void moveplatterto(double offsets[8], double BacklashDeletionDegrees, double positionTarget)
// first 2 offsets are the thresholds for the different zones, next 6 are the LS and RS offsets for those zones
{

  // NOTE THAT THIS FUNCTION WILL NOT MOVE TO DISTANCES LESS THAN THE BACKLASH DELETION DISTANCE WHEN THE DIRECTION IS OPPOSITE FROM THE LAST MOVEMENT
  string direction = "6767";
  double leadingTarget = 0;
  double laggingTarget = 0;
  int fastSpeed = 100;
  int slowSpeed = 5;
  double slowDist = 75 bool isthere1 = false;
  bool isthere2 = false;
  bool isthere3 = false;

  // set up true targets by applying offsets based on how far away we are from the target
  // determine direction
  if (PMotor1.position(degrees) > positionTarget)
    direction = "reverse";
  else
    direction = "forward";

  leadingTarget = positionTarget + direction * BacklaaashDeletionDegrees;
  laggingTarget = positionTarget;

  if (direction == forward)
  {
    // checking for what offset zone the platter is moving to, applying the correct offset
    if (fabs(positionTarget - PMotor1.position(degrees)) < offsets[0])
    {
      leadingTarget += offsets[2];
      laggingTarget += offsets[2];
    }
    else if (fabs(positionTarget - PMotor1.position(degrees)) < offsets[1])
    {
      leadingTarget += offsets[4];
      laggingTarget += offsets[4];
    }
    else
    {
      leadingTarget += offsets[6];
      laggingTarget += offsets[6];
    }
  }
  else
  {
    // note that there are different offset values stored for left vs right movements. This is simply a precaution against biased motors.
    if (fabs(positionTarget - PMotor1.position(degrees)) < offsets[0])
    {
      leadingTarget += offsets[3];
      laggingTarget += offsets[3];
    }
    else if (fabs(positionTarget - PMotor1.position(degrees)) < offsets[1])
    {
      leadingTarget += offsets[5];
      laggingTarget += offsets[5];
    }
    else
    {
      leadingTarget += offsets[7];
      laggingTarget += offsets[7];
    }
  }

  // actually go move the motors in the platter to those targets
  PMotor1.spin(direction, fastSpeed, percent);
  PMotor2.spin(direction, fastSpeed, percent);
  PMotor3.spin(direction, fastSpeed, percent);
  // slow down when close (make this a PID later if u want)
  while (fabs(pMotor1.position(degrees) - leadingTarget) > slowDist)
  {
  }
  PMotor1.spin(direction, slowSpeed, percent);
  PMotor2.spin(direction, slowSpeed, percent);
  PMotor3.spin(direction, slowSpeed, percent);

  for (int count = 0, count < 3, count++)
  {
    while (((fabs(PMotor1.position(degrees) - leadingTarget) > 0) && isthere1 == false) || ((fabs(PMotor2.position(degrees) - leadingTarget) > 0) && isthere2 == false) || ((fabs(PMotor3.position(degrees) - laggingTarget) > 0) && isthere3 == false))
    {
    }
    if (fabs(PMotor1.position(degrees) - leadingTarget) > 0)
    {
      isthere1 = true;
      PMotor1.stop(brake);
    }
    if (fabs(PMotor2.position(degrees) - leadingTarget) > 0)
    {
      isthere2 = true;
      PMotor2.stop(brake);
    }
    if (fabs(PMotor3.position(degrees) - laggingTarget) > 0)
    {
      isthere3 = true;
      PMotor3.stop(brake);
    }
  }
}
*/

void calibrateplatter(int ALOTOFSTUFFGOESHERE)
{

  // move with no offsets, normal backlash deletion til u hit bumber
  // remember positions of motors
  // do it again 2 times
  // set the lagging motor to zero, the leading motors to be zeroed at the lagging motor's position
  // then when you do offsets, they will take into account this one sided zero
  // note: you will have to add the offsets into the coarse movetos because these offsets might be pretty big

  /*

  homeplatter
  instruct user to add bumper
  move all motors right until u hit bumper
  back up 20 degrees
  zero all the motors
  move very slowly until you hit bumper again, this time with move function in half degree steps until you hit bumper
  measure motor position for both of these, do this again 3 times and average the resulting motor positions
  set zero for all to position of the lagging motor(if this is being weird you may need to do a funny)

  instruct user to add a thread, wrap once, tie on an opposite nail
  move to 2 nails ish left of rs offset
  instruct user to click arrow keys until threadwrapper aligns with designated nail
  true lagging position minus intended position is now the offset
  repeat for 2nd and 3rd rs offsets
  go back to zero
  instruct user to pull on thread until taught (note that its not gonna be at the zero)
  go until pretty damn far from ls offset intended
  instruct user to click arrow keys until threadwrapper aligns with designated nail
  ls offset is now true lagging position




  */
}

void movetonail(int target, int maxnails, int & nailPosition, double & position, double backlashDeletionDegrees, double leftOffset)
{
   int dist = 0;
   double positionTarget = 0;


   dist = target-nailPosition;

   if (abs(dist)>(abs(target+maxnails-nailPosition)))
   dist = target+maxnails-nailPosition;
   if (abs(dist)>(abs(target-maxnails)-nailPosition))
   dist = (target-maxnails)-nailPosition;
   positionTarget = position+dist*5;
    nailPosition = target;

   moveplatter(positionTarget, position, backlashDeletionDegrees, leftOffset);
}



int main()
{
  Brain.Screen.print("trying to zero");
  double leftOffset = 0;
  double position = 0;

  wait(3, seconds);
  zeroplatter(3, leftOffset, position);
  wait(3, seconds);
  moveplatter(25, position, 3, leftOffset);
  wait(3, seconds);
  moveplatter(150, position, 3, leftOffset);
  wait(3, seconds);
  moveplatter(300, position, 3, leftOffset);
  wait(3, seconds);
  moveplatter(0, position, 3, leftOffset);
  wait(3, seconds);
  moveplatter(-5, position, 3, leftOffset);
  wait(3, seconds);
  moveplatter(-10, position, 3, leftOffset);
  wait(3, seconds);
  moveplatter(-15, position, 3, leftOffset);
  wait(3, seconds);
  moveplatter(25, position, 3, leftOffset);
  wait(3, seconds);
  moveplatter(0, position, 3, leftOffset);
  wait(3, seconds);
  moveplatter(150, position, 3, leftOffset);
  wait(3, seconds);
  moveplatter(-150, position, 3, leftOffset);
  wait(3, seconds);
  moveplatter(0, position, 3, leftOffset);
  wait(3, seconds);
  moveplatter(900, position, 3, leftOffset);
  wait(3, seconds);
  moveplatter(905, position, 3, leftOffset);

  // moveplatterright(720, 3);
  /*for (int count = 0; count<720; count++){
  moveplatterright(count, 3);
  wait(1, seconds);
    }
  */
  /*
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

  while (true)
  {
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

    if (!Brain.SDcard.isInserted())
    {
      state = INSERTSD;
    }
    wait(10, msec);
  }
    */
  while (true)
  {
    wait(10, msec);
  }
}
// thisisanedit