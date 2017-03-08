import xs from 'xstream';
import {adapt} from '@cycle/run/lib/adapt';

function makeInnerDriverCreatedProducer() {
  return {
    resolution: null,
    start: function(listener) {
      this.listener = listener;
      this.tryPublishResolution();
    },
    stop: function(listener) {
      this.listener = null;
    },
    tryPublishResolution: function() {
      if (this.listener && this.resolution) {
        this.listener.next(this.resolution);
        this.listener.complete();
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
    }
  }
}

/*
 * Creates a listener for to the supplied stream and for each value attempts to create the inner driver.
 * Once the inner driver is created, will use the supplied resolve method to resolve a promise with the inner
 * driver's stream.
 */
function hookDriverCreationListener(sink$, createDriverFunction, translateSinkFunction, outputResolve, outputReject, driverCreatedProducer) {
  let thisListener = {
    next: sinkItem => {
      let innerDriver = createDriverFunction(sinkItem);

      if (innerDriver) {
        driverCreatedProducer.creationSucceeded();
        sink$.removeListener(thisListener);
        if (translateSinkFunction) {
          outputResolve(innerDriver(translateSinkFunction(sink$)));
        }
        else {
          outputResolve(innerDriver(sink$));
        }
      }
    },
    error: e => { throw e; },
    complete: () => { outputReject(new Error('Stream terminated before inner driver was created')); }
  };

  sink$.addListener(thisListener);
}

export function makeDelayedDriver(createDriverFunction, translateSinkFunction = null) {
  let driver = function delayedDriver(sink$) {

    let innerDriverCreatedProducer = makeInnerDriverCreatedProducer();
    let innerDriverCreated$ = xs.createWithMemory(innerDriverCreatedProducer);

    let innerSourcePromise = new Promise(
      function(resolve, reject) {
        hookDriverCreationListener(sink$, createDriverFunction, translateSinkFunction, resolve, reject, innerDriverCreatedProducer);
      }).catch((reason) => innerDriverCreatedProducer.creationFailed(reason.message));

    const source = {
      innerDriverSource: () => adapt(xs.fromPromise(innerSourcePromise).flatten()),
      innerDriverSourceAsComplex: () => adapt(xs.fromPromise(innerSourcePromise)),
      driverCreatedSteam: () => adapt(innerDriverCreated$)
    }

    return source;
  };

  return driver;
}
