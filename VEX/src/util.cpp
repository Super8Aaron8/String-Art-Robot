#include "util.h"
#include "vex.h"

int clamp(int num, int lower, int upper) {
  if (num > upper) {
    num = upper;
  } else if (num < lower) {
    num = lower;
  }
  return num;
}

double dclamp(double num, double lower, double upper) {
  if (num > upper) {
    num = upper;
  } else if (num < lower) {
    num = lower;
  }
  return num;
}

int normalize(int num, int multiple, bool pos) {
  if (multiple != 0) {
    if (pos) {
      num = abs(num % multiple);
    } else {
      num = num % multiple;
    }
    return num;
  } else {
    return num;
  }
}

double dnormalize(double num, double multiple, bool pos) {
  if (multiple != 0) {
    if (pos) {
      num = fabs(fmod(num, multiple));
    } else {
      num = fmod(num, multiple);
    }
    return num;
  } else {
    return num;
  }
}