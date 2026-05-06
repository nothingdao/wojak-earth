import { SERVER_URL } from '@/config/functionsBase'

type LogLevel = 'warn' | 'error'

const MAX_LOGS_PER_SESSION = 200
const seen = new Map<string, number>()
let sentCount = 0
let installed = false

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    }
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value == null) {
    return value
  }

  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return String(value)
  }
}

function shouldSkip(message: string) {
  return (
    message.includes('Download the React DevTools') ||
    message.includes('SES Removing unpermitted intrinsics') ||
    message.includes('favicon')
  )
}

function send(level: LogLevel, source: string, args: unknown[], stack?: string) {
  if (sentCount >= MAX_LOGS_PER_SESSION) return

  const message = args.map((arg) => {
    if (arg instanceof Error) return arg.message
    if (typeof arg === 'string') return arg
    return JSON.stringify(serialize(arg))
  }).join(' ')

  if (!message || shouldSkip(message)) return

  const key = `${level}:${message.slice(0, 300)}`
  const count = seen.get(key) ?? 0
  if (count >= 5) return
  seen.set(key, count + 1)
  sentCount++

  const payload = {
    level,
    source,
    url: window.location.href,
    message,
    args: args.map(serialize),
    stack,
    userAgent: navigator.userAgent,
  }

  fetch(`${SERVER_URL}/earth/debug/client-log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {})
}

export function installClientLogCapture() {
  if (installed || import.meta.env.PROD) return
  installed = true

  const originalError = console.error.bind(console)
  const originalWarn = console.warn.bind(console)

  console.error = (...args: unknown[]) => {
    originalError(...args)
    send('error', 'console.error', args, args.find((arg): arg is Error => arg instanceof Error)?.stack)
  }

  console.warn = (...args: unknown[]) => {
    originalWarn(...args)
    send('warn', 'console.warn', args, args.find((arg): arg is Error => arg instanceof Error)?.stack)
  }

  window.addEventListener('error', (event) => {
    send('error', 'window.error', [event.message, event.error ?? ''], event.error?.stack)
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    send('error', 'unhandledrejection', [reason], reason instanceof Error ? reason.stack : undefined)
  })
}
