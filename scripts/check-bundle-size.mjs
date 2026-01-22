#!/usr/bin/env node
/**
 * O18：给 CI 加一条体积断言。
 * 口径：apps/web/dist 下所有 .js 的 gzip 之和（Element Plus 单独成 chunk，
 * 只看它一个文件也能发现膨胀）。阈值可用 BUNDLE_MAX_KB / CHUNK_MAX_KB 覆盖。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST = process.argv[2] ?? 'apps/web/dist'
const TOTAL_MAX_KB = Number(process.env.BUNDLE_MAX_KB ?? 420)
const CHUNK_MAX_KB = Number(process.env.CHUNK_MAX_KB ?? 320)

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (name.endsWith('.js')) out.push(path)
  }
  return out
}

const files = walk(DIST)
  .map((path) => ({
    path: path.slice(DIST.length + 1),
    kb: gzipSync(readFileSync(path)).length / 1024,
  }))
  .sort((a, b) => b.kb - a.kb)

const total = files.reduce((sum, file) => sum + file.kb, 0)
for (const file of files.slice(0, 10)) {
  console.log(`${file.kb.toFixed(1).padStart(7)} kB  ${file.path}`)
}
console.log(
  `\n合计 gzip ${total.toFixed(1)} kB（阈值 ${TOTAL_MAX_KB} kB，单文件 ${CHUNK_MAX_KB} kB）`,
)

const tooBigChunk = files.find((file) => file.kb > CHUNK_MAX_KB)
if (tooBigChunk) {
  console.error(`✗ 单文件超阈值：${tooBigChunk.path} ${tooBigChunk.kb.toFixed(1)} kB`)
  process.exit(1)
}
if (total > TOTAL_MAX_KB) {
  console.error(`✗ 总体积超阈值：${total.toFixed(1)} kB > ${TOTAL_MAX_KB} kB`)
  process.exit(1)
}
console.log('✓ 体积在阈值内')
