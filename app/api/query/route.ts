import { NextRequest, NextResponse } from "next/server";
import { handleQueryRequest } from "@/app/lib/queryService";

/** Handles taxi analytics requests through the mockable query service. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { question?: unknown };

    if (typeof body.question !== "string") {
      return NextResponse.json(
        { error: "Request body must include a string question." },
        { status: 400 },
      );
    }

    const response = await handleQueryRequest(body.question);
    const status = "error" in response ? 400 : 200;

    return NextResponse.json(response, { status });
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
}
