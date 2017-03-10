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

function makeExplicitProducer() {
  let sendWithListener = function(item) {
    this.listener.next(item);
  };

  let sendWithoutListener = function(item) {
    // Do nothing
  };

  let completeWithListener = function() {
    this.listener.complete();
  };

  let completeWithoutListener = function() {
    // Do nothing
  };

  return {
    start: function(listener) {
      this.listener = listener;
      this.send = sendWithListener;
      this.complete = completeWithListener;
    },
    stop: function(listener) {
      this.send = sendWithoutListener;
      this.complete = completeWithoutListener;
    },
    send: sendWithoutListener,
    complete: completeWithoutListener
  }
}

function wireInnerDriverSource(innerSource, complex, driverSourceProducer) {
  if (complex == true) {
    driverSourceProducer.send(innerSource);
    driverSourceProducer.complete();
  }
  else {
    innerSource.addListener({
      next: (item) => {driverSourceProducer.send(item)},
      error: (e) => {throw e;},
      complete: () => {driverSourceProducer.complete()}
    });
  }
}

/*
 * Creates a listener for to the supplied stream and for each value attempts to create the inner driver.
 * Once the inner driver is created, will use the supplied resolve method to resolve a promise with the inner
 * driver's stream.
 */
function hookDriverCreationListener(sink$, createDriverFunction, complex, driverSourceProducer, driverCreatedProducer) {
  let sinkForwardProducer = makeExplicitProducer();

  let tryToCreateDriver = function(item) {
    let innerDriver = createDriverFunction(item);

    if (innerDriver) {
      driverCreatedProducer.creationSucceeded();

      let innerSource = innerDriver(xs.create(sinkForwardProducer));

      // Give a chance to register to the source before firing out everything if
      // it's an immediate stream (like one from an array)
      setTimeout(() => {wireInnerDriverSource(innerSource, complex, driverSourceProducer)}, 0);

      this.listen = (item) => {sinkForwardProducer.send(item)};
      this.finish = () => {sinkForwardProducer.complete()};
    }
  };

  let thisListener = {
    // The two "alternate" methods below are needed for hotswapping the listener
    // methods, as "next" and "complete" are stored by cycle and swapping them
    // out does nothing
    listen: tryToCreateDriver,
    finish: () => {driverCreatedProducer.creationFailed('Stream terminated before inner driver was created')},
    next: function(item) {this.listen(item)},
    error: e => {throw e;},
    complete: function() {this.finish()}
  };

  sink$.addListener(thisListener);
}

export function makeDelayedDriver(createDriverFunction, complex = false) {
  let driver = function delayedDriver(sink$) {

    let innerDriverCreatedProducer = makeInnerDriverCreatedProducer();
    let innerDriverCreated$ = xs.create(innerDriverCreatedProducer);

    let innerDriverSourceProducer = makeExplicitProducer();

    hookDriverCreationListener(sink$, createDriverFunction, complex, innerDriverSourceProducer, innerDriverCreatedProducer);

    const source = {
      innerDriverSource: () => adapt(xs.create(innerDriverSourceProducer)),
      driverCreatedSteam: () => adapt(innerDriverCreated$)
    }

    return source;
  };

  return driver;
}
