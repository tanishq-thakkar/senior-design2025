const DEFAULT_DELAY = 450

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

export async function mockRequest<T>(factory: () => T, delay = DEFAULT_DELAY) {
  await sleep(delay)
  return factory()
}

export function randomId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function timestamp() {
  return new Date().toISOString()
}

