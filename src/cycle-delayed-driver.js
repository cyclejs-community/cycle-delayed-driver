import XStreamAdapter from '@cycle/xstream-adapter';
import xs from 'xstream';

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
    let innerSourcePromise = new Promise(
      function(resolve, reject) {
        hookDriverCreationListener(sink$, createDriverFunction, resolve, reject);
      }
    );

    return xs.fromPromise(innerSourcePromise).flatten();
  };

  driver.streamAdapter = XStreamAdapter;
  return driver;
}

export function streamForDelayedDriver(driverSource$, forDelayedDriver$, forInnerDriver$) {
  let examinedUntilCreation$ = forDelayedDriver$.endWhen(driverSource$);
  return xs.merge(examinedUntilCreation$, forInnerDriver$);
}
