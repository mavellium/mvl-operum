'use strict'

// Registers a Node.js ESM loader hook that stubs out lru-cache/dist/esm
// with a version that has no top-level await.
//
// Root cause: jsdom@29 requires @asamuzakjp/css-color and
// @asamuzakjp/dom-selector (both ESM-only). Those packages import
// lru-cache/dist/esm which contains `await import("node:diagnostics_channel")`.
// Node.js cannot require() an ESM graph with top-level await →
// ERR_REQUIRE_ASYNC_MODULE in every jsdom test worker.
//
// The hook makes lru-cache's ESM bundle loadable without top-level await,
// so both @asamuzakjp packages load correctly with full functionality
// (just without the diagnostics_channel instrumentation).

const { register } = require('module')
const { pathToFileURL } = require('url')
const path = require('path')

register(
  pathToFileURL(path.join(__dirname, 'vitest-lru-cache-hook.mjs')).href,
  { parentURL: pathToFileURL(__filename).href }
)
