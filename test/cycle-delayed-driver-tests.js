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

describe('Cycle Delayed Driver', () => {
  before(() => {
    testArray = [];
    driverCreated = false;
  });

  it('creates the inner driver when the proper item is received', () => {
    let streamWithSix = xs.of(1, 2, 6);
    makeDelayedDriver(streamWithSix);

    expect(driverCreated).to.be.true;
  });

  it('does not create the inner driver when the proper item is not received', () => {
    let streamWithoutSix = xs.of(1, 2, 'cat');
    makeDelayedDriver(streamWithoutSix);

    expect(driverCreated).to.be.false;
  });
});
