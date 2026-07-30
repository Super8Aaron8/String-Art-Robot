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

void calibrate(int &state)
{
  state = CALIBRATE;
  PMotors.resetPosition();
  SMotor.resetPosition();
  SMotor.stop(hold);
  TouchLED.on(vex::purple, 100);
  if (!Brain.SDcard.isInserted())
  {
    state = INSERTSD;
  }
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
    for (int i = 0; i < RAWCONFIGNUM; i++)
    {
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
          screen(state, progress);
          touchLed(state);
        }
        else if (points[i] <= 101 && points[i] >= 97)
        {
          dir = CCW;
          progress[FUTURECOLOR] = points[i] - 96;
          state = CHANGETHREAD;
          screen(state, progress);
          touchLed(state);
        }
        else
        {
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
      }
      else
      {
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

void movePlatter(double positionTarget, double &position, double backlashDeletionDegrees,
                 double leftOffset)
{
  const double midDist = 130, slowDist = 10;
  const int fastSpeed = 20, midSpeed = 10, slowSpeed = 2;
  double leadingTarget = 0;
  double laggingTarget = 0;
  int direction = 1;
  bool isThere1 = false, isThere2 = false, isThere3 = false;

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
  {
    direction = -1;
  }
  else
  {
    direction = 1;
  }

  leadingTarget = positionTarget + direction * backlashDeletionDegrees;
  laggingTarget = positionTarget;
  position = positionTarget;

  if (direction == -1)
  {
    leadingTarget += leftOffset;
    laggingTarget += leftOffset;
  }

  // TODO add pid
  if (fabs(PMotor3.position(degrees) - laggingTarget) > midDist)
  {
    PMotors.spin(forward, direction * fastSpeed, percent);
    while (fabs(PMotor3.position(degrees) - laggingTarget) > midDist)
    {
      wait(10, msec);
    }
  }

  if (fabs(PMotor3.position(degrees) - laggingTarget) > slowDist)
  {
    PMotors.spin(forward, direction * midSpeed, percent);
    while (fabs(PMotor3.position(degrees) - laggingTarget) > slowDist)
    {
      wait(10, msec);
    }
  }

  PMotors.spin(forward, direction * slowSpeed, percent);

  while (isThere1 != true || isThere2 != true || isThere3 != true)
  {
    if (direction * (PMotor1.position(degrees) - leadingTarget) > 0)
    {
      isThere1 = true;
      PMotor1.stop(brake);
    }
    if (direction * (PMotor2.position(degrees) - leadingTarget) > 0)
    {
      isThere2 = true;
      PMotor2.stop(brake);
    }
    if (direction * (PMotor3.position(degrees) - laggingTarget) > 0)
    {
      isThere3 = true;
      PMotor3.stop(brake);
    }
  }
}

void zeroPlatter(double &position, double backlashDeletionDegrees, double &leftOffset, double &buttonOffset)
{
/*
to zero platter:
place needle to the right of the intended zero nail by about 1cm (not exact)
run function
it will move the nail bed right. hit the bumper before you get to the intended zero nail. ignore that this step makes no sense. it will be somewhat removed later
click the right arrow until the needle lines up with the intended nail
click check
wait until the platter moves about 1cm right of the intended nail
click the left arrow until the needle lines up again with the intended nail
click check
platter should be zero'd
*/




  double index = 0.5;
  bool correct = false;

  // instruct user to add bumper
  PMotors.setPosition(0, degrees);

PMotors.spin(forward, 20, percent);
while (!Bumper.pressing()){}
PMotors.stop(brake);
PMotors.setPosition(0, degrees);
PMotors.spin(reverse, 10, percent);
while (PMotors.position(degrees)>-10.0){}
PMotors.stop(brake);
PMotors.setPosition(0, degrees);

  while (!Bumper.pressing())
  {
    Brain.Screen.print("trying to zero");
    movePlatter(index, position, backlashDeletionDegrees, 0);
    index += 0.5;
    Brain.Screen.print("trying to zero");
  }

  PMotor3.setPosition(0, degrees);
  //if the below breaks, revert 0 to backlashdeletiondegrees
  PMotor1.setPosition(backlashDeletionDegrees, degrees);
  PMotor2.setPosition(backlashDeletionDegrees, degrees);
  index = 0.5;
  wait(3, seconds);
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

      movePlatter(index, position, backlashDeletionDegrees, 0);
      index += 0.5;
    }
  }
buttonOffset = PMotor3.position(degrees);
  PMotor3.setPosition(0, degrees);
  PMotor1.setPosition(backlashDeletionDegrees, degrees);
  PMotor2.setPosition(backlashDeletionDegrees, degrees);
  wait(3, seconds);
  movePlatter(10, position, backlashDeletionDegrees, 0);

  index = 10;
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

      movePlatter(index, position, backlashDeletionDegrees, 0);
      index -= 0.5;
    }
  }
  leftOffset = PMotor3.position(degrees);
  Brain.Screen.print("%.2f", leftOffset);
}

