import { type NextRequest, NextResponse } from "next/server";
import {
  GoogleGenAI,
  GenerateContentResponse,
  Content,
  GenerateContentConfig,
  Part,
  Schema,
  Type,
} from "@google/genai";
import type { GeminiRequestType, GeminiResponseType, GeminiTaskType, ChatMessageType } from "@/lib/types";
import { extractMarkdownCode, extractCssCode } from "@/lib/utils";

const API_KEY = process.env.GEMINI_API_KEY;

// --- 履歴データを Gemini API の Content[] 形式に変換するヘルパー関数 ---
function formatHistoryForGemini(history: ChatMessageType[]): Content[] {
  const formattedHistory: Content[] = [];
  history.forEach(message => {
    if (message.role === "user") {
      formattedHistory.push({ role: "user", parts: [{ text: message.content }] });
    } else if (message.role === "assistant") {
      // 履歴にはAIの生応答(JSON文字列含む)を入れる
      formattedHistory.push({ role: "model", parts: [{ text: message.content }] });
    }
  });
  return formattedHistory;
}
// --- ここまで ---

// --- ★ 応答スキーマの定義 (explanation を追加) ---
const slideSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    slideMarkdown: {
      type: Type.STRING,
      description: "Generated Marp Markdown content.",
    },
    explanation: { // ★ 追加
      type: Type.STRING,
      description: "A brief explanation or thought process behind the generated Markdown.",
      nullable: true, // オプショナルにする場合
    },
  },
  required: ["slideMarkdown"], // explanation は必須ではない場合
};

const cssSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    cssCode: {
      type: Type.STRING,
      description: "Generated CSS code for Marp theme.",
    },
    explanation: { // ★ 追加
      type: Type.STRING,
      description: "A brief explanation or thought process behind the generated CSS.",
      nullable: true, // オプショナルにする場合
    },
  },
  required: ["cssCode"], // explanation は必須ではない場合
};
// --- スキーマ定義ここまで ---

