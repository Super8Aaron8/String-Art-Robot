#include "util.h"

int clamp(int &num, int lower, int upper) {
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