import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyOf } from '../src/index.js';

test('arrow keys and Enter', () => {
  assert.equal(keyOf({ key: 'ArrowLeft' }), 'left');
  assert.equal(keyOf({ key: 'Enter' }), 'enter');
});

test('Fire TV / Android TV WebView buttons that only come with a keyCode', () => {
  assert.equal(keyOf({ keyCode: 4 }), 'back');
  assert.equal(keyOf({ keyCode: 85 }), 'playpause');
  assert.equal(keyOf({ keyCode: 89 }), 'rewind');
  assert.equal(keyOf({ keyCode: 90 }), 'ffwd');
  assert.equal(keyOf({ keyCode: 82 }), 'menu');
});

test('smart-TV browser keys', () => {
  assert.equal(keyOf({ keyCode: 10009 }), 'back'); // Samsung Tizen RETURN
  assert.equal(keyOf({ keyCode: 415 }), 'playpause');
  assert.equal(keyOf({ key: 'GoBack' }), 'back');
});

test('other keys are ignored', () => {
  assert.equal(keyOf({ key: 'a', keyCode: 65 }), null);
});
