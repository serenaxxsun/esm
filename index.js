/* eslint strict: off, node/no-unsupported-features: ["error", { version: 4 }] */
"use strict"

const Module = require("module")

const gunzipSync = require("zlib").gunzipSync
const join = require("path").join
const readFileSync = require("fs").readFileSync

const filePath = join(__dirname, "esm.js.gz")
const content = gunzipSync(readFileSync(filePath)).toString()
const mod = new Module(filePath, module.parent)

mod._compile(content, filePath)
module.exports = mod.exports
