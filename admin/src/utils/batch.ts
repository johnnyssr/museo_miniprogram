export interface BatchResult<T> {
  ok: T[]
  failed: { item: T; error: string }[]
}

/**
 * 分批并发执行任务，收集成功与失败，绝不静默吞错。
 * @param items 待处理项
 * @param worker 单项异步处理
 * @param concurrency 并发上限（默认 5）
 * @param onProgress 进度回调 (done, total)
 */
export async function runBatch<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency = 5,
  onProgress?: (done: number, total: number) => void,
): Promise<BatchResult<T>> {
  const ok: T[] = []
  const failed: { item: T; error: string }[] = []
  let done = 0
  const total = items.length
  const queue = [...items]

  async function runner() {
    while (queue.length) {
      const item = queue.shift() as T
      try {
        await worker(item)
        ok.push(item)
      } catch (e) {
        failed.push({ item, error: e instanceof Error ? e.message : String(e) })
      } finally {
        done += 1
        onProgress?.(done, total)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, runner))
  return { ok, failed }
}
