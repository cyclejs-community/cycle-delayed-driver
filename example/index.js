import { run } from '@cycle/run';
import xs from 'xstream';
import { canvas, div, h1, makeDOMDriver } from '@cycle/dom';
import { text, makeCanvasDriver } from 'cycle-canvas';
import { makeDelayedDriver } from '../src/cycle-delayed-driver';

function canvasDriverOnTarget(elements) {
  if (Array.isArray(elements) && elements.some(e => e.id == 'target')) {
    return makeCanvasDriver('canvas#target', {width: 400, height: 300});
  }
  return null;
}

function main(sources) {
  const targetCanvas$ = sources['DOM'].select('canvas#target').elements();
  const canvas$ = xs.of(text({
    x: 100,
    y: 100,
    value: 'Why, hello there',
    font: '20pt Arial'
  }));

  return {
    DOM: xs.of(
          div([
            h1('Here is a canvas:'),
            canvas('#target', {style: {border: "1px solid black"}})])),
    delayedCanvas: targetCanvas$
  };
}

run (main, {
  DOM: makeDOMDriver('#app'),
  delayedCanvas: makeDelayedDriver(canvasDriverOnTarget)
});
