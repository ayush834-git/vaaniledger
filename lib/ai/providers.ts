import { z } from "zod";

export type AIProvider = "groq" | "gemini";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GROQ_MODEL = "llama3-70b-8192";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

class ProviderRequestError extends Error {
  code: string;

  constructor(message: string, code = "AI_PROVIDER_ERROR") {
    super(message);
    this.code = code;
    this.name = "ProviderRequestError";
  }
}

class JsonExtractionError extends Error {
  code: string;

  constructor(message: string, code = "INVALID_AI_RESPONSE") {
    super(message);
    this.code = code;
    this.name = "JsonExtractionError";
  }
}

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

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const getApiKey = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new ProviderRequestError(`${name} is missing.`, "AI_CONFIG_ERROR");
  }
  return value;
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

const extractJsonObject = (raw: string): unknown => {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new JsonExtractionError("Model response did not contain a JSON object.");
  }

  const jsonChunk = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonChunk);
  } catch {
    throw new JsonExtractionError("Unable to parse JSON from model response.");
  }
};

async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = getApiKey(process.env.GEMINI_API_KEY, "GEMINI_API_KEY");
  const retryDelaysMs = [2000, 4000, 8000];

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
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
    } catch (error) {
      throw new ProviderRequestError(
        error instanceof Error ? error.message : "Gemini request failed.",
        "AI_REQUEST_FAILED",
      );
    }

    if (response.ok) {
      const responseJson = await response.json();
      const parsed = geminiResponseSchema.safeParse(responseJson);
      const text = parsed.success
        ? parsed.data.candidates?.[0]?.content.parts.map((part) => part.text ?? "").join("\n").trim()
        : "";

      if (!text) {
        throw new JsonExtractionError("Gemini returned an empty response.");
      }

      return text;
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

    if (response.status === 429 && attempt < retryDelaysMs.length) {
      await sleep(retryDelaysMs[attempt]);
      continue;
    }

    throw new ProviderRequestError(parsedError.message, "AI_REQUEST_FAILED");
  }

  throw new ProviderRequestError("Gemini request failed.", "AI_REQUEST_FAILED");
}

async function generateWithGroq(prompt: string): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY");
  }

  let response: Response;
  try {
    response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
    });
  } catch (error) {
    throw new ProviderRequestError(
      error instanceof Error ? error.message : "Groq request failed.",
      "AI_REQUEST_FAILED",
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq error:", errorText);
    throw new ProviderRequestError("AI service temporarily unavailable.", "AI_REQUEST_FAILED");
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };

  const text = data?.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new JsonExtractionError("Groq returned an empty response.");
  }

  return text;
}

const resolveConfiguredProvider = (): AIProvider => {
  const configured = (process.env.AI_PROVIDER || "groq").toLowerCase();
  return configured === "gemini" ? "gemini" : "groq";
};

export async function generateJsonFromAI(prompt: string): Promise<unknown> {
  const provider = resolveConfiguredProvider();
  console.log("AI Provider:", process.env.AI_PROVIDER);

  try {
    if (provider === "groq") {
      const text = await generateWithGroq(prompt);
      return extractJsonObject(text);
    }

    const text = await generateWithGemini(prompt);
    return extractJsonObject(text);
  } catch (error) {
    if (error instanceof JsonExtractionError) {
      throw error;
    }

    console.error("AI provider routing failed", {
      provider,
      error,
    });

    throw new ProviderRequestError("AI service temporarily unavailable.", "AI_SERVICE_UNAVAILABLE");
  }
}
