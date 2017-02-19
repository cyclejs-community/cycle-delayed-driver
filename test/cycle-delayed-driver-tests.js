import { default as chai, expect } from 'chai';
import { default as spies } from 'chai-spies';
import xs from 'xstream';
import { makeDelayedDriver, streamForDelayedDriver } from '../src/cycle-delayed-driver';

chai.use(spies);

let testArray = [];
let driverCreated = false;

let delayedDriver = null;

const arrayPushDriver = function(sink$) {
  sink$.addListener({
    next: item => { debugger; testArray.push(item); },
    error: e => { throw e; },
    complete: () => null
  });

  debugger;
  return xs.empty();
}

const pushDriverOnSix = function(thing) {
  debugger;
  if (thing == 6) {
    driverCreated = true;
    return arrayPushDriver;
  }

  return null;
}

// Causes a stream to evaluate. Defined mainly for streams bulit upon rejected promises
// to avoid the error associated with not handling the rejection.
const drain = function(stream$) {
  stream$.addListener({ next: () => null });
}

describe('Cycle Delayed Driver', () => {
  beforeEach(() => {
    testArray = [];
    driverCreated = false;

    delayedDriver = makeDelayedDriver(pushDriverOnSix);
  });

  it('creates the inner driver when the proper item is received', () => {
    let streamWithSix = xs.of(1, 2, 6);

    delayedDriver(streamWithSix);

    expect(driverCreated).to.be.true;
  });

  it('does not create the inner driver when the proper item is not received', () => {
    let streamWithoutSix = xs.of(1, 2, 'cat');

    drain(delayedDriver(streamWithoutSix));

    expect(driverCreated).to.be.false;
  });

  it('passes the stream to the inner driver once it is created', () => {
    let inputStream = xs.of(1, 2, 6, 'oh', 'yay', 'it', 'worked');

    delayedDriver(inputStream);

    expect(testArray).to.eql(['oh', 'yay', 'it', 'worked']);
  });

  it('stops trying to create the inner driver once it has been created', () => {
    let creationSpy = chai.spy(pushDriverOnSix);
    let delayedDriver = makeDelayedDriver(creationSpy);
    let inputStream = xs.of(1, 2, 6, 'oh', 'yay', 'it', 'worked');

    delayedDriver(inputStream);

    expect(creationSpy).to.have.been.called.exactly(3);
  });
});

const makeExplicitProducer = function() {
  return {
    listener: null,
    start: function(listener) {
      this.listener = listener;
    },
    stop: () => null,
    produce: function(thing) {
      this.listener.next(thing);
    },
    produceMany: function(things) {
      for (const thing of things) {
        this.produce(thing);
      }
    }
  };
};

const wireProxy = function(stream$, proxyProducer) {
  stream$.addListener({
    next: (thing) => {
      proxyProducer.produce(thing);
    },
    complete: () => {
      proxyProducer.produce(null);
    }
  });
}

describe('Sink helper function', () => {
//TODO: Try doing something like in endWhen's specs
  it.only('helps create a sink that will only feed the inner driver what it cares about', () => {
    testArray = [];
    delayedDriver = makeDelayedDriver(pushDriverOnSix);

    let creationProducer = makeExplicitProducer();
    let innerProducer = makeExplicitProducer();

    let creationStream = xs.create(creationProducer);
    let interestingStream = xs.create(innerProducer);

    let delayedDriverSourceProducer = makeExplicitProducer();
    let delayedDriverSourceProxy = xs.create(delayedDriverSourceProducer);

    //let mixedStream = streamForDelayedDriver(delayedDriverProxy, creationStream, interestingStream);
    let mixedStream = xs.merge(creationStream.endWhen(delayedDriverSourceProxy), interestingStream);

    // Hook up the delayed driver source proxy
    wireProxy(delayedDriver(mixedStream), delayedDriverSourceProducer);

    creationProducer.produceMany([1, 2, 6]);
    creationProducer.produceMany(['this', 'is']);
    innerProducer.produceMany(['I', 'am']);
    creationProducer.produceMany(['not', 'important']);
    innerProducer.produceMany(['busy', 'and', 'important']);

    expect(testArray).to.eql(['I', 'am', 'busy', 'and', 'important']);
  });
});
