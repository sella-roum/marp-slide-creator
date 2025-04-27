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

// Initialize Google Generative AI with API key
const API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Check if API key is available
    if (!API_KEY) {
      console.error("Gemini API key is not configured");
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "API key is not configured",
            code: "API_KEY_MISSING",
          },
        } as GeminiResponseType,
        { status: 500 }
      );
    }

    // Parse request body
    const requestData: GeminiRequestType = await request.json();
    const { prompt, context, taskType } = requestData;

    // Validate request
    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Prompt is required",
            code: "MISSING_PROMPT",
          },
        } as GeminiResponseType,
        { status: 400 }
      );
    }

    // Initialize the Gemini API client
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // --- システムプロンプトの構築 ---
    // systemInstruction に渡すため、Content オブジェクト形式にする
    const systemInstructionContent: Content = {
        role: "system", // またはモデルによっては "user" の最初のターンとして扱う
        parts: [{
            text: `You are an AI assistant specialized in helping users create Marp presentations.
Marp is a Markdown-based presentation tool.

When responding:
1. Always provide Markdown code that is compatible with Marp.
2. Wrap code blocks in triple backticks with 'markdown' or 'marp' label.
3. Include appropriate Marp directives like '---\\nmarp: true\\ntheme: default\\n---' at the beginning of presentations.
4. For slide separators, use '---' on a line by itself.
5. If asked for a theme, provide CSS that can be used with Marp's theme directive.
6. Respond in Japanese unless specifically asked to use another language.

Current user's Markdown content:
\`\`\`
${context?.currentMarkdown || "No content yet"}
\`\`\`
` // context が undefined の可能性を考慮
        }]
    };

    // タスク固有の指示をシステムプロンプトに追加
    let taskInstruction = "";
     if (taskType) {
      switch (taskType) {
        case "GenerateOutline":
          taskInstruction = `\nFocus on creating a well-structured presentation outline with appropriate sections and slide transitions.`;
          break;
        case "GenerateTheme":
          taskInstruction = `\nFocus on creating a custom CSS theme for Marp. Include detailed styling for backgrounds, text, headers, and other elements.`;
          break;
        case "GenerateMermaid":
          taskInstruction = `\nCreate a Mermaid diagram that can be embedded in a Marp presentation. Use the syntax: \`\`\`mermaid\n(diagram code)\n\`\`\``;
          break;
      }
      // systemInstructionContent の parts[0].text に追記
      if (systemInstructionContent.parts && systemInstructionContent.parts[0].text) {
          systemInstructionContent.parts[0].text += taskInstruction;
      }
    }
    // --- システムプロンプト構築ここまで ---


    // --- ユーザープロンプトの準備 ---
    const userContent: Content = {
        role: "user",
        parts: [{ text: prompt }]
    };
    // --- ユーザープロンプト準備ここまで ---


    try {
      // --- generateContent の呼び出し修正 ---
      const generationConfig: GenerateContentConfig = {
          // 必要に応じて temperature, topK, topP などを設定
          // responseMimeType: "application/json", // 必要ならJSON出力を指定
          // safetySettings: [...] // 必要ならセーフティ設定
      };

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash', // モデル名 (必要なら変更)
        // systemInstruction を config に渡す (推奨)
        // または contents の最初に role: "system" で渡す (モデルによる)
        // 今回は systemInstruction を使用しない例として、contents に含める
        contents: [userContent], // ユーザープロンプトのみを渡す
        config: {
            ...generationConfig,
            systemInstruction: systemInstructionContent // systemInstruction を config に設定
        }
      });
      // --- 呼び出し修正ここまで ---


      // --- レスポンス処理の修正 ---
      const resultText = response.text; // .text アクセサを使用
      console.log("Raw response text:", resultText); // デバッグ用ログ

      // レスポンスが空またはブロックされた場合のチェック
      if (!resultText) {
        console.error("モデルからの応答が空またはブロックされました。");
        if (response.promptFeedback?.blockReason) {
          const blockReason = response.promptFeedback.blockReason;
          console.error(`リクエストがブロックされました: ${blockReason}`);
          return NextResponse.json(
            {
              success: false,
              error: {
                message: `Request blocked due to: ${blockReason}`,
                code: "BLOCKED_CONTENT",
              },
            } as GeminiResponseType,
            { status: 400 } // Bad Request が適切か
          );
        }
         // candidates が空、または content がない場合も考慮
        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
             console.error("モデルから有効なコンテンツが得られませんでした。");
             return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: "AI model did not return valid content.",
                        code: "NO_VALID_CONTENT",
                    },
                } as GeminiResponseType,
                { status: 500 }
            );
        }
        // その他の理由で空の場合
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "AI model returned an empty response.",
              code: "EMPTY_RESPONSE",
            },
          } as GeminiResponseType,
          { status: 500 }
        );
      }
      // --- レスポンス処理修正ここまで ---


      // Extract markdown code if present
      const markdownCode = extractMarkdownCode(resultText); // resultText を渡す

      // Return response
      return NextResponse.json({
        success: true,
        result: {
          text: resultText, // resultText を使用
          markdownCode,
        },
      } as GeminiResponseType);

    } catch (genaiError) {
      console.error("Gemini API error:", genaiError);
      // エラーオブジェクトの詳細を出力
      if (genaiError instanceof Error) {
          console.error("API Error Details:", JSON.stringify(genaiError, null, 2));
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            message: genaiError instanceof Error ? genaiError.message : "Gemini API error",
            code: "GEMINI_API_ERROR",
            // 可能であればエラーの詳細を追加
            details: genaiError instanceof Error ? JSON.stringify(genaiError) : undefined
          },
        } as GeminiResponseType,
        { status: 500 } // APIエラーは 500 Internal Server Error または 502 Bad Gateway が適切か
      );
    }
  } catch (error) {
    console.error("Server error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Unknown server error",
          code: "SERVER_ERROR",
        },
      } as GeminiResponseType,
      { status: 500 }
    );
  }
}
