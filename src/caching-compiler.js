import compiler from "./compiler.js"
import createOptions from "./util/create-options.js"
import gzip from "./fs/gzip.js"
import path from "path"
import removeFile from "./fs/remove-file.js"
import writeFileDefer from "./fs/write-file-defer.js"

class Compiler {
  static compile(code, options) {
    options = createOptions(options)
    return typeof options.filePath === "string"
      ? compileWithFilename(code, options)
      : compileAndCache(code, options)
  }
}

function compileWithFilename(code, options) {
  try {
    return compileAndWrite(code, options)
  } catch (e) {
    e.filename = options.filePath
    throw e
  }
}

function compileAndCache(code, options) {
  const result = compiler.compile(code, toCompileOptions(options))
  options.pkgInfo.cache.set(options.cacheFileName, result)
  return result
}

function compileAndWrite(code, options) {
  const result = compileAndCache(code, options)

  if (result.type !== "module") {
    return result
  }

  const cachePath = options.cachePath
  const cacheFileName = options.cacheFileName
  const cacheFilePath = path.join(cachePath, cacheFileName)
  const output = result.code
  const isGzipped = path.extname(cacheFilePath) === ".gz"
  const content = () => isGzipped ? gzip(output) : output
  const encoding = isGzipped ? null : "utf8"
  const pkgInfo = options.pkgInfo
  const scopePath = pkgInfo.dirPath
  const writeOptions = { encoding, scopePath }

  writeFileDefer(cacheFilePath, content, writeOptions, (success) => {
    if (success) {
      removeExpired(pkgInfo.cache, cachePath, cacheFileName)
    }
  })

  return result
}

function removeExpired(cache, cachePath, cacheFileName) {
  const shortname = cacheFileName.slice(0, 8)
  cache.keys().forEach((key) => {
    if (key !== cacheFileName &&
        key.startsWith(shortname)) {
      removeFile(path.join(cachePath, key))
    }
  })
}

function toCompileOptions(options) {
  const filePath = options.filePath
  const pkgOptions = options.pkgInfo.options
  let type = "script"

  if (typeof filePath === "string" &&
      path.extname(filePath) === ".mjs") {
    type = "module"
  } else if (pkgOptions.esm === "js") {
    type = "unambiguous"
  }

  return {
    cjs: pkgOptions.cjs,
    ext: pkgOptions.ext,
    runtimeAlias: options.runtimeAlias,
    type,
    var: pkgOptions.var
  }
}

Object.setPrototypeOf(Compiler.prototype, null)

export default Compiler
