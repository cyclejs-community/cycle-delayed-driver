import { run } from '@cycle/run';
import xs from 'xstream';
import xsConcat from 'xstream/extra/concat';
import xsDelay from 'xstream/extra/delay';
import { canvas, div, h1, makeDOMDriver } from '@cycle/dom';
import { text, makeCanvasDriver } from 'cycle-canvas';
import { makeDelayedDriver } from '../src/cycle-delayed-driver';

function canvasDriverOnTarget(elements) {
  if (Array.isArray(elements) && elements.some(e => e.id == 'target')) {
    return makeCanvasDriver('canvas#target', {width: 400, height: 300});
  }
  return null;
}

function main({DOM, delayedCanvas}) {
  const targetCanvas$ = DOM.select('canvas#target').elements().endWhen(delayedCanvas.driverCreatedSteam());
  const canvas$ = xs.of(text({
    x: 100,
    y: 100,
    value: 'Why, hello there',
    font: '20pt Arial'
  }),
  text({
    x: 100,
    y: 150,
    value: 'Nice to see you',
    font: '20pt Arial'
  })).compose(xsDelay(0));

  return {
    DOM: xs.of(
          div([
            h1('Here is a canvas:'),
            canvas('#target', {style: {border: "1px solid black"}})])),
    delayedCanvas: xsConcat(targetCanvas$, canvas$)
  };
}

run (main, {
  DOM: makeDOMDriver('#app'),
  delayedCanvas: makeDelayedDriver(canvasDriverOnTarget)
});
