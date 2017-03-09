import { default as chai, expect } from 'chai';
import { default as spies } from 'chai-spies';
import xs from 'xstream';
import { makeDelayedDriver } from '../src/cycle-delayed-driver';

chai.use(spies);

let testArray = [];
let driverCreated = false;

let delayedDriver = null;

const expectStreamContents = function(s$, expectedValues, completionCallback) {
  let listener = {
    next: (item) => {
      expect(item).to.eql(expectedValues.shift());
    },
    error: (err) => completionCallback(err),
    complete: () => {
      expect(expectedValues.length).to.eql(0);
      s$.removeListener(listener);
      completionCallback();
    }
  };

  s$.addListener(listener);
}

const arrayPushDriver = function(sink$) {
  sink$.addListener({
    next: item => { testArray.push(item); },
    error: e => { throw e; },
    complete: () => null
  });

  return xs.empty();
}

const oneToThreeDriver = function(sink$) {
  return xs.of('1', '2', '3');
}

const complexSourceDriver = function(sink$) {
  const source = {
    positive: () => xs.of(1, 2, 3),
    negative: () => xs.of(-1, -2, -3)
  };

  return source;
}

const driverOnSix = function(driver) {
  return function(thing) {
    if (thing == 6) {
      driverCreated = true;
      return driver;
    }

    return null;
  }
}

describe('Cycle Delayed Driver', () => {
  beforeEach(() => {
    testArray = [];
    driverCreated = false;

    delayedDriver = makeDelayedDriver(driverOnSix(arrayPushDriver));
  });

  it('creates the inner driver when the proper item is received', () => {
    let streamWithSix = xs.of(1, 2, 6);

    delayedDriver(streamWithSix);

    expect(driverCreated).to.be.true;
  });

  it('does not create the inner driver when the proper item is not received', () => {
    let streamWithoutSix = xs.of(1, 2, 'cat');

    delayedDriver(streamWithoutSix);

    expect(driverCreated).to.be.false;
  });

  it('passes the stream to the inner driver once it is created', () => {
    let inputStream = xs.of(1, 2, 6, 'oh', 'yay', 'it', 'worked');

    delayedDriver(inputStream);

    expect(testArray).to.eql(['oh', 'yay', 'it', 'worked']);
  });

  it('applies the optional transformation method on the input stream once the inner driver is created', () => {
    delayedDriver = makeDelayedDriver(driverOnSix(arrayPushDriver), false, (stream) => stream.map((x) => x * 2));
    let inputStream = xs.of(1, 2, 6, 1, 2, 3);

    delayedDriver(inputStream);

    expect(testArray).to.eql([2, 4, 6]);
  });

  it('stops trying to create the inner driver once it has been created', () => {
    let creationSpy = chai.spy(driverOnSix(arrayPushDriver));
    let delayedDriver = makeDelayedDriver(creationSpy);
    let inputStream = xs.of(1, 2, 6, 'oh', 'yay', 'it', 'worked');

    delayedDriver(inputStream);

    expect(creationSpy).to.have.been.called.exactly(3);
  });

  describe('Inner driver source', () => {
    it('returns the source of the inner driver as a stream', (done) => {
      let delayedDriver = makeDelayedDriver(driverOnSix(oneToThreeDriver));
      let inputStream = xs.of(1, 2, 6);

      let expected = ['1', '2', '3'];
      let innerSource = delayedDriver(inputStream).innerDriverSource();

      expectStreamContents(innerSource, expected, done);
    });

    it('can return a stream that emits the inner source object', (done) => {
      let delayedDriver = makeDelayedDriver(driverOnSix(complexSourceDriver), true);
      let inputStream = xs.of(1, 2, 6);

      let expected = [1, 2, 3, -1, -2, -3];
      let innerSource = delayedDriver(inputStream).innerDriverSource();

      innerSource.addListener({
        next: (complexSource) => {
          let everything$ = xs.merge(complexSource.positive(), complexSource.negative());
          expectStreamContents(everything$, expected, done);
        },
        error: (err) => done(err),
        complete: () => null
      });
    });
  });

  describe('Inner driver creation stream', () => {
    it('sends a positive resolution object when the driver is created', (done) => {
      let inputStream = xs.of(1, 2, 6);

      let expected = [{created: true, reason: null}];
      let created$ = delayedDriver(inputStream).driverCreatedSteam();

      expectStreamContents(created$, expected, done);
    });

    it('sends a negative resolution object with a proper reason when the driver failed to create', (done) => {
      let inputStream = xs.of(1, 2);

      let expected = [{created: false, reason: 'Stream terminated before inner driver was created'}];
      let created$ = delayedDriver(inputStream).driverCreatedSteam();

      expectStreamContents(created$, expected, done);
    });
  });
});
