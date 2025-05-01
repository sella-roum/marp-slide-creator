// app/api/gemini/generate/route.ts
import { type NextRequest, NextResponse } from "next/server";
import {
  GoogleGenAI,
  GenerateContentResponse,
  Content,
  GenerateContentConfig,
} from "@google/genai";
import type { GeminiRequestType, GeminiResponseType, GeminiTaskType } from "@/lib/types"; // ★ GeminiTaskType をインポート
import { extractMarkdownCode, extractCssCode } from "@/lib/utils";

const API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request: NextRequest): Promise<NextResponse<GeminiResponseType>> {
  try {
    if (!API_KEY) {
      console.error("Gemini API key is not configured.");
      return NextResponse.json(
        { success: false, error: { message: "API key is not configured.", code: "API_KEY_MISSING" } },
        { status: 500 }
      );
    }

    const requestData: GeminiRequestType = await request.json();
    const { prompt, context, taskType } = requestData; // taskType は GeminiTaskType | undefined

    if (!prompt) {
      console.error("Prompt is required.");
      return NextResponse.json(
        { success: false, error: { message: "Prompt is required.", code: "MISSING_PROMPT" } },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const modelName = "gemini-1.5-flash";

    // --- ★ システムプロンプトの構築 (taskTypeに応じて変更) ---
    let systemInstructionText = "";
    const currentMarkdownText = context?.currentMarkdown || "No content yet";

    // デフォルトのタスクタイプを決定
    const effectiveTaskType: GeminiTaskType = taskType || "GeneralConsultation"; // デフォルトを相談にする

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
      default: // 未知のタイプやデフォルトはこちら
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

    const userContent: Content = {
      role: "user",
      parts: [{ text: prompt }],
    };

    try {
      const generationConfig: GenerateContentConfig = {};

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelName,
        contents: [userContent],
        config: {
          ...generationConfig,
          systemInstruction: systemInstructionContent,
        },
      });

      const resultText = response.text;

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

      // --- コード抽出ロジック ---
      let extractedCode: string | null = null;
      if (effectiveTaskType === "GenerateTheme") { // ★ effectiveTaskType を使用
        extractedCode = extractCssCode(resultText);
      } else {
        extractedCode = extractMarkdownCode(resultText);
      }
      // --- コード抽出ここまで ---

      return NextResponse.json({
        success: true,
        result: {
          text: resultText,
          markdownCode: extractedCode,
        },
      });

    } catch (genaiError: any) {
      console.error("Gemini API call error:", genaiError);
      const errorDetails: any = {
           name: genaiError.name,
           message: genaiError.message,
           stack: process.env.NODE_ENV !== 'production' ? genaiError.stack : undefined,
      };
      if (genaiError.cause) {
          console.error("API Error Cause:", genaiError.cause);
          errorDetails.cause = genaiError.cause.message || genaiError.cause;
      }
      if (genaiError.status) {
           console.error("API Error Status:", genaiError.status);
           errorDetails.apiStatus = genaiError.status;
      }
       if (genaiError.error) {
           console.error("API Error Body:", genaiError.error);
            errorDetails.apiError = genaiError.error;
      }
      return NextResponse.json(
        { success: false, error: { message: genaiError.message || "An error occurred while calling the Gemini API.", code: genaiError.code || "GEMINI_API_ERROR", details: errorDetails } },
        { status: genaiError.status || 500 }
      );
    }

  } catch (error: any) {
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
