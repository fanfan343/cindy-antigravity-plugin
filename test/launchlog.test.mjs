// Run: node --test test/launchlog.test.mjs

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { logPath, recordLaunch } from '../agy-launchlog.js';

describe('launch log', () => {
  test('defaults to the temp directory and honours an override', () => {
    assert.equal(logPath({}), path.join(os.tmpdir(), 'cindy-agy-launch.log'));
    assert.equal(logPath({ CINDY_AGY_LAUNCH_LOG: '/tmp/x.log' }), '/tmp/x.log');
  });

  test('appends one JSON line per launch', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-launch-'));
    const file = path.join(dir, 'launch.log');
    const env = { CINDY_AGY_LAUNCH_LOG: file };
    assert.equal(recordLaunch({ remote: false }, env), file);
    recordLaunch({ remote: true }, env);
    const lines = fs.readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    assert.equal(lines.length, 2);
    assert.equal(lines[0].remote, false);
    assert.equal(lines[1].remote, true);
    assert.equal(lines[0].pid, process.pid);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('a path that cannot be written is not an error', () => {
    assert.equal(recordLaunch({}, { CINDY_AGY_LAUNCH_LOG: '/proc/definitely/not/writable.log' }), null);
  });
});
