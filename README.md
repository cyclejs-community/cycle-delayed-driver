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