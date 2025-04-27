import mermaid from "mermaid"

// Mermaidの初期化状態を追跡
let isMermaidInitialized = false

// Mermaidコードブロックを検出する正規表現
export const MERMAID_REGEX = /```mermaid\s*([\s\S]*?)```/g

// Mermaidコードブロックを検出して置換する関数
export function processMermaidBlocks(markdown: string): string {
  // Mermaidコードブロックを検出して置換
  return markdown.replace(MERMAID_REGEX, (match, code) => {
    // ユニークなIDを生成
    const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`

    // Mermaidダイアグラムを表示するためのHTMLに置換
    return `<div class="mermaid-diagram" id="${id}" data-mermaid="${encodeURIComponent(code.trim())}"></div>`
  })
}

// Mermaidを初期化する関数（一度だけ実行）
export function initializeMermaid(): void {
  if (isMermaidInitialized) return

  try {
    // Mermaidの設定
    mermaid.initialize({
      startOnLoad: true, // 自動レンダリングを有効化
      theme: "default",
      securityLevel: "loose",
      fontFamily: "sans-serif",
    })

    isMermaidInitialized = true
    console.log("Mermaid initialized successfully")
  } catch (error) {
    console.error("Failed to initialize Mermaid:", error)
  }
}

// Mermaidダイアグラムをレンダリングする関数
export async function renderMermaidDiagrams(container: HTMLElement | Document = document): Promise<void> {
  try {
    // Mermaidが初期化されていなければ初期化
    if (!isMermaidInitialized) {
      initializeMermaid()
    }

    // コンテナ内のすべてのMermaidダイアグラム要素を取得
    const diagrams = container.querySelectorAll(".mermaid-diagram")
    console.log(`Found ${diagrams.length} mermaid diagrams to render`)

    // 各ダイアグラムをレンダリング
    for (const diagram of Array.from(diagrams)) {
      const id = diagram.id
      const code = decodeURIComponent((diagram as HTMLElement).dataset.mermaid || "")

      if (code) {
        try {
          console.log(`Rendering mermaid diagram with ID: ${id}`)
          console.log(`Mermaid code: ${code}`)

          // Mermaidダイアグラムをレンダリング
          const { svg } = await mermaid.render(id, code)
          diagram.innerHTML = svg
          console.log(`Successfully rendered diagram ${id}`)
        } catch (renderError) {
          console.error("Failed to render Mermaid diagram:", renderError)
          diagram.innerHTML = `<div class="error">Failed to render diagram: ${renderError instanceof Error ? renderError.message : String(renderError)}</div>`
        }
      }
    }
  } catch (error) {
    console.error("Error rendering Mermaid diagrams:", error)
  }
}

// iframeのドキュメント内のMermaidダイアグラムをレンダリングする関数
export async function renderMermaidInIframe(iframe: HTMLIFrameElement): Promise<void> {
  try {
    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDocument) {
      console.error("Cannot access iframe document")
      return
    }

    // Mermaidが初期化されていなければ初期化
    if (!isMermaidInitialized) {
      initializeMermaid()
    }

    // Mermaidスクリプトをiframeに挿入
    const script = iframeDocument.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"
    script.onload = () => {
      // スクリプトが読み込まれたら、iframeのwindowオブジェクトにアクセスしてmermaidを初期化
      if (iframe.contentWindow) {
        iframe.contentWindow.eval(`
          mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'sans-serif'
          });
          mermaid.run();
        `)
      }
    }
    iframeDocument.head.appendChild(script)

    // iframeドキュメント内のすべてのMermaidコードブロックを検索
    const mermaidBlocks = iframeDocument.querySelectorAll("pre code.language-mermaid, pre code.mermaid, div.mermaid")
    console.log(`Found ${mermaidBlocks.length} mermaid blocks in iframe`)

    // 各Mermaidブロックを処理
    for (let i = 0; i < mermaidBlocks.length; i++) {
      const mermaidBlock = mermaidBlocks[i]
      const mermaidCode = mermaidBlock.textContent || ""

      if (mermaidCode.trim()) {
        try {
          // コンテナを作成
          const diagramContainer = iframeDocument.createElement("div")
          diagramContainer.className = "mermaid"
          diagramContainer.style.width = "100%"
          diagramContainer.style.maxWidth = "800px"
          diagramContainer.style.margin = "0 auto"
          diagramContainer.textContent = mermaidCode

          // コードブロックをダイアグラムコンテナに置き換え
          const preElement = mermaidBlock.closest("pre")
          if (preElement && preElement.parentNode) {
            preElement.parentNode.replaceChild(diagramContainer, preElement)
          }
        } catch (err) {
          console.error("Failed to process Mermaid diagram:", err)
        }
      }
    }
  } catch (err) {
    console.error("Error processing Mermaid diagrams in iframe:", err)
  }
}
