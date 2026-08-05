#include "main.h"
#include "vex.h"

using namespace vex;

void screen(int state, int arr[] = {}, double darr[] = {});

void touchLed(int &state);

void calibrateThread(color thread[4]);

void detectThread(int &state, color thread[4]);