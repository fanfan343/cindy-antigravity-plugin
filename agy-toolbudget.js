'use strict';

/**
 * Antigravity declares MCP tools up to a per-session size budget and silently
 * drops whatever does not fit, largest first. Measured on agy 1.5.15 over ACP:
 * the budget is roughly 58-59 KB of tool JSON, packing smallest tools first, so
 * a large gateway tool (ghost_call, ~11 KB) is dropped whenever smaller tools
 * can fill the budget instead.
 *
 * The plugin cannot change how agy packs, but it can change what it hands over.
 * Keeping only the servers that carry the entry points shrinks the surface below
 * the budget, so nothing is dropped.
 */

const DEFAULT_KEEP = ['cindy'];
const ENV_KEEP = 'CINDY_AGY_KEEP_SERVERS';
const ENV_DISABLE = 'CINDY_AGY_TRIM_MCP';

/** Servers to keep, from CINDY_AGY_KEEP_SERVERS, or ['cindy'] when unset. */
function keepList(env = process.env) {
  const raw = env[ENV_KEEP];
  if (typeof raw !== 'string' || raw.trim() === '') return [...DEFAULT_KEEP];
  return raw.split(',').map((name) => name.trim()).filter(Boolean);
}

function enabled(env = process.env) {
  const raw = env[ENV_DISABLE];
  return !(raw === '0' || raw === 'false' || raw === 'off');
}

/**
 * Trim `session/new` (or resume/load) `mcpServers` down to the keep list.
 * Returns the original params when there is nothing to do, so the caller can
 * forward the line untouched.
 */
function trimSessionServers(params, options = {}) {
  const servers = Array.isArray(params?.mcpServers) ? params.mcpServers : null;
  if (!servers || servers.length <= 1) return null;
  const keep = options.keep ?? keepList(options.env);
  if (keep.length === 0) return null;
  const kept = [];
  const dropped = [];
  for (const server of servers) {
    const name = typeof server?.name === 'string' ? server.name : '';
    if (keep.includes(name)) kept.push(server);
    else dropped.push(name || '(unnamed)');
  }
  // Never leave the session without tools: a renamed or missing server is a
  // reason to warn, not to hand agy an empty list.
  if (kept.length === 0 || dropped.length === 0) {
    return kept.length === 0
      ? { params, kept: servers.map((server) => server?.name).filter(Boolean), dropped: [], warning: `no server matched ${JSON.stringify(keep)}; every server was kept` }
      : null;
  }
  return { params: { ...params, mcpServers: kept }, kept: kept.map((server) => server.name), dropped };
}

/** One line for the task log, only when something was actually dropped. */
function describeTrim(result) {
  if (!result || result.dropped.length === 0) return null;
  return `[agy-acp] MCP servers trimmed to fit the Antigravity tool budget: kept ${result.kept.join(', ') || 'none'}; dropped ${result.dropped.join(', ')}. `
    + `Set ${ENV_KEEP} to change the list, ${ENV_DISABLE}=0 to disable the trim.`;
}

module.exports = { DEFAULT_KEEP, ENV_DISABLE, ENV_KEEP, describeTrim, enabled, keepList, trimSessionServers };
