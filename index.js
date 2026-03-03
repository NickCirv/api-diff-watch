#!/usr/bin/env node
/**
 * api-diff-watch — Watch API endpoints, alert when responses change.
 * Zero dependencies. Pure Node.js ES modules.
 */

import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import crypto from 'crypto'

// ─── ANSI Colors ──────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
  bold:   '\x1b[1m',
}
const color = (c, s) => `${c}${s}${C.reset}`

// ─── Arg Parser ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = argv.slice(2)
  const opts = {
    url:        null,
    interval:   30,
    headers:    {},
    method:     'GET',
    body:       null,
    jq:         null,
    ignore:     [],
    schemaOnly: false,
    timeout:    10000,
    onChange:   null,
    log:        null,
    once:       false,
  }

  if (!args.length || args[0] === '--help' || args[0] === '-h') {
    printHelp()
    process.exit(0)
  }

  // First positional arg is the URL
  if (args[0] && !args[0].startsWith('-')) {
    opts.url = args[0]
    args.shift()
  }

  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    const next = args[i + 1]

    switch (a) {
      case '--interval':   opts.interval   = parseInt(next, 10) * 1000; i++; break
      case '--header':     parseHeader(opts.headers, next);             i++; break
      case '--method':     opts.method     = next.toUpperCase();        i++; break
      case '--body':       opts.body       = next;                      i++; break
      case '--jq':         opts.jq         = next;                      i++; break
      case '--ignore':     opts.ignore     = next.split(',').map(s => s.trim()); i++; break
      case '--schema-only':opts.schemaOnly = true;                           break
      case '--timeout':    opts.timeout    = parseInt(next, 10);        i++; break
      case '--on-change':  opts.onChange   = next;                      i++; break
      case '--log':        opts.log        = next;                       i++; break
      case '--once':       opts.once       = true;                           break
      default:
        if (a.startsWith('http://') || a.startsWith('https://')) {
          opts.url = a
        }
    }
  }

  if (!opts.url) {
    console.error(color(C.red, 'Error: URL is required.'))
    process.exit(1)
  }

  return opts
}

// Parse "Header-Name: value" — resolves $ENV_VAR references without logging them
function parseHeader(headers, raw) {
  const idx = raw.indexOf(':')
  if (idx === -1) return
  const name = raw.slice(0, idx).trim()
  const rawVal = raw.slice(idx + 1).trim()
  // Resolve $VAR references from environment — value is never logged
  const resolved = rawVal.replace(/\$([A-Z_][A-Z0-9_]*)/g, (_, varName) => {
    const envVal = process.env[varName]
    if (!envVal) {
      console.warn(color(C.yellow, `Warning: env var $${varName} not set`))
      return ''
    }
    return envVal // resolved silently, never echoed
  })
  headers[name] = resolved
}

// ─── Help ─────────────────────────────────────────────────────────────────────
function printHelp() {
  console.log(`
${color(C.bold, 'api-diff-watch')} — Watch API endpoints. Alert when responses change. Zero dependencies.

${color(C.bold, 'Usage:')}
  adw <url> [options]
  api-diff-watch <url> [options]

${color(C.bold, 'Options:')}
  --interval <sec>        Poll interval in seconds (default: 30)
  --header <Name: value>  Add request header (supports $ENV_VAR for secrets)
  --method <METHOD>       HTTP method (default: GET)
  --body <json>           Request body for POST/PUT
  --jq <path>             Watch only a specific JSON path (e.g. ".data.users")
  --ignore <fields>       Comma-separated fields to ignore (e.g. ".timestamp,.id")
  --schema-only           Only alert on schema changes (new/removed fields)
  --timeout <ms>          Per-request timeout in ms (default: 10000)
  --on-change <cmd>       Run command on change (space-split, no shell)
  --log <file>            Log all changes to JSON file
  --once                  Fetch once, compare to baseline, exit 0 (no change) or 1 (changed)
  -h, --help              Show this help

${color(C.bold, 'Examples:')}
  adw https://api.example.com/users --interval 60
  adw https://api.example.com/me --header "Authorization: Bearer \$API_TOKEN"
  adw https://api.example.com/data --jq ".items" --schema-only
  adw https://api.example.com/feed --ignore ".timestamp,.requestId" --log changes.json
  adw https://api.example.com/status --once
`)
}

// ─── HTTP Request ─────────────────────────────────────────────────────────────
function fetchURL(opts) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(opts.url)
    const lib = parsed.protocol === 'https:' ? https : http
    const start = Date.now()

    const reqOpts = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   opts.method,
      headers:  { 'Accept': 'application/json', ...opts.headers },
    }

    if (opts.body) {
      const bodyBuf = Buffer.from(opts.body)
      reqOpts.headers['Content-Type']   = 'application/json'
      reqOpts.headers['Content-Length'] = bodyBuf.length
    }

    const req = lib.request(reqOpts, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const elapsed = Date.now() - start
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve({ raw, status: res.statusCode, elapsed })
      })
    })

    req.setTimeout(opts.timeout, () => {
      req.destroy()
      reject(new Error(`Request timed out after ${opts.timeout}ms`))
    })

    req.on('error', reject)

    if (opts.body) req.write(opts.body)
    req.end()
  })
}

