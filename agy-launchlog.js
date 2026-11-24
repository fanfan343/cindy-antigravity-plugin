'use strict';

/**
 * A one-line marker written every time Cindy starts this engine.
 *
 * When a task fails before the agent produces anything, the question that
 * decides where to look is "did this process start at all?". stderr is not
 * readable outside the plugin log, so the answer is also kept in a small file
 * under the temp directory.
 */

const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const MAX_BYTES = 200 * 1024;

function logPath(env = process.env) {
  const override = env.CINDY_AGY_LAUNCH_LOG;
  return override && override.trim() ? override.trim() : path.join(os.tmpdir(), 'cindy-agy-launch.log');
}

/** Never throws: a diagnostic must not be able to fail a task. */
function recordLaunch(detail = {}, env = process.env) {
  try {
    const file = logPath(env);
    try {
      if (fs.statSync(file).size > MAX_BYTES) fs.truncateSync(file, 0);
    } catch { /* missing file is fine */ }
    const line = JSON.stringify({
      at: new Date().toISOString(),
      pid: process.pid,
      ...detail,
    }) + '\n';
    fs.appendFileSync(file, line);
    return file;
  } catch {
    return null;
  }
}

module.exports = { logPath, recordLaunch };
