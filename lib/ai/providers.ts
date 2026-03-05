import { z } from "zod";

export type AIProvider = "gemini" | "groq";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GROQ_MODEL = "llama3-70b-8192";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(
            z.object({
              text: z.string().optional(),
            }),
          ),
        }),
      }),
    )
    .optional(),
});

const groqResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullable().optional(),
      }),
    }),
  ),
});

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const createCodedError = (message: string, code: string): Error & { code: string } => {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
};

const getApiKey = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`${name} is missing.`);
  }
  return value;
};

const getGeminiText = (payload: unknown): string => {
  const parsed = geminiResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Unexpected Gemini response shape.");
  }

  const text = parsed.data.candidates?.[0]?.content.parts.map((part) => part.text ?? "").join("\n").trim();
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
};

const getGroqText = (payload: unknown): string => {
  const parsed = groqResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Unexpected Groq response shape.");
  }

  const content = parsed.data.choices[0]?.message.content?.trim();
  if (!content) {
    throw new Error("Groq returned an empty response.");
  }

  return content;
};

const parseErrorBody = async (response: Response): Promise<{ raw: string; message: string }> => {
  const raw = await response.text();

  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    const message = parsed.error?.message?.trim();
    return {
      raw,
      message: message && message.length > 0 ? message : raw.trim() || "Unknown API error",
    };
  } catch {
    return {
      raw,
      message: raw.trim() || "Unknown API error",
    };
  }
};

export const generateWithGemini = async (prompt: string): Promise<string> => {
  const apiKey = getApiKey(process.env.GEMINI_API_KEY, "GEMINI_API_KEY");
  const retryDelaysMs = [2000, 4000, 8000];

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (response.ok) {
      const responseJson = await response.json();
      return getGeminiText(responseJson);
    }

    const parsedError = await parseErrorBody(response);
    console.error("Gemini API request failed", {
      status: response.status,
      statusText: response.statusText,
      model: GEMINI_MODEL,
      attempt: attempt + 1,
      errorMessage: parsedError.message,
      errorBody: parsedError.raw,
    });

    if (response.status === 429) {
      if (attempt < retryDelaysMs.length) {
        const waitMs = retryDelaysMs[attempt];
        console.warn("Gemini rate limited, retrying", {
          retryInMs: waitMs,
          attempt: attempt + 1,
        });
        await sleep(waitMs);
        continue;
      }

      throw createCodedError("AI is busy right now. Please try again in a few seconds.", "AI_RATE_LIMITED");
    }

    throw createCodedError("AI request failed. Please try again.", "AI_REQUEST_FAILED");
  }

  throw createCodedError("AI is busy right now. Please try again in a few seconds.", "AI_RATE_LIMITED");
};

export const generateWithGroq = async (prompt: string): Promise<string> => {
  const apiKey = getApiKey(process.env.GROQ_API_KEY, "GROQ_API_KEY");

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const parsedError = await parseErrorBody(response);
    console.error("Groq API request failed", {
      status: response.status,
      statusText: response.statusText,
      model: GROQ_MODEL,
      errorMessage: parsedError.message,
      errorBody: parsedError.raw,
    });

    throw createCodedError("AI request failed. Please try again.", "AI_REQUEST_FAILED");
  }

  const responseJson = await response.json();
  return getGroqText(responseJson);
};