// ─── JSON Utilities ───────────────────────────────────────────────────────────
function tryParseJSON(raw) {
  try { return { ok: true, data: JSON.parse(raw) }
  } catch { return { ok: false, data: null } }
}

// Resolve a simple dot-path like ".data.users.0.name" on an object
function resolvePath(obj, dotPath) {
  if (!dotPath) return obj
  const parts = dotPath.replace(/^\./, '').split('.')
  let cur = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}

// Remove ignored keys (dot-path list) from a deep clone
function applyIgnore(obj, ignoreList) {
  if (!ignoreList.length) return obj
  const clone = JSON.parse(JSON.stringify(obj))
  for (const dotPath of ignoreList) {
    const parts = dotPath.replace(/^\./, '').split('.')
    let cur = clone
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur == null) break
      cur = cur[parts[i]]
    }
    if (cur != null) delete cur[parts[parts.length - 1]]
  }
  return clone
}

// Extract the structural schema (keys only, recursively) from a value
function extractSchema(val, depth = 0) {
  if (depth > 10) return '...'
  if (Array.isArray(val)) {
    if (!val.length) return []
    return [extractSchema(val[0], depth + 1)]
  }
  if (val !== null && typeof val === 'object') {
    const out = {}
    for (const k of Object.keys(val)) {
      out[k] = extractSchema(val[k], depth + 1)
    }
    return out
  }
  return typeof val
}

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex')
}

// ─── Diff Engine ──────────────────────────────────────────────────────────────
function diffJSON(oldObj, newObj, prefix = '') {
  const changes = []

  const allKeys = new Set([
    ...Object.keys(oldObj ?? {}),
    ...Object.keys(newObj ?? {}),
  ])

  for (const k of allKeys) {
    const fullPath = `${prefix}/${k}`
    const oldVal = oldObj?.[k]
    const newVal = newObj?.[k]

    if (!(k in (oldObj ?? {}))) {
      changes.push({ type: 'added', path: fullPath, newVal })
    } else if (!(k in (newObj ?? {}))) {
      changes.push({ type: 'removed', path: fullPath, oldVal })
    } else if (
      typeof oldVal === 'object' && oldVal !== null &&
      typeof newVal === 'object' && newVal !== null &&
      !Array.isArray(oldVal) && !Array.isArray(newVal)
    ) {
      changes.push(...diffJSON(oldVal, newVal, fullPath))
    } else {
      const os = JSON.stringify(oldVal)
      const ns = JSON.stringify(newVal)
      if (os !== ns) {
        changes.push({ type: 'changed', path: fullPath, oldVal, newVal })
      }
    }
  }

  return changes
}

function diffText(oldText, newText) {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const out = []
  const max = Math.max(oldLines.length, newLines.length)
  for (let i = 0; i < max; i++) {
    const o = oldLines[i]
    const n = newLines[i]
    if (o === undefined) out.push(color(C.green, `+ ${n}`))
    else if (n === undefined) out.push(color(C.red, `- ${o}`))
    else if (o !== n) {
      out.push(color(C.red, `- ${o}`))
      out.push(color(C.green, `+ ${n}`))
    }
  }
  return out
}

function formatChanges(changes) {
  return changes.map(c => {
    if (c.type === 'added') {
      return color(C.green, `  + ${c.path} (new field)`)
    }
    if (c.type === 'removed') {
      return color(C.red, `  - ${c.path} (removed)`)
    }
    const ov = JSON.stringify(c.oldVal)
    const nv = JSON.stringify(c.newVal)
    return color(C.yellow, `  ~ ${c.path}: ${ov} → ${nv}`)
  }).join('\n')
}

// ─── Baseline Persistence ─────────────────────────────────────────────────────
const BASELINE_DIR = path.resolve('.adw-baseline')

function baselineKey(url, jq) {
  const slug = md5(url + (jq || '')).slice(0, 12)
  return path.join(BASELINE_DIR, `${slug}.json`)
}

function loadBaseline(key) {
  try {
    const raw = fs.readFileSync(key, 'utf8')
    return JSON.parse(raw)
  } catch { return null }
}

function saveBaseline(key, payload) {
  fs.mkdirSync(BASELINE_DIR, { recursive: true })
  fs.writeFileSync(key, JSON.stringify(payload, null, 2))
}

// ─── Change Logging ───────────────────────────────────────────────────────────
function appendLog(logFile, entry) {
  let existing = []
  try { existing = JSON.parse(fs.readFileSync(logFile, 'utf8')) } catch { /* empty */ }
  existing.push(entry)
  fs.writeFileSync(logFile, JSON.stringify(existing, null, 2))
}

