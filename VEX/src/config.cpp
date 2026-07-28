#include "config.h"

using namespace vex;

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