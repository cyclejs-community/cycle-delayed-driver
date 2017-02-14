import { expect } from 'chai';
import xs from 'xstream';
import { makeDelayedDriver } from '../src/cycle-delayed-driver';

let testArray = [];
let driverCreated = false;

const arrayPushDriver = function(sink$) {
  sink$.addListener({
    next: item => { testArray.push(item); },
    error: e => { throw e; },
    complete: () => null
  });
}

const pushDriverOnSix = function(thing) {
  if (thing == 6) {
    driverCreated = true;
    return arrayPushDriver;
  }

  return null;
}

// Causes a stream to evaluate, which in case of streams bulit upon rejected promises 
// avoids the error associated with not handling the rejection.
const drain = function(stream$) {
  stream$.addListener({ next: () => null });
}

describe('Cycle Delayed Driver', () => {
  beforeEach(() => {
    testArray = [];
    driverCreated = false;
  });

  it('creates the inner driver when the proper item is received', () => {
    let streamWithSix = xs.of(1, 2, 6);
    let delayedDriver = makeDelayedDriver(pushDriverOnSix);

    delayedDriver(streamWithSix);

    expect(driverCreated).to.be.true;
  });

  it('does not create the inner driver when the proper item is not received', () => {
    let streamWithoutSix = xs.of(1, 2, 'cat');
    let delayedDriver = makeDelayedDriver(pushDriverOnSix);

    drain(delayedDriver(streamWithoutSix));

    expect(driverCreated).to.be.false;
  });
});
