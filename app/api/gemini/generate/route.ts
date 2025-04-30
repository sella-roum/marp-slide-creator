import { type NextRequest, NextResponse } from "next/server";
import {
  GoogleGenAI,
  GenerateContentResponse, // レスポンスの型
  Content, // contents 配列の型
  // Part, // parts 配列の型
  GenerateContentConfig, // 設定の型
  // HarmCategory, // 必要に応じてインポート
  // HarmBlockThreshold, // 必要に応じてインポート
} from "@google/genai";
import type { GeminiRequestType, GeminiResponseType } from "@/lib/types"; // 型定義は外部にあると仮定
import { extractMarkdownCode } from "@/lib/utils"; // 外部関数と仮定

// 環境変数からGoogle Gemini APIキーを取得
const API_KEY = process.env.GEMINI_API_KEY;

// POSTリクエストハンドラ
export async function POST(request: NextRequest): Promise<NextResponse<GeminiResponseType>> {
  try {
    // APIキーの存在チェック
    if (!API_KEY) {
      console.error("Gemini API key is not configured.");
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "API key is not configured.",
            code: "API_KEY_MISSING",
          },
        },
        { status: 500 } // サーバー側の設定エラー
      );
    }

    // リクエストボディのパース
    const requestData: GeminiRequestType = await request.json();
    const { prompt, context, taskType } = requestData;

    // プロンプトの検証
    if (!prompt) {
      console.error("Prompt is required.");
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Prompt is required.",
            code: "MISSING_PROMPT",
          },
        },
        { status: 400 } // 不正なリクエスト
      );
    }

    // Google Gemini APIクライアントの初期化
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const modelName = "gemini-2.0-flash"; // 使用するモデル名（必要に応じて変更）

    // --- システムプロンプトの構築 ---
    let systemInstructionText = `You are an AI assistant specialized in helping users create Marp presentations.
Marp is a Markdown-based presentation tool.

When generating content:
- Always provide Markdown code that is compatible with Marp.
- Wrap all generated code blocks, including the main presentation content, in triple backticks (\`\`\`) with 'markdown' or 'marp' label.
- Include appropriate Marp directives (like \`---\\nmarp: true\\ntheme: default\\n---\`) at the very beginning of the presentation Markdown.
- Use \`---\` on a line by itself for slide separators.
- If asked for a theme, provide only the CSS content wrapped in a single markdown block with 'css' label, explaining how to use it with Marp's theme directive.
- Respond primarily in Japanese, unless the user explicitly requests another language.

Current user's Markdown content (for context, if applicable):
\`\`\`
${context?.currentMarkdown || "No content yet"}
\`\`\`

User's specific request: "${prompt}"
`;

    // タスクタイプに基づく追加の指示
    if (taskType) {
      switch (taskType) {
        case "GenerateOutline":
          systemInstructionText += `\nBased on the user's request and current content, generate a well-structured outline for a Marp presentation using Markdown headers and slide separators. Provide only the Markdown outline.`;
          break;
        case "GenerateTheme":
          systemInstructionText += `\nBased on the user's request, generate a custom CSS theme for Marp. Provide only the CSS code wrapped in a markdown block with 'css' label.`;
          break;
        case "GenerateMermaid":
          systemInstructionText += `\nBased on the user's request, generate a Mermaid diagram. Provide only the Mermaid code wrapped in a markdown block with 'mermaid' label.`;
          break;
        // 他のタスクタイプに対応する指示を追加
      }
    }

    const systemInstructionContent: Content = {
      role: "system",
      parts: [{ text: systemInstructionText }],
    };
    // --- システムプロンプト構築ここまで ---

    // --- ユーザープロンプトの準備 ---
    const userContent: Content = {
      role: "user",
      parts: [{ text: prompt }],
    };
    // --- ユーザープロンプト準備ここまで ---

    try {
      // generateContent の呼び出し
      const generationConfig: GenerateContentConfig = {
        // モデルの応答設定をここに追加（任意）
        // temperature: 0.9,
        // topK: 1,
        // topP: 0.95,
        // maxOutputTokens: 8192, // 例: 最大トークン数を設定
        // responseMimeType: taskType === "GenerateTheme" || taskType === "GenerateMermaid" ? "text/plain" : "text/plain", // 明示的に指定
        // safetySettings: [...] // 必要ならセーフティ設定
      };

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelName,
        contents: [userContent], // ユーザープロンプトのみを渡す
        config: {
          ...generationConfig,
          systemInstruction: systemInstructionContent, // systemInstruction を config に設定
        },
      });

      // レスポンステキストを取得
      const resultText = response.text;

      // レスポンスが空またはブロックされた場合のチェックを修正
      if (!response.candidates || response.candidates.length === 0) {
         console.error("Model returned no candidates.");
         // プロンプトフィードバックによるブロック理由を確認
         if (response.promptFeedback?.blockReason) {
            const blockReason = response.promptFeedback.blockReason;
            const blockMessage = response.promptFeedback.blockReasonMessage || "Content blocked by safety settings.";
            console.error(`Request blocked. Reason: ${blockReason}, Message: ${blockMessage}`);
            return NextResponse.json(
              {
                success: false,
                error: {
                  message: `Request blocked: ${blockMessage}`,
                  code: `BLOCKED_CONTENT_${blockReason}`, // より具体的なコードを返す
                  details: response.promptFeedback, // フィードバック詳細を返す
                },
              },
              { status: 400 } // クライアントの入力に問題がある可能性が高いので400
            );
         }
         // その他の理由で候補がゼロの場合
          console.error("Model returned no valid candidates.");
          return NextResponse.json(
            {
              success: false,
              error: {
                message: "AI model did not return valid candidates.",
                code: "NO_VALID_CANDIDATES",
                 details: response, // レスポンス全体をログ/デバッグ用に戻す
              },
            },
            { status: 500 }
          );
      }

      // candidates.content または response.text が存在しない場合もエラーとする
      // response.text アクセサは最初の候補のtext部分を返すので、これを確認すれば十分なことが多い
      if (!resultText) {
           console.error("Model returned candidates but no text content.");
             return NextResponse.json(
              {
                success: false,
                error: {
                  message: "AI model returned candidates but no text content.",
                  code: "NO_TEXT_CONTENT",
                   details: response, // レスポンス全体をログ/デバッグ用に戻す
                },
              },
              { status: 500 }
            );
      }


      // 外部関数を使用してMarkdownコードを抽出
      const markdownCode = extractMarkdownCode(resultText);

      // 成功レスポンス
      return NextResponse.json({
        success: true,
        result: {
          text: resultText,
          markdownCode: markdownCode || resultText, // 抽出できなくても元のテキストをフォールバックとして返す
        },
      });

    } catch (genaiError: any) {
      // Gemini API呼び出し中に発生したエラー
      console.error("Gemini API call error:", genaiError);

      // エラー詳細をログに出力 (SDKのエラー構造に依存)
      const errorDetails: any = {
           name: genaiError.name,
           message: genaiError.message,
           stack: process.env.NODE_ENV !== 'production' ? genaiError.stack : undefined, // 開発環境のみスタックトレース
      };
      if (genaiError.cause) {
          console.error("API Error Cause:", genaiError.cause);
          errorDetails.cause = genaiError.cause.message || genaiError.cause; // causeの詳細も取得
      }
      if (genaiError.status) {
           console.error("API Error Status:", genaiError.status);
           errorDetails.apiStatus = genaiError.status; // HTTPステータスコード
      }
       if (genaiError.error) { // APIからのエラーレスポンスボディ
           console.error("API Error Body:", genaiError.error);
            errorDetails.apiError = genaiError.error; // APIから返されたエラーボディ
      }


      return NextResponse.json(
        {
          success: false,
          error: {
            message: genaiError.message || "An error occurred while calling the Gemini API.",
            code: genaiError.code || "GEMINI_API_ERROR", // 可能であればSDKのエラーコードを使用
            details: errorDetails,
          },
        },
        { status: genaiError.status || 500 } // APIエラーのステータスコードを使用、なければ500
      );
    }

  } catch (error: any) {
    // その他のサーバーサイドエラー（リクエストパース失敗など）
    console.error("Server error:", error);

     const errorDetails: any = {
         name: error.name,
         message: error.message,
         stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined, // 開発環境のみスタックトレース
      };

    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message || "An unknown server error occurred.",
          code: "SERVER_ERROR",
          details: errorDetails,
        },
      },
      { status: 500 }
    );
  }
}
