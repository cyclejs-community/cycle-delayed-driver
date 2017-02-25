import xs from 'xstream';
import {adapt} from '@cycle/run/lib/adapt';

let innerDriverCreatedProducer = {
  start: function(listener) {
    this.listener = listener;
    this.tryPublishResolution();
  },
  stop: function(listener) {
    this.listener = null;
  },
  resolution: null,
  tryPublishResolution: function() {
    if (this.listener && this.resolution) {
      this.listener.next(resolution);
    }
  },
  creationSucceeded: function() {
    this.resolution = {
      created: true,
      reason: null
    };

    this.tryPublishResolution();
  },
  creationFailed: function(reason) {
    this.resolution = {
      created: false,
      reason: reason
    };

    this.tryPublishResolution();
  },
};

/*
 * Creates a listener for to the supplied stream and for each value attempts to create the inner driver.
 * Once the inner driver is created, will use the supplied resolve method to resolve a promise with the inner
 * driver's stream.
 */
function hookDriverCreationListener(sink$, createDriverFunction, outputResolve, outputReject) {
  let thisListener = {
    next: sinkItem => {
      let innerDriver = createDriverFunction(sinkItem);

      if (innerDriver) {
        sink$.removeListener(thisListener);
        outputResolve(innerDriver(sink$));
      }
    },
    error: e => { throw e; },
    complete: () => { outputReject(new Error('Stream terminated before inner driver was created')); }
  };

  sink$.addListener(thisListener);
}

export function makeDelayedDriver(createDriverFunction) {
  let driver = function delayedDriver(sink$) {

    let innerDriverCreated$ = xs.createWithMemory(innerDriverCreatedProducer);

    let innerSourcePromise = new Promise(
      function(resolve, reject) {
        hookDriverCreationListener(sink$, createDriverFunction, resolve, reject, innerDriverCreatedProducer);
      }).catch((reason) => innerDriverCreatedProducer.creationFailed(reason));

    const source = {
      innerDriverSource: () => adapt(xs.fromPromise(innerSourcePromise).flatten()),
      driverCreatedSteam: () => adapt(innerDriverCreated$)
    }

    return source;
  };

  return driver;
}
