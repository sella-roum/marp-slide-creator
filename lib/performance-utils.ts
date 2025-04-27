// パフォーマンス最適化のためのユーティリティ関数

// 重い処理を遅延実行する関数
export function deferredExecution(callback: () => void, delay = 0): void {
  setTimeout(callback, delay)
}

// リソースを事前に読み込む関数
export function preloadResources(): void {
  // Mermaidを事前に読み込む
  const preloadLink = document.createElement("link")
  preloadLink.rel = "preload"
  preloadLink.as = "script"
  preloadLink.href = "https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"
  document.head.appendChild(preloadLink)

  // Marp Coreを事前に読み込む
  import("@marp-team/marp-core")
}

// メモリ使用量を最適化する関数
export function optimizeMemoryUsage(): void {
  // 大きなオブジェクトへの参照を解放
  const gc = (window as any).gc
  if (typeof gc === "function") {
    gc()
  }
}

// レンダリングパフォーマンスを測定する関数
export function measureRenderPerformance(componentName: string): () => void {
  const startTime = performance.now()

  return () => {
    const endTime = performance.now()
    console.log(`[Performance] ${componentName} rendered in ${endTime - startTime}ms`)
  }
}

// 非同期処理のタイムアウトを設定する関数
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    }),
  ])
}