export async function POST(request: NextRequest): Promise<NextResponse<GeminiResponseType>> {
  try {
    if (!API_KEY) {
      console.error("Gemini API key is not configured.");
      return NextResponse.json(
        { success: false, error: { message: "API key is not configured.", code: "API_KEY_MISSING" } },
        { status: 500 }
      );
    }

    const requestData: GeminiRequestType & { history?: ChatMessageType[] } = await request.json();
    const { prompt, context, taskType, history } = requestData;

    if (!prompt) {
      console.error("Prompt is required.");
      return NextResponse.json(
        { success: false, error: { message: "Prompt is required.", code: "MISSING_PROMPT" } },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const PRIMARY_MODEL_NAME = "gemini-2.5-flash-preview-04-17";
    const FALLBACK_MODEL_NAME = "gemini-2.0-flash";

    // --- システムプロンプトの構築 (★修正箇所あり) ---
    let systemInstructionText = "";
    const currentMarkdownText = context?.currentMarkdown || "No content yet";
    const effectiveTaskType: GeminiTaskType = taskType || "GeneralConsultation";
    const generationConfig: GenerateContentConfig = {};

    switch (effectiveTaskType) {
      case "GenerateTheme":
        // ★ CSS生成の指示を修正 (explanation を要求)
        systemInstructionText = `You are an expert CSS generator specializing in creating themes for Marp presentations.
Based on the user's request: "${prompt}"
Generate a valid CSS code block suitable for a Marp theme.
IMPORTANT: Respond ONLY with a JSON object matching the following schema:
{
  "type": "OBJECT",
  "properties": {
    "cssCode": { "type": "STRING", "description": "Generated CSS code for Marp theme." },
    "explanation": { "type": "STRING", "description": "A brief explanation or thought process behind the generated CSS.", "nullable": true }
  },
  "required": ["cssCode"]
}
The 'cssCode' property should contain ONLY the CSS code itself.
The 'explanation' property should contain a brief explanation of the generated CSS or your thought process (optional).
Do NOT include any other text or explanations outside the JSON response.`;
        generationConfig.responseMimeType = "application/json";
        generationConfig.responseSchema = cssSchema;
        break;
      case "GenerateSlideContent":
        // ★ スライドコンテンツ生成の指示を修正 (explanation を要求)
        systemInstructionText = `You are an AI assistant specialized in helping users create Marp presentations.
Marp is a Markdown-based presentation tool. Your primary goal is to generate Marp-compatible Markdown content based on the user's request.

When generating slide content:
- Always provide Markdown code that is compatible with Marp.
- Use \`---\` on a line by itself for slide separators.
- If asked for an outline, use Markdown headers and slide separators.
- If asked for a Mermaid diagram, provide only the Mermaid code wrapped in a markdown block with 'mermaid' label.
- Respond primarily in Japanese, unless the user explicitly requests another language.
- IMPORTANT: Respond ONLY with a JSON object matching the following schema:
{
  "type": "OBJECT",
  "properties": {
    "slideMarkdown": { "type": "STRING", "description": "Generated Marp Markdown content." },
    "explanation": { "type": "STRING", "description": "A brief explanation or thought process behind the generated Markdown.", "nullable": true }
  },
  "required": ["slideMarkdown"]
}
The 'slideMarkdown' property should contain ONLY the complete Marp Markdown content.
The 'explanation' property should contain a brief explanation of the generated Markdown or your thought process (optional).
Do NOT include any introductory text, explanations, greetings, or any other content outside the JSON response.
- Include appropriate Marp directives (like \`---\\nmarp: true\\ntheme: default\\n---\`) ONLY if the user explicitly asks for a full new presentation structure or if the context is empty. Otherwise, focus on generating the requested slide content.

Current user's Markdown content (for context, if applicable):
\`\`\`
${currentMarkdownText}
\`\`\`

User's specific request for slide content: "${prompt}"
Generate ONLY the requested Marp Markdown content and an optional explanation, returning them within the 'slideMarkdown' and 'explanation' properties of the JSON object according to the specified schema.`;
        generationConfig.responseMimeType = "application/json";
        generationConfig.responseSchema = slideSchema;
        break;
      case "GeneralConsultation":
      default:
        // 一般相談の指示は変更なし (テキスト応答)
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

    const formattedHistory: Content[] = history ? formatHistoryForGemini(history) : [];
    const userContent: Content = {
      role: "user",
      parts: [{ text: prompt }],
    };
    const contentsForApi: Content[] = [...formattedHistory, userContent];

    // --- ▼ Gemini API 呼び出しとリトライロジック ▼ ---
    let response: GenerateContentResponse;
    try {
      console.log(`Attempting generation with primary model: ${PRIMARY_MODEL_NAME}`);
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
        console.error("Gemini API call error (Primary):", primaryError);
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


    // --- ▼ レスポンス処理 (★修正箇所あり) ▼ ---
    let slideMarkdown: string | null = null;
    let cssCode: string | null = null;
    let explanation: string | null = null; // ★ explanation を抽出する変数
    let responseText = ""; // AIからの生応答テキスト

    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content?.parts?.[0]?.text) {
        responseText = response.candidates[0].content.parts[0].text;

        // Structured Output を期待するタスクの場合、JSONをパース
        if (effectiveTaskType === "GenerateSlideContent" || effectiveTaskType === "GenerateTheme") {
            try {
                const parsedJson = JSON.parse(responseText);

                // ★ explanation も抽出
                if (parsedJson.explanation && typeof parsedJson.explanation === 'string') {
                    explanation = parsedJson.explanation;
                    console.log("Extracted explanation from JSON response.");
                }

                if (effectiveTaskType === "GenerateSlideContent") {
                    if (parsedJson.slideMarkdown && typeof parsedJson.slideMarkdown === 'string') {
                        slideMarkdown = parsedJson.slideMarkdown;
                        console.log("Extracted slideMarkdown from JSON response.");
                    } else {
                        console.warn("JSON response did not contain 'slideMarkdown' string property.");
                        slideMarkdown = extractMarkdownCode(responseText); // フォールバック
                        if (slideMarkdown) console.log("Fallback: Extracted slideMarkdown using regex.");
                    }
                } else if (effectiveTaskType === "GenerateTheme") {
                    if (parsedJson.cssCode && typeof parsedJson.cssCode === 'string') {
                        cssCode = parsedJson.cssCode;
                        console.log("Extracted cssCode from JSON response.");
                    } else {
                        console.warn("JSON response did not contain 'cssCode' string property.");
                        cssCode = extractCssCode(responseText); // フォールバック
                        if (cssCode) console.log("Fallback: Extracted cssCode using regex.");
                    }
                }
            } catch (parseError) {
                console.error("Failed to parse JSON response, attempting fallback extraction:", parseError);
                // JSONパース失敗時のフォールバック
                if (effectiveTaskType === "GenerateSlideContent") {
                    slideMarkdown = extractMarkdownCode(responseText);
                    if (slideMarkdown) console.log("Fallback: Extracted slideMarkdown using regex after parse error.");
                } else if (effectiveTaskType === "GenerateTheme") {
                    cssCode = extractCssCode(responseText);
                    if (cssCode) console.log("Fallback: Extracted cssCode using regex after parse error.");
                }
                // ★ パースエラーの場合でも、responseText 自体は explanation として使える可能性がある
                //    ただし、今回は explanation は JSON からのみ取得する方針とする
                explanation = "AIからの応答を解析できませんでした。"; // エラーメッセージを設定
            }
        }
        // GeneralConsultation の場合は responseText をそのまま使う (explanation は null のまま)
    } else {
       // 応答テキストがない場合のエラーハンドリング
       console.error("Model returned no candidates or no text content.");
       if (response.promptFeedback?.blockReason) {
          const blockReason = response.promptFeedback.blockReason;
          const blockMessage = response.promptFeedback.blockReasonMessage || "Content blocked by safety settings.";
          console.error(`Request blocked. Reason: ${blockReason}, Message: ${blockMessage}`);
          return NextResponse.json(
            { success: false, error: { message: `Request blocked: ${blockMessage}`, code: `BLOCKED_CONTENT_${blockReason}`, details: response.promptFeedback } },
            { status: 400 }
          );
       }
        return NextResponse.json(
          { success: false, error: { message: "AI model did not return valid candidates or text content.", code: "NO_VALID_CANDIDATES_OR_TEXT", details: response } },
          { status: 500 }
        );
    }

    // 新しいレスポンス形式で返す (★ explanation を追加)
    return NextResponse.json({
      success: true,
      result: {
        text: responseText, // AIからの生応答テキスト（JSON文字列または通常のテキスト）
        slideMarkdown: slideMarkdown,
        cssCode: cssCode,
        explanation: explanation, // ★ 抽出した explanation を含める
      },
    });
    // --- ▲ レスポンス処理 ▲ ---

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
