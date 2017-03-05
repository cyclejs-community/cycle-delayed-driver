import { run } from '@cycle/run';
import xs from 'xstream';
import { canvas, div, h1, makeDOMDriver } from '@cycle/dom';
//import { text, makeCanvasDriver } from 'cycle-canvas';
import { makeDelayedDriver } from '../src/cycle-delayed-driver';

function main(sources) {
  return {
    DOM: xs.of(
          div([
            h1('Here is a canvas:'),
            canvas('#target', {style: {border: "1px solid black"}})]))
  };
}

run (main, {
  DOM: makeDOMDriver('#app')
});
