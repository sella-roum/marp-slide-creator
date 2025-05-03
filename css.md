## Marp スライドテーマカスタマイズ機能 実装計画

`plan.md` の提案に基づき、Marp スライドのテーマカスタマイズ機能を実装するための具体的な計画を以下に示します。

**目標:**

1.  ユーザーが Marp Core の内蔵テーマ (`default`, `gaia`, `uncover`) を選択できるようにする。
2.  ユーザーが独自のカスタム CSS を入力し、スライドに適用できるようにする。
3.  AI (Gemini) を利用してテーマ CSS を生成し、適用できるようにする。

**実装ステップ:**

### ステップ 1: データモデルの更新と準備 (DB, Types)

1.  **`lib/types.ts` の `DocumentType` を更新:**
    - `selectedTheme: string;` を追加 (デフォルト値: `'default'`)。値は `'default'`, `'gaia'`, `'uncover'`, `'custom'` のいずれか。
    - `customCss?: string;` を追加 (オプショナル)。カスタム CSS 文字列を格納。
2.  **`lib/db.ts` の更新:**
    - `initializeDB` 内の `onupgradeneeded`:
      - `documents` ストアの既存データに対するマイグレーション処理を追加（もし既存データが存在する場合）。`selectedTheme` に `'default'` を、`customCss` に `undefined` または空文字列を設定する。
      - _注意:_ 現在の実装は単一ドキュメント (`SINGLE_DOCUMENT_ID`) のため、`getDocument` や `updateDocument` でドキュメント取得/作成時にデフォルト値を設定する方がシンプルかもしれない。
    - `getDocument`, `updateDocument` 関数が新しい `selectedTheme` と `customCss` フィールドを正しく読み書きできるように確認・修正。
3.  **`app/page.tsx` の更新:**
    - `currentDocument` ステートの型を更新後の `DocumentType` に合わせる。
    - `loadOrCreateSingleDocument` 関数内で、新規ドキュメント作成時に `selectedTheme: 'default'` と `customCss: ''` (または `undefined`) を初期値として設定する。

### ステップ 2: 内蔵テーマ選択機能の実装 (UI, Logic)

1.  **UIコンポーネントの作成/修正:**
    - **場所:** `components/editor-toolbar.tsx` にテーマ選択用のドロップダウンを追加するのが自然か。スペースがなければ `components/app-header.tsx` に追加。
    - **コンポーネント:** `DropdownMenu` (shadcn/ui) を使用。
      - `DropdownMenuTrigger`: 現在選択中のテーマ名を表示するボタン。
      - `DropdownMenuContent`:
        - `DropdownMenuRadioGroup`: テーマ選択用。値は `selectedTheme` ステートと連動。
        - `DropdownMenuRadioItem`: `default`, `gaia`, `uncover` の選択肢。クリックで `selectedTheme` を更新。
2.  **`app/page.tsx` の状態管理とロジック:**
    - `currentDocument` から `selectedTheme` を取得し、ドロップダウンの初期値/選択状態に反映させる。
    - ドロップダウンでテーマが変更された際のハンドラ関数 (`handleThemeChange`) を作成。
      - この関数内で `setCurrentDocument` を呼び出してローカルステートを更新。
      - `updateDocument` を呼び出して、変更された `selectedTheme` を IndexedDB に保存する。`customCss` は変更しない（または `undefined` にリセットする）。
3.  **Marp ディレクティブへの反映:**
    - **場所:** `lib/markdown-processor.ts` または `components/preview-pane.tsx` 内で Markdown を Marp に渡す直前。
    - **ロジック:**
      - Markdown テキストの先頭にある Front Matter ( `--- ... ---` ) を解析。
      - `theme:` ディレクティブが存在すれば、現在の `selectedTheme` の値 (`default`, `gaia`, `uncover`) で上書きする。
      - `theme:` ディレクティブが存在せず、Front Matter が存在すれば、`theme:` を追加する。
      - Front Matter 自体が存在しなければ、`---\nmarp: true\ntheme: <selectedTheme>\n---\n\n` のような Front Matter を Markdown の先頭に追加する。
      - _注意:_ `selectedTheme` が `'custom'` の場合は、ここでは `theme: default` (または他のベーステーマ) を設定するか、`theme:` ディレクティブ自体を設定しないでおく（ステップ3で `<style>` を追加するため）。`theme: default` を設定しておくのが無難か。

### ステップ 3: カスタム CSS 機能の実装 (UI, Logic, Preview)

1.  **UIコンポーネントの作成/修正:**
    - **トリガー:** `EditorToolbar` に「カスタムCSS編集」ボタンを追加。
    - **ダイアログ:** `components/custom-css-dialog.tsx` を新規作成。
      - `Dialog` (shadcn/ui) を使用。
      - `DialogHeader`: タイトル「カスタムCSS編集」。
      - `DialogContent`:
        - `Textarea`: CSS を入力/編集するためのテキストエリア。値は `customCss` ステートと連動。シンタックスハイライトは将来的な改善点とする。
        - 簡単な説明文（例: 「ここに入力したCSSがスライド全体に適用されます」）。
      - `DialogFooter`: 「保存」ボタンと「キャンセル」ボタン。
