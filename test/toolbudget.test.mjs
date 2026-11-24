// Run: node --test test/toolbudget.test.mjs
//
// Antigravity silently drops MCP tools that do not fit its per-session size
// budget. These tests pin the trim that keeps the gateway server reachable.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_KEEP, describeTrim, enabled, keepList, trimSessionServers,
} from '../agy-toolbudget.js';

const server = (name) => ({ type: 'http', name, url: `https://example.test/${name}` });
const session = (...names) => ({ cwd: '/p', mcpServers: names.map(server) });

describe('keepList', () => {
  test('defaults to the cindy server', () => {
    assert.deepEqual(keepList({}), DEFAULT_KEEP);
    assert.deepEqual(keepList({}), ['cindy']);
  });

  test('reads a comma separated list and trims blanks', () => {
    assert.deepEqual(keepList({ CINDY_AGY_KEEP_SERVERS: ' cindy , cindy_helper ,' }), ['cindy', 'cindy_helper']);
  });
});

describe('enabled', () => {
  test('is on unless explicitly turned off', () => {
    assert.equal(enabled({}), true);
    for (const off of ['0', 'false', 'off']) assert.equal(enabled({ CINDY_AGY_TRIM_MCP: off }), false);
  });
});

describe('trimSessionServers', () => {
  test('keeps only the gateway server and reports the rest', () => {
    const result = trimSessionServers(
      session('cindy', 'cindy_helper', 'cindy_browser', 'cindy_docs'),
      { env: {} },
    );
    assert.deepEqual(result.params.mcpServers.map((item) => item.name), ['cindy']);
    assert.deepEqual(result.dropped, ['cindy_helper', 'cindy_browser', 'cindy_docs']);
    assert.equal(result.params.cwd, '/p', 'the rest of session/new is untouched');
  });

  test('leaves a single server alone', () => {
    assert.equal(trimSessionServers(session('cindy'), { env: {} }), null);
  });

  test('leaves a session with no mcpServers alone', () => {
    assert.equal(trimSessionServers({ cwd: '/p', mcpServers: [] }, { env: {} }), null);
    assert.equal(trimSessionServers({ cwd: '/p' }, { env: {} }), null);
  });

  test('keeps every server when the keep list matches nothing', () => {
    const result = trimSessionServers(session('alpha', 'beta'), { env: {} });
    assert.deepEqual(result.params.mcpServers.map((item) => item.name), ['alpha', 'beta']);
    assert.deepEqual(result.dropped, []);
    assert.match(result.warning, /no server matched/);
  });

  test('honours a custom keep list', () => {
    const result = trimSessionServers(
      session('cindy', 'cindy_helper', 'cindy_browser'),
      { env: { CINDY_AGY_KEEP_SERVERS: 'cindy,cindy_helper' } },
    );
    assert.deepEqual(result.params.mcpServers.map((item) => item.name), ['cindy', 'cindy_helper']);
    assert.deepEqual(result.dropped, ['cindy_browser']);
  });
});

describe('describeTrim', () => {
  test('names what was kept and dropped, and how to change it', () => {
    const result = trimSessionServers(session('cindy', 'cindy_helper'), { env: {} });
    const line = describeTrim(result);
    assert.match(line, /kept cindy/);
    assert.match(line, /dropped cindy_helper/);
    assert.match(line, /CINDY_AGY_KEEP_SERVERS/);
  });

  test('says nothing when nothing was dropped', () => {
    assert.equal(describeTrim(null), null);
    assert.equal(describeTrim({ kept: ['cindy'], dropped: [] }), null);
  });
});
