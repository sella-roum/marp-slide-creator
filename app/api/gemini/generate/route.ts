import { type NextRequest, NextResponse } from "next/server";
import {
  GoogleGenAI,
  GenerateContentResponse,
  Content,
  GenerateContentConfig,
  Part,
} from "@google/genai";
// ChatMessageType と GeminiResponseType のインポートを更新
import type { GeminiRequestType, GeminiResponseType, GeminiTaskType, ChatMessageType } from "@/lib/types";
import { extractMarkdownCode, extractCssCode } from "@/lib/utils";

const API_KEY = process.env.GEMINI_API_KEY;

// --- 履歴データを Gemini API の Content[] 形式に変換するヘルパー関数 (変更なし) ---
function formatHistoryForGemini(history: ChatMessageType[]): Content[] {
  const formattedHistory: Content[] = [];
  history.forEach(message => {
    // システムメッセージは履歴に含めない
    if (message.role === "user") {
      formattedHistory.push({ role: "user", parts: [{ text: message.content }] });
    } else if (message.role === "assistant") {
      // アシスタントの応答も履歴に含める (content のみ)
      formattedHistory.push({ role: "model", parts: [{ text: message.content }] });
    }
  });
  return formattedHistory;
}
// --- ここまで ---

export async function POST(request: NextRequest): Promise<NextResponse<GeminiResponseType>> {
  try {
    if (!API_KEY) {
      console.error("Gemini API key is not configured.");
      return NextResponse.json(
        { success: false, error: { message: "API key is not configured.", code: "API_KEY_MISSING" } },
        { status: 500 }
      );
    }

    // --- history を受け取る (変更なし) ---
    const requestData: GeminiRequestType & { history?: ChatMessageType[] } = await request.json();
    const { prompt, context, taskType, history } = requestData;
    // --- ここまで ---

    if (!prompt) {
      console.error("Prompt is required.");
      return NextResponse.json(
        { success: false, error: { message: "Prompt is required.", code: "MISSING_PROMPT" } },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    // --- ▼ モデル名を定義 ▼ ---
    const PRIMARY_MODEL_NAME = "gemini-2.5-flash-preview-04-17";
    const FALLBACK_MODEL_NAME = "gemini-2.0-flash";
    // --- ▲ モデル名を定義 ▲ ---

    // --- システムプロンプトの構築 (変更なし) ---
    let systemInstructionText = "";
    const currentMarkdownText = context?.currentMarkdown || "No content yet";
    const effectiveTaskType: GeminiTaskType = taskType || "GeneralConsultation";

    switch (effectiveTaskType) {
      case "GenerateTheme":
        systemInstructionText = `You are an expert CSS generator specializing in creating themes for Marp presentations.
Based on the user's request: "${prompt}"
Generate a valid CSS code block suitable for a Marp theme.
IMPORTANT: Respond ONLY with the CSS code itself, enclosed in a single Markdown code block labeled 'css'. Do NOT include any introductory text, explanations, or other content outside the code block.
Example response format:
\`\`\`css
/* CSS rules based on user request */
h1 {
  color: blue;
}
section {
  background-color: lightblue;
}
\`\`\`
`;
        break;
      case "GenerateSlideContent":
        systemInstructionText = `You are an AI assistant specialized in helping users create Marp presentations.
Marp is a Markdown-based presentation tool. Your primary goal is to generate Marp-compatible Markdown content based on the user's request.

When generating slide content:
- Always provide Markdown code that is compatible with Marp.
- Wrap all generated code blocks, including the main presentation content, in triple backticks (\`\`\`) with 'markdown' or 'marp' label.
- Include appropriate Marp directives (like \`---\\nmarp: true\\ntheme: default\\n---\`) ONLY if the user explicitly asks for a full new presentation structure or if the context is empty. Otherwise, focus on generating the requested slide content.
- Use \`---\` on a line by itself for slide separators.
- If asked for an outline, use Markdown headers and slide separators.
- If asked for a Mermaid diagram, provide only the Mermaid code wrapped in a markdown block with 'mermaid' label.
- Respond primarily in Japanese, unless the user explicitly requests another language.

Current user's Markdown content (for context, if applicable):
\`\`\`
${currentMarkdownText}
\`\`\`

User's specific request for slide content: "${prompt}"
Generate the requested Marp Markdown content.`;
        break;
      case "GeneralConsultation":
      default:
        systemInstructionText = `You are a helpful AI assistant. The user is working on a Marp presentation and has a general question or needs consultation.
Respond clearly and concisely to the user's request: "${prompt}"
Provide helpful information or advice related to Marp, presentations, or the user's query.
If the user asks for code examples (like CSS snippets or Markdown syntax), provide them in appropriate code blocks.
Respond primarily in Japanese, unless the user explicitly requests another language.

Current user's Markdown content (for context, if applicable):
\`\`\`
${currentMarkdownText}
\`\`\`
`;
        break;
    }
    // --- システムプロンプト構築ここまで ---

    const systemInstructionContent: Content = {
      role: "system",
      parts: [{ text: systemInstructionText }],
    };

    // --- 履歴データと最新のプロンプトを結合 (変更なし) ---
    const formattedHistory: Content[] = history ? formatHistoryForGemini(history) : [];
    const userContent: Content = {
      role: "user",
      parts: [{ text: prompt }],
    };
    const contentsForApi: Content[] = [...formattedHistory, userContent];
    // --- ここまで ---

    // --- ▼ Gemini API 呼び出しとリトライロジック ▼ ---
    let response: GenerateContentResponse;
    try {
      // 1回目の試行 (プライマリモデル)
      console.log(`Attempting generation with primary model: ${PRIMARY_MODEL_NAME}`);
      const generationConfig: GenerateContentConfig = {};
      response = await ai.models.generateContent({
        model: PRIMARY_MODEL_NAME,
        contents: contentsForApi,
        config: {
          ...generationConfig,
          systemInstruction: systemInstructionContent,
        },
      });
      console.log(`Generation successful with primary model: ${PRIMARY_MODEL_NAME}`);

    } catch (primaryError: any) {
      console.warn(`Primary model (${PRIMARY_MODEL_NAME}) failed:`, primaryError.message);
      console.log(`Attempting fallback generation with model: ${FALLBACK_MODEL_NAME}`);

      try {
        // 2回目の試行 (フォールバックモデル)
        const generationConfig: GenerateContentConfig = {};
        response = await ai.models.generateContent({
          model: FALLBACK_MODEL_NAME,
          contents: contentsForApi,
          config: {
            ...generationConfig,
            systemInstruction: systemInstructionContent,
          },
        });
        console.log(`Generation successful with fallback model: ${FALLBACK_MODEL_NAME}`);

      } catch (fallbackError: any) {
        // フォールバックも失敗した場合のエラーハンドリング
        console.error(`Fallback model (${FALLBACK_MODEL_NAME}) also failed:`, fallbackError);
        console.error("Gemini API call error (Primary):", primaryError); // 元のエラーもログに出力
        const errorDetails: any = {
             name: fallbackError.name || primaryError.name,
             message: fallbackError.message || primaryError.message || "An error occurred during Gemini API call after fallback.",
             stack: process.env.NODE_ENV !== 'production' ? (fallbackError.stack || primaryError.stack) : undefined,
             primaryError: { name: primaryError.name, message: primaryError.message },
             fallbackError: { name: fallbackError.name, message: fallbackError.message },
        };
         if (fallbackError.cause || primaryError.cause) {
             errorDetails.cause = fallbackError.cause?.message || primaryError.cause?.message || fallbackError.cause || primaryError.cause;
         }
         if (fallbackError.status || primaryError.status) {
              errorDetails.apiStatus = fallbackError.status || primaryError.status;
         }
          if (fallbackError.error || primaryError.error) {
               errorDetails.apiError = fallbackError.error || primaryError.error;
         }
        return NextResponse.json(
          { success: false, error: { message: errorDetails.message, code: fallbackError.code || primaryError.code || "GEMINI_API_FALLBACK_ERROR", details: errorDetails } },
          { status: fallbackError.status || primaryError.status || 500 }
        );
      }
    }
    // --- ▲ Gemini API 呼び出しとリトライロジック ▲ ---


    // --- ▼ レスポンス処理 (変更なし) ▼ ---
    const resultText = response.text; // Geminiからの応答テキスト全体

    if (!response.candidates || response.candidates.length === 0) {
       console.error("Model returned no candidates.");
       if (response.promptFeedback?.blockReason) {
          const blockReason = response.promptFeedback.blockReason;
          const blockMessage = response.promptFeedback.blockReasonMessage || "Content blocked by safety settings.";
          console.error(`Request blocked. Reason: ${blockReason}, Message: ${blockMessage}`);
          return NextResponse.json(
            { success: false, error: { message: `Request blocked: ${blockMessage}`, code: `BLOCKED_CONTENT_${blockReason}`, details: response.promptFeedback } },
            { status: 400 }
          );
       }
        console.error("Model returned no valid candidates.");
        return NextResponse.json(
          { success: false, error: { message: "AI model did not return valid candidates.", code: "NO_VALID_CANDIDATES", details: response } },
          { status: 500 }
        );
    }

    if (!resultText) {
         console.error("Model returned candidates but no text content.");
           return NextResponse.json(
            { success: false, error: { message: "AI model returned candidates but no text content.", code: "NO_TEXT_CONTENT", details: response } },
            { status: 500 }
          );
    }

    // コード抽出
    let slideMarkdown: string | null = null;
    let cssCode: string | null = null;

    if (effectiveTaskType === "GenerateSlideContent") {
      slideMarkdown = extractMarkdownCode(resultText);
    } else if (effectiveTaskType === "GenerateTheme") {
      cssCode = extractCssCode(resultText);
    }

    // 新しいレスポンス形式で返す
    return NextResponse.json({
      success: true,
      result: {
        text: resultText, // 応答テキスト全体
        slideMarkdown: slideMarkdown, // スライドMarkdown (あれば)
        cssCode: cssCode,         // CSSコード (あれば)
      },
    });
    // --- ▲ レスポンス処理 (変更なし) ▲ ---

  } catch (error: any) {
     // この catch は主にリクエスト処理中の予期せぬエラー (JSONパースエラーなど) を捕捉
     console.error("Server error:", error);
    const errorDetails: any = {
         name: error.name,
         message: error.message,
         stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      };
    return NextResponse.json(
      { success: false, error: { message: error.message || "An unknown server error occurred.", code: "SERVER_ERROR", details: errorDetails } },
      { status: 500 }
    );
  }
}