2.  **`app/page.tsx` の状態管理とロジック:**
    - カスタムCSSダイアログの開閉状態 (`isCustomCssDialogOpen`) を管理するステートを追加。
    - `currentDocument` から `customCss` を取得し、ダイアログのテキストエリアの初期値に設定する。
    - テキストエリアの内容が変更された際のハンドラ関数 (`handleCustomCssChange`) を作成し、一時的なステートで管理するか、直接 `currentDocument` ステートを更新するか検討（`useDebounce` はここでは不要か）。
    - ダイアログの「保存」ボタンが押された際のハンドラ関数 (`handleSaveCustomCss`) を作成。
      - テキストエリアの内容 (`customCss`) と `selectedTheme: 'custom'` を `currentDocument` ステートに設定。
      - `updateDocument` を呼び出して IndexedDB に保存。
      - ダイアログを閉じる (`setIsCustomCssDialogOpen(false)`)。
3.  **プレビューへの反映:**
    - **場所:** `components/preview-pane.tsx` の `useEffect` 内、Marp レンダリング後。
    - **ロジック:**
      - `currentDocument` から `customCss` を取得（Props経由で渡す）。
      - `marpInstance.render()` で `html` と `css` を取得した後、`customCss` が存在すれば、`<style data-custom-theme>${customCss}</style>` のようなタグを生成し、Marp が生成した `<style>` タグの後（または `<head>` 内の適切な場所）に追加してから `iframe` の `srcDoc` に設定する。
      - `selectedTheme` が `'custom'` でなくても `customCss` が存在すれば適用する、という仕様も可能だが、UI との整合性を考えると `'custom'` の場合のみ適用するのが分かりやすいか。

### ステップ 4: AI テーマ生成機能の実装 (Chat, API, Logic)

1.  **トリガーUI:**
    - **方法1 (コマンド):** `ChatInputArea` で `/theme <プロンプト>` のような形式を検知するロジックを `useChat` に追加。
    - **方法2 (ボタン):** `ChatInputArea` 付近に「AIテーマ生成」ボタンを追加し、クリックでプロンプト入力用のモーダルを表示するか、直接チャット入力欄にフォーカスさせる。コマンド方式の方がシンプルか。
2.  **`hooks/use-chat.ts` の更新:**
    - `handleSendMessage` 内、または専用のハンドラで `/theme` コマンドを判定。
    - 判定した場合、API リクエストボディに `taskType: "GenerateTheme"` と、コマンドから抽出したプロンプト（例: "青系のクールなテーマ"）を含めて `/api/gemini/generate` を呼び出す。
    - API 応答を処理する部分で、成功時に返される CSS コード (`data.result.markdownCode` に相当する部分) を取得。
    - 取得した CSS を適用するための新しいコールバック関数プロップ (`onApplyCustomCss`) を `useChat` の引数に追加し、それを呼び出す。
    - チャット履歴に「AIにテーマ生成を依頼中...」「テーマCSSを生成し、適用しました。」「テーマ生成に失敗しました: <理由>」のようなフィードバックメッセージを追加する。
3.  **`app/api/gemini/generate/route.ts` の更新:**
    - リクエストボディから `taskType` を受け取る。
    - `taskType` が `"GenerateTheme"` の場合:
      - `systemInstructionText` に Marp 用の CSS テーマ生成に特化した指示を追加する。「あなたは Marp プレゼンテーション用の CSS テーマを作成する専門家です。ユーザーの要望に基づき、有効な CSS コードのみを生成し、必ず `css ... ` で囲んで返してください。他の説明文は不要です。」のような内容。
      - Gemini API へのリクエストにこのシステム指示を含める。
      - レスポンスから CSS コードを `extractMarkdownCode` または類似のロジックで抽出し、`result.markdownCode` として返すように調整（`extractMarkdownCode` は現状 Markdown 用なので、CSS 用の抽出ロジックが必要になる可能性あり。単純に `css ... ` の中身を取り出す処理で良いか）。
4.  **`app/page.tsx` の更新:**
    - `ChatPane` に新しいプロップ `onApplyCustomCss` を追加し、カスタム CSS を受け取ってステート (`customCss`, `selectedTheme`) を更新し、`updateDocument` で DB に保存する関数を渡す（ステップ3の `handleSaveCustomCss` と同様の処理）。

**考慮事項と詳細化:**

- **Marp ディレクティブのパース/更新:** Markdown 先頭の Front Matter を安全にパースし、`theme:` ディレクティブを更新/追加する堅牢なロジックが必要。正規表現やシンプルな文字列操作で対応可能か、ライブラリを使うか検討。
- **カスタム CSS の検証:** ユーザー入力や AI 生成の CSS が有効かどうかの基本的な検証（構文エラーチェックなど）を追加すると親切だが、必須ではない。
- **テーマ切り替え時の挙動:** 内蔵テーマからカスタム CSS に切り替えた場合、またはその逆の場合の `selectedTheme` と `customCss` の状態遷移を明確にする。
- **UI/UX:** テーマ選択、カスタム CSS 編集、AI 生成の各機能をどのようにユーザーに提示するか。設定パネルのようなものを設ける方が、ツールバーが複雑化するより良いかもしれない。
- **エラーハンドリング:** 各ステップでのエラー（DB 保存失敗、API 通信失敗、CSS パース失敗など）に対するユーザーへのフィードバックを `useErrorHandler` を通じて適切に行う。

この計画により、段階的にテーマカスタマイズ機能を実装し、ユーザーがより柔軟にスライドの外観を調整できるようになります。
