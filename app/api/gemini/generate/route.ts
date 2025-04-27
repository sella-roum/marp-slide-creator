import { type NextRequest, NextResponse } from "next/server"
import {
  GoogleGenAI,
  type GenerateContentResponse,
  type Content,
  type GenerateContentConfig,
} from "@google/genai"
import type { GeminiRequestType, GeminiResponseType } from "@/lib/types"
import { extractMarkdownCode } from "@/lib/utils"

// Initialize Google Generative AI with API key
const API_KEY = process.env.GEMINI_API_KEY

export async function POST(request: NextRequest) {
  try {
    // Check if API key is available
    if (!API_KEY) {
      console.error("Gemini API key is not configured")
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "API key is not configured",
            code: "API_KEY_MISSING",
          },
        } as GeminiResponseType,
        { status: 500 },
      )
    }

    // Parse request body
    const requestData: GeminiRequestType = await request.json()
    const { prompt, context, taskType, fileData } = requestData

    // Validate request
    if (!prompt && !fileData) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Prompt or file data is required",
            code: "MISSING_PROMPT",
          },
        } as GeminiResponseType,
        { status: 400 },
      )
    }

    // Initialize the Gemini API client
    const ai = new GoogleGenAI({ apiKey: API_KEY })

    // --- システムプロンプトの構築 ---
    const systemInstructionContent: Content = {
      role: "system",
      parts: [
        {
          text: `You are an AI assistant specialized in helping users create Marp presentations.
Marp is a Markdown-based presentation tool.

When responding:
1. ALWAYS respond in JSON format with the following structure:
   {
     "text": "Your explanation or response text here",
     "markdown": "Complete Marp-compatible markdown code here"
   }
2. Include appropriate Marp directives like '---\\nmarp: true\\ntheme: default\\n---' at the beginning of presentations.
3. For slide separators, use '---' on a line by itself.
4. If asked for a theme, provide CSS that can be used with Marp's theme directive.
5. If asked to create a Mermaid diagram, include the complete diagram code in the markdown.
6. Respond in Japanese unless specifically asked to use another language.
7. IMPORTANT: Always include the COMPLETE markdown in the "markdown" field, never truncate it.

Current user's Markdown content:
\`\`\`
${context?.currentMarkdown || "No content yet"}
\`\`\`
`,
        },
      ],
    }

    // タスク固有の指示をシステムプロンプトに追加
    let taskInstruction = ""
    if (taskType) {
      switch (taskType) {
        case "GenerateOutline":
          taskInstruction = `\nFocus on creating a well-structured presentation outline with appropriate sections and slide transitions.`
          break
        case "GenerateTheme":
          taskInstruction = `\nFocus on creating a custom CSS theme for Marp. Include detailed styling for backgrounds, text, headers, and other elements.`
          break
        case "GenerateMermaid":
          taskInstruction = `\nCreate a Mermaid diagram that can be embedded in a Marp presentation. Use the syntax: \`\`\`mermaid\n(diagram code)\n\`\`\``
          break
      }
      if (systemInstructionContent.parts && systemInstructionContent.parts[0].text) {
        systemInstructionContent.parts[0].text += taskInstruction
      }
    }

    // --- ユーザープロンプトの準備 ---
    const userContent: Content = {
      role: "user",
      parts: [{ text: prompt }],
    }

    // Add file data if available
    if (fileData && fileData.content) {
      if (fileData.type === "image") {
        // For images, add as inline data
        userContent.parts.push({
          inlineData: {
            mimeType: "image/jpeg", // Assuming JPEG, adjust if needed
            data: fileData.content.split(",")[1], // Remove the data URL prefix
          },
        })

        // Add instruction for image
        userContent.parts.push({
          text: "Please analyze this image and use it to create or enhance the Marp presentation.",
        })
      } else {
        // For text or PDF, add as text
        userContent.parts.push({
          text: `File content:\n${fileData.content}`,
        })
      }
    }

    try {
      const generationConfig: GenerateContentConfig = {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        responseMimeType: "application/json",
      }

      // Select appropriate model based on content
      const modelName = fileData?.type === "image" ? "gemini-1.5-pro-latest" : "gemini-2.0-flash-001"

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelName,
        contents: [userContent],
        config: {
          ...generationConfig,
          systemInstruction: systemInstructionContent,
        },
      })

      const resultText = response.text
      console.log("Raw response text:", resultText)

      // レスポンスが空またはブロックされた場合のチェック
      if (!resultText) {
        console.error("モデルからの応答が空またはブロックされました。")
        if (response.promptFeedback?.blockReason) {
          const blockReason = response.promptFeedback.blockReason
          console.error(`リクエストがブロックされました: ${blockReason}`)
          return NextResponse.json(
            {
              success: false,
              error: {
                message: `Request blocked due to: ${blockReason}`,
                code: "BLOCKED_CONTENT",
              },
            } as GeminiResponseType,
            { status: 400 },
          )
        }
        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
          console.error("モデルから有効なコンテンツが得られませんでした。")
          return NextResponse.json(
            {
              success: false,
              error: {
                message: "AI model did not return valid content.",
                code: "NO_VALID_CONTENT",
              },
            } as GeminiResponseType,
            { status: 500 },
          )
        }
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "AI model returned an empty response.",
              code: "EMPTY_RESPONSE",
            },
          } as GeminiResponseType,
          { status: 500 },
        )
      }

      // JSONレスポンスのパース
      try {
        let jsonResponse
        try {
          jsonResponse = JSON.parse(resultText)
        } catch (e) {
          // JSONパースに失敗した場合、テキストから抽出を試みる
          const jsonMatch = resultText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            jsonResponse = JSON.parse(jsonMatch[0])
          } else {
            throw new Error("Failed to parse JSON response")
          }
        }

        // 必要なフィールドがあるか確認
        if (!jsonResponse.text || !jsonResponse.markdown) {
          throw new Error("Invalid JSON structure in response")
        }

        return NextResponse.json({
          success: true,
          result: {
            text: jsonResponse.text,
            markdownCode: jsonResponse.markdown,
          },
        } as GeminiResponseType)
      } catch (jsonError) {
        console.error("JSON parsing error:", jsonError)

        // JSONパースに失敗した場合は従来の方法でマークダウンを抽出
        const markdownCode = extractMarkdownCode(resultText)

        return NextResponse.json({
          success: true,
          result: {
            text: resultText,
            markdownCode: markdownCode || resultText,
          },
        } as GeminiResponseType)
      }
    } catch (genaiError) {
      console.error("Gemini API error:", genaiError)
      if (genaiError instanceof Error) {
        console.error("API Error Details:", JSON.stringify(genaiError, null, 2))
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            message: genaiError instanceof Error ? genaiError.message : "Gemini API error",
            code: "GEMINI_API_ERROR",
            details: genaiError instanceof Error ? JSON.stringify(genaiError) : undefined,
          },
        } as GeminiResponseType,
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Server error:", error)

    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Unknown server error",
          code: "SERVER_ERROR",
        },
      } as GeminiResponseType,
      { status: 500 },
    )
  }
}
