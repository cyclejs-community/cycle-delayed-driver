# cycle-delayed-driver [![Build Status](https://travis-ci.org/cyclejs-community/cycle-delayed-driver.svg?branch=master)](https://travis-ci.org/cyclejs-community/cycle-delayed-driver)
Create a driver in the future as a response to a specific event.

##Installation
    npm install cycle-delayed-driver --save

##Example
```javascript
import {run} from '@cycle/run';
import xs from 'xstream';
import {makeDelayedDriver} from 'cycle-delayed-driver';

function loggerOnFive(item) {
  if (item == 5) {
    return function(sink$) {
      sink$.addListener({next: (item) => {console.log(item)}});

      return xs.empty();
    };
  }

  return null;
}

function main({delayedDriver}) {
  return {
    delayedDriver: xs.periodic(1000)
  }
}

run(main, {
  delayedDriver: makeDelayedDriver(loggerOnFive)
});
```

The above will cause all numbers starting at 6 to be incrementally logged to the console each second.

##But why?
Achieving the above is rather trivial without using the delayed driver, which is
more useful in cases where you can only set up the drivers that you need in
response to something else happening. For an in-depth and practicle example,
have a look [here](doc/USECASE.md).

##How does this work
The delayed driver operates in the following manner:

1. Once created, it will pass all values it receives to the method you specified
   when creating the driver (this will be `loggerOnFive` in the example above).
   We will refer to this method as the "inner driver creation method".

2. For each value it receives the inner driver creation method either returns
   `null`, in which case nothing happens, or it returns a new driver. At which
   point the delayed driver will do several things:

   1. Emit a value indicating that the inner driver was successfully created (the delayed driver's source is complex. See the API documentation later for more details).
   2. Forward all values it receives to the inner driver it has created.
   3. Emit all values emitted by the inner driver's source. If the inner driver's source is complex, the delayed driver can be instructed to emit the source itself.

In the event that the inner driver was not created and the stream fed into the delayed driver completes, the delayed driver will emit a value indicating that it has failed to create the inner driver.

## API

