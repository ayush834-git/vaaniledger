import { NextResponse } from "next/server";

import { normalizeTranscript } from "@/lib/ai/gemini";

export async function POST(request: Request) {
  let rawInput = "";
  try {
    const body = await request.json();
    if (typeof body?.rawInput === "string") {
      rawInput = body.rawInput.trim();
    }

    if (!rawInput) {
      return NextResponse.json({ normalized: rawInput });
    }

    const normalized = await normalizeTranscript(rawInput);
    return NextResponse.json({ normalized });
  } catch {
    return NextResponse.json({ normalized: rawInput });
  }
}
