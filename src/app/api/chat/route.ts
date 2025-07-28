import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/openrouter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt } = body;

    // Validate prompt input
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({
        error: "Prompt is required and must be a string"
      }, { status: 400 });
    }

    // Validate prompt length (reasonable limit)
    if (prompt.length > 10000) {
      return NextResponse.json({
        error: "Prompt is too long (max 10000 characters)"
      }, { status: 400 });
    }

    const result = await callOpenRouter(prompt);
    
    return NextResponse.json({
      result,
      success: true,
      promptLength: prompt.length
    });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({
      error: "Failed to get response",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}