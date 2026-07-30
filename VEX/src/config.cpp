#include "config.h"

using namespace vex;

brain Brain;
timer Timer;
inertial BrainInertial = inertial();
motor PMotor1 = motor(PORT7);
motor PMotor2 = motor(PORT8);
motor PMotor3 = motor(PORT9);
motor_group PMotors = motor_group(PMotor1, PMotor2, PMotor3);
motor SMotor = motor(PORT10);
touchled TouchLED = touchled(PORT12);
bumper Bumper = bumper(PORT5);
optical Optical1 = optical(PORT1);
optical Optical2 = optical(PORT2);
optical Optical3 = optical(PORT3);
optical Optical4 = optical(PORT4);