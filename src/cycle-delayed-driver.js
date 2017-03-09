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
function hookDriverCreationListener(sink$, createDriverFunction, translateSinkFunction, complex, driverSourceProxy, driverCreatedProducer) {
  let thisListener = {
    next: sinkItem => {
      let innerDriver = createDriverFunction(sinkItem);

      if (innerDriver) {
        driverCreatedProducer.creationSucceeded();
        sink$.removeListener(thisListener);

        let innerSource = null;

        if (translateSinkFunction) {
          innerSource = innerDriver(translateSinkFunction(sink$));
        }
        else {
          innerSource = innerDriver(sink$);
        }

        if (complex == true) {
          driverSourceProxy.imitate(xs.of(innerSource));
        }
        else {
          driverSourceProxy.imitate(innerSource);
        }
      }
    },
    error: e => { throw e; },
    complete: () => { driverCreatedProducer.creationFailed('Stream terminated before inner driver was created'); }
  };

  sink$.addListener(thisListener);
}

export function makeDelayedDriver(createDriverFunction, complex = false, translateSinkFunction = null) {
  let driver = function delayedDriver(sink$) {

    let innerDriverCreatedProducer = makeInnerDriverCreatedProducer();
    let innerDriverCreated$ = xs.create(innerDriverCreatedProducer);

    let innerDriverSourceProxy = xs.create();

    hookDriverCreationListener(sink$, createDriverFunction, translateSinkFunction, complex, innerDriverSourceProxy, innerDriverCreatedProducer);

    const source = {
      innerDriverSource: () => adapt(innerDriverSourceProxy),
      driverCreatedSteam: () => adapt(innerDriverCreated$)
    }

    return source;
  };

  return driver;
}
