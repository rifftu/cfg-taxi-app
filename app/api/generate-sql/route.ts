import { NextRequest, NextResponse } from "next/server";
import { generateSqlForQuestion } from "@/app/lib/queryService";

/** Generates a validated SQL proposal without executing it. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { question?: unknown };

    if (typeof body.question !== "string") {
      return NextResponse.json(
        { error: "Request body must include a string question." },
        { status: 400 },
      );
    }

    const response = await generateSqlForQuestion(body.question);
    const status =
      "error" in response.cfg && "error" in response.control ? 400 : 200;

    return NextResponse.json(response, { status });
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
}
