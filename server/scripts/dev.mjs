/**
 * 一条命令起三个 Nest 进程（api:3000 / gateway:3001 / ai:3002）。
 * 用 node 自带 child_process 拼，不再多引一个 concurrently。
 */
import { spawn } from 'node:child_process'

const APPS = ['api', 'gateway', 'ai']

const children = new Set()
let shuttingDown = false

function shutdown(code) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) child.kill('SIGTERM')
  process.exit(code)
}

for (const app of APPS) {
  const child = spawn('pnpm', ['exec', 'nest', 'start', '--watch', app], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  children.add(child)

  const prefix = `[${app}] `
  for (const stream of [child.stdout, child.stderr]) {
    if (stream === null) continue
    stream.setEncoding('utf8')
    let buffer = ''
    stream.on('data', (chunk) => {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) process.stdout.write(prefix + line + '\n')
    })
  }

  child.on('exit', (code) => {
    children.delete(child)
    if (!shuttingDown && code !== 0) shutdown(code ?? 1)
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
