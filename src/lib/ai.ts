const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || "minimax/MiniMax-Text-01";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export interface AICallOptions {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
}

export interface AICallResponse {
  response: string;
  tokens_used?: number;
  error?: string;
}

export async function callAI(options: AICallOptions): Promise<AICallResponse> {
  const { systemPrompt, userPrompt, model = MINIMAX_MODEL } = options;

  if (!OPENROUTER_API_KEY) {
    return {
      response: "",
      error: "OpenRouter API key not configured",
    };
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "e2go.app",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenRouter API error:", errorData);
      return {
        response: "",
        error: errorData.error?.message || `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const tokens_used = data.usage?.total_tokens;
    const content = data.choices?.[0]?.message?.content || "";

    // Tokens might be logged here if needed for debugging in non-production
    return {
      response: content,
      tokens_used,
    };
  } catch (error) {
    console.error("AI call failed:", error);
    return {
      response: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function callAIStreaming(
  options: AICallOptions,
  onChunk: (chunk: string) => void
): Promise<AICallResponse> {
  const { systemPrompt, userPrompt, model = MINIMAX_MODEL } = options;

  if (!OPENROUTER_API_KEY) {
    return {
      response: "",
      error: "OpenRouter API key not configured",
    };
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "e2go.app",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        response: "",
        error: errorData.error?.message || `API error: ${response.status}`,
      };
    }

    if (!response.body) {
      return {
        response: "",
        error: "No response body",
      };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";
    let tokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              fullResponse += content;
              onChunk(content);
              tokens++;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    // Tokens might be tracked if needed
    return {
      response: fullResponse,
      tokens_used: tokens,
    };
  } catch (error) {
    console.error("AI streaming call failed:", error);
    return {
      response: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}