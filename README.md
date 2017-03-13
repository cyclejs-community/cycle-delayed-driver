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

### `makeDelayedDriver(innerDriverCreationMethod, complex = false)`

A factory for the delayed driver function.

Receives an `innerDriverCreationMethod` which it will use to try and create a driver in response to incoming values. `complex` is used to indicate whether the source of the driver that might be created by `innerDriverCreationMethod` is complex or not.

The input to this driver is any stream at all, the values of which are fed to `innerDriverCreationMethod` as they arrive. Once the inner driver is successfully created this stream will be forwarded to the inner driver. The output of this driver is a set of two streams:

* `driverCreatedStream()` can be used to get a stream which will emit a single event and then end. The single value is an object of the following form:

  ```javascript
  {
    created: false,
    reason: 'Something terrible has happened!'
  }
  ```

  `created` indicates whether the inner driver was created successfully, and `reason` details what failed in case of a failure.

* `innerDriverSource()` gives access to the source of the inner driver once it has been created. If `complex` was false when the delayed driver was created, this will yield a simple stream that mimics the source of the inner driver. If `complex` was true, however, this will be a stream that emits the inner driver's source itself and then complete.

#### Arguments:

* `innerDriverCreationMethod: function(item)` a function that is expected to receive a single argument and either return null or a new driver function.
* `complex: boolean` optional argument that is false by default. False indicates the driver created by the delayed driver emits a stream. True indicates it emits a complex object.

#### Returns:

`function(sink$)` the delayed driver function. Expects a stream of values which may cause an internal driver to be created.
