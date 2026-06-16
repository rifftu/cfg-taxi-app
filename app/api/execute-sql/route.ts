import { NextRequest, NextResponse } from "next/server";
import { executeSqlQuery } from "@/app/lib/queryService";

/** Executes a previously generated SQL proposal after server-side validation. */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      question?: unknown;
      sql?: unknown;
    };

    if (typeof body.sql !== "string") {
      return NextResponse.json(
        { error: "Request body must include a string sql value." },
        { status: 400 },
      );
    }

    const question = typeof body.question === "string" ? body.question : "";
    const response = await executeSqlQuery(question, body.sql);
    const status = "error" in response ? 400 : 200;

    return NextResponse.json(response, { status });
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
}