// ─── On-change Hook ───────────────────────────────────────────────────────────
function runOnChange(cmd) {
  const parts = cmd.trim().split(/\s+/)
  const result = spawnSync(parts[0], parts.slice(1), { stdio: 'inherit' })
  if (result.error) {
    console.error(color(C.red, `  on-change error: ${result.error.message}`))
  }
}

// ─── Core Check ───────────────────────────────────────────────────────────────
async function check(opts, state) {
  const ts = new Date().toLocaleTimeString()
  let raw, status, elapsed

  try {
    ;({ raw, status, elapsed } = await fetchURL(opts))
  } catch (err) {
    console.log(color(C.red, `[${ts}] Request failed: ${err.message}`))
    return false
  }

  const { ok, data } = tryParseJSON(raw)
  const bKey = baselineKey(opts.url, opts.jq)
  const baseline = loadBaseline(bKey)

  // First run — establish baseline
  if (!baseline) {
    const focused = ok ? applyIgnore(resolvePath(data, opts.jq), opts.ignore) : raw
    const hash = md5(JSON.stringify(focused))
    const schema = ok ? extractSchema(focused) : null
    saveBaseline(bKey, { hash, data: focused, schema, isJSON: ok, timestamp: new Date().toISOString() })
    console.log(color(C.cyan, `[${ts}] Baseline saved (${elapsed}ms, status ${status})`))
    state.checks++
    return false
  }

  const focused = ok ? applyIgnore(resolvePath(data, opts.jq), opts.ignore) : raw
  const hash = md5(JSON.stringify(focused))

  if (hash === baseline.hash) {
    console.log(color(C.gray, `[${ts}] No change  (${elapsed}ms, status ${status})`))
    state.checks++
    return false
  }

  // Change detected
  console.log(color(C.bold, `\n⚡ Change detected at ${ts}`))

  let changes = []

  if (opts.schemaOnly && ok && baseline.isJSON) {
    const oldSchema = baseline.schema ?? extractSchema(baseline.data)
    const newSchema = extractSchema(focused)
    const schemaDiff = diffJSON(oldSchema, newSchema)
    if (schemaDiff.length) {
      changes = schemaDiff
      console.log(formatChanges(schemaDiff))
    } else {
      console.log(color(C.yellow, '  (values changed, schema identical)'))
    }
  } else if (ok && baseline.isJSON) {
    changes = diffJSON(baseline.data, focused)
    console.log(formatChanges(changes))
  } else {
    const lines = diffText(
      typeof baseline.data === 'string' ? baseline.data : JSON.stringify(baseline.data, null, 2),
      typeof focused === 'string' ? focused : JSON.stringify(focused, null, 2)
    )
    lines.forEach(l => console.log(l))
    changes = lines
  }

  console.log('')

  // Persist new baseline
  const schema = ok ? extractSchema(focused) : null
  saveBaseline(bKey, { hash, data: focused, schema, isJSON: ok, timestamp: new Date().toISOString() })

  // Log to file
  if (opts.log) {
    appendLog(opts.log, {
      timestamp:  new Date().toISOString(),
      url:        opts.url,
      status,
      elapsed,
      changeCount: Array.isArray(changes) ? changes.length : 1,
      changes,
    })
  }

  // Run on-change command
  if (opts.onChange) runOnChange(opts.onChange)

  state.checks++
  state.changes++
  return true
}

// ─── Summary ──────────────────────────────────────────────────────────────────
function printSummary(state) {
  console.log(color(C.bold, `\n─── Summary ───────────────────────────`))
  console.log(`  Checks:  ${state.checks}`)
  console.log(`  Changes: ${color(state.changes > 0 ? C.yellow : C.green, String(state.changes))}`)
  console.log('')
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const opts  = parseArgs(process.argv)
  const state = { checks: 0, changes: 0 }

  console.log(color(C.bold, `api-diff-watch`) + color(C.gray, ` v1.0.0`))
  console.log(color(C.cyan, `Watching: ${opts.url}`))
  if (opts.jq)         console.log(color(C.gray, `  Path:     ${opts.jq}`))
  if (opts.schemaOnly) console.log(color(C.gray, `  Mode:     schema-only`))
  if (opts.ignore.length) console.log(color(C.gray, `  Ignoring: ${opts.ignore.join(', ')}`))
  if (!opts.once)      console.log(color(C.gray, `  Interval: ${opts.interval / 1000}s\n`))

  if (opts.once) {
    const changed = await check(opts, state)
    printSummary(state)
    process.exit(changed ? 1 : 0)
  }

  // Continuous watch loop
  process.on('SIGINT', () => {
    printSummary(state)
    process.exit(0)
  })

  // First check immediately
  await check(opts, state)

  // Then poll on interval
  const tick = async () => {
    await check(opts, state)
    setTimeout(tick, opts.interval)
  }
  setTimeout(tick, opts.interval)
}

main().catch(err => {
  console.error(color(C.red, `Fatal: ${err.message}`))
  process.exit(1)
})