void moveToNail2(int target, int maxNails, int &nailPosition, double &truePosition, double &position,
                double backlashDeletionDegrees, double leftOffset)
{
  int displacementToStandard = 0;
  int displacementToForward = 0;
  int displacementToReverse = 0;
  double positionTarget = 0;
  int displacement = 0;

displacementToStandard = target-nailPosition;
displacementToForward = (target+maxNails)-nailPosition;
displacementToReverse = (target-maxNails)-nailPosition;
if (displacementToStandard!=0){
displacement = displacementToStandard;
if (abs(displacement)>(abs(displacementToForward)))
{
  displacement = displacementToForward;
}
else if (abs (displacement) > abs(displacementToReverse))
{
  displacement = displacementToReverse;
}
Brain.Screen.clearScreen();
Brain.Screen.setCursor(1,1);
Brain.Screen.print("nailmove:", "%d", displacement);
Brain.Screen.newLine();

    positionTarget = truePosition + double(displacement*5);
    nailPosition = target;
    truePosition = positionTarget;

Brain.Screen.print("postar:""%.2f", positionTarget);
    movePlatter(positionTarget, position, backlashDeletionDegrees, leftOffset);
}
  
}

void homePlatter(double &buttonOffset, double backlashDeletionDegrees)
{
  double index = 0;
  double position = 0;

//instruct user to add bumper
PMotors.setPosition(0, degrees);
PMotors.spin(forward, 20, percent);
while (!Bumper.pressing()){}
PMotors.stop(brake);
PMotors.setPosition(0, degrees);
PMotors.spin(reverse, 2, percent);
while (PMotors.position(degrees)>-10.0){}
PMotors.stop(brake);
PMotors.setPosition(0, degrees);

while (!Bumper.pressing())
  {
    Brain.Screen.print("trying to zero");
    movePlatter(index, position, backlashDeletionDegrees, 0);
    index += 0.5;
    Brain.Screen.print("trying to zero");
  }


PMotor3.setPosition(-buttonOffset, degrees);
  PMotor1.setPosition(backlashDeletionDegrees-buttonOffset, degrees);
  PMotor2.setPosition(backlashDeletionDegrees-buttonOffset, degrees);
  wait(3, seconds);
//instruct user to remove bumper
//if you want it to go back to zero now you can. I haven't had it do that here because you might not want to do that idk
}

int main()
{
  double leftOffset = 0;
  double position = 0;
  int nailPosition = 0;
  double truePosition = 0;
  double buttonOffset = 0;
  wait(3, seconds);
  zeroPlatter(position, 5, leftOffset,buttonOffset);
  wait(3, seconds);
  moveToNail2(0, 288, nailPosition, truePosition, position, 5, leftOffset);
  

  /*
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