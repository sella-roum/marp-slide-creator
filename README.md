# AI-Assisted Marp Slide Creator

## 概要

AI-Assisted Marp Slide Creator は、Markdown ベースのプレゼンテーションツール [Marp](https://marp.app/) を使用したスライド作成を支援する Web アプリケーションです。Google Gemini AI と連携し、コンテンツ生成のサポート機能を提供します。作成したスライドデータはブラウザのローカルストレージ (IndexedDB) に保存されます。

## 主な機能

- **Markdown エディタ:** スライドコンテンツを Markdown で記述できます。
- **リアルタイムプレビュー:** 編集中の Markdown を Marp スライドとしてリアルタイムでプレビュー表示します。
- **AI コンテンツ支援:** Google Gemini を利用して、以下のようなタスクを支援します。
  - プレゼンテーションのアウトライン生成
  - カスタムテーマ (CSS) の生成 (指示ベース)
  - Mermaid ダイアグラムの生成 (指示ベース)
  - その他、プロンプトに応じたコンテンツ生成
- **画像ライブラリ:**
  - ローカルから画像をアップロードし、IndexedDB に保存します。
  - アップロードした画像を一覧表示し、管理できます。
  - 画像への参照 (`![alt](image://<uuid>)`) を Markdown エディタに挿入できます。
- **エクスポート:**
  - 作成したスライドを Markdown ファイル (`.md`) としてダウンロードできます。
  - インタラクティブなスタンドアロン HTML ファイル (`.html`) としてエクスポートできます (ページ送り、フルスクリーン機能付き)。
- **ローカル保存:** 作成したドキュメント、チャット履歴、画像データはブラウザの IndexedDB に自動的に保存されます。
- **レスポンシブレイアウト:** チャット、エディタ、プレビューの3ペイン構成で、レイアウトモード (横3列、縦分割など) を切り替え可能です。モバイル表示にも対応しています。
- **テーマ:** ライトモードとダークモードに対応しています。

## 技術スタック

- **フレームワーク:** [Next.js](https://nextjs.org/) (App Router)
- **UI ライブラリ:** [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **UI コンポーネント:** [shadcn/ui](https://ui.shadcn.com/), [Radix UI](https://www.radix-ui.com/)
- **スタイリング:** [Tailwind CSS](https://tailwindcss.com/)
- **Markdown レンダリング:** [Marp Core](https://github.com/marp-team/marp-core)
- **AI:** [Google Gemini API](https://ai.google.dev/) (`@google/genai`)
- **データ永続化:** [IndexedDB](https://developer.mozilla.org/ja/docs/Web/API/IndexedDB_API)
- **コード品質:** [ESLint](https://eslint.org/), [Prettier](https://prettier.io/)
- **パッケージマネージャー:** [pnpm](https://pnpm.io/)

## セットアップと実行方法

### 前提条件

- [Node.js](https://nodejs.org/) (v18.18.0 以上推奨)
- [pnpm](https://pnpm.io/)

### 手順

1.  **リポジトリをクローン:**

    ```bash
    git clone <repository-url>
    cd marp-slide-creator
    ```

2.  **依存関係をインストール:**

    ```bash
    pnpm install
    ```

3.  **環境変数を設定:**
    プロジェクトルートに `.env.local` ファイルを作成し、Google Gemini API キーを設定します。API キーは [Google AI Studio](https://aistudio.google.com/app/apikey) などで取得してください。

    ```.env.local
    GEMINI_API_KEY=YOUR_API_KEY_HERE
    ```

4.  **開発サーバーを起動:**

    ```bash
    pnpm dev
    ```

    アプリケーションが `http://localhost:3000` で起動します。

5.  **(オプション) ビルド:**

    ```bash
    pnpm build
    ```

6.  **(オプション) 本番サーバーを起動:**
    ```bash
    pnpm start
    ```

## ディレクトリ構造

```

├── app/ # Next.js App Router ディレクトリ
│ ├── api/gemini/generate/ # Gemini API ルート
│ ├── layout.tsx # ルートレイアウト
│ └── page.tsx # メインページ
├── components/ # UI コンポーネント
│ ├── ui/ # shadcn/ui 基本コンポーネント
│ ├── app-header.tsx # アプリヘッダー
│ ├── chat-pane.tsx # チャットUIコンテナ
│ ├── editor-pane.tsx # MarkdownエディタUI
│ ├── preview-pane.tsx # MarpプレビューUI
│ ├── image-library.tsx # 画像ライブラリ関連
│ └── ... # その他UIコンポーネント
├── hooks/ # カスタムフック (ロジック)
│ ├── use-chat.ts # チャット関連ロジック
│ ├── use-exporter.ts # エクスポート関連ロジック
│ ├── use-image-library.ts # 画像ライブラリ関連ロジック
│ └── ... # その他カスタムフック
├── lib/ # ライブラリ、ユーティリティ、型定義
│ ├── constants.ts # 定数
│ ├── db.ts # IndexedDB 操作
│ ├── db-context.tsx # DB初期化コンテキスト
│ ├── exportUtils.ts # エクスポートユーティリティ
│ ├── markdown-processor.ts # Markdown処理 (画像参照解決)
│ ├── types.ts # TypeScript 型定義
│ └── utils.ts # 汎用ユーティリティ
├── public/ # 静的ファイル
├── next.config.mjs # Next.js 設定
├── package.json # 依存関係・スクリプト
├── tailwind.config.ts # Tailwind CSS 設定
└── tsconfig.json # TypeScript 設定

```

## API連携 (Google Gemini)

- AI によるコンテンツ生成機能は Google Gemini API を利用しています。
- 利用するには、`.env.local` ファイルに有効な `GEMINI_API_KEY` を設定する必要があります。
- フロントエンドからのリクエストは `/api/gemini/generate` ルートハンドラ ( `app/api/gemini/generate/route.ts` ) によって処理され、Gemini API と通信します。

## ローカルストレージ (IndexedDB)

- ユーザーが作成したデータは、APIサーバーを介さずにブラウザの IndexedDB に直接保存されます。
- 保存されるデータ:
  - **ドキュメント:** Markdown コンテンツ、タイトル、タイムスタンプ (現在は単一ドキュメントのみ)
  - **チャット履歴:** ドキュメントに紐づく AI との対話ログ
  - **画像:** アップロードされた画像の Base64 データとメタデータ
- これにより、オフラインでの利用（AI機能を除く）や、プライバシーに配慮したデータ管理が可能です。ブラウザのストレージをクリアするとデータは失われます。
