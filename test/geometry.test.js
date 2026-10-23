import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pick, score } from '../src/index.js';

const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

test('moves along a row of cards', () => {
  const row = [box(0, 0, 100, 60), box(120, 0, 100, 60), box(240, 0, 100, 60)];
  assert.equal(pick(row[0], 'right', row.slice(1)), 0);
  assert.equal(pick(row[2], 'left', row.slice(0, 2)), 1);
});

test('down finds the next row, not something far off to the side', () => {
  const from = box(0, 0, 100, 60);
  const below = box(0, 100, 100, 60);
  const sideways = box(400, 70, 100, 60); // nearer vertically, but nowhere near the column
  assert.equal(pick(from, 'down', [sideways, below]), 1);
});

test('a candidate must be past our edge, not just past our centre', () => {
  const from = box(0, 0, 200, 60);
  const overlapping = box(130, 0, 100, 60); // centre at 180, inside our box: not "to the right"
  assert.equal(score(from, 'right', overlapping), null);
});

test('a wide bar above a row does not beat the next button along it', () => {
  // The player's controls: a play button, the next button, and a full-width scrubber just above.
  const play = box(100, 465, 50, 50);
  const next = box(160, 465, 40, 40);
  const scrubber = box(48, 445, 864, 10);
  assert.equal(pick(play, 'right', [scrubber, next]), 1);
});

test('down from a wide field lines up with the first column', () => {
  const field = box(100, 0, 600, 60);
  const keys = [box(100, 100, 50, 50), box(160, 100, 50, 50), box(380, 100, 50, 50)];
  assert.equal(pick(field, 'down', keys), 0);
});

test('nothing in that direction gives -1', () => {
  assert.equal(pick(box(0, 0, 100, 60), 'up', [box(0, 100, 100, 60)]), -1);
});
