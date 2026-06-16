import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/query/route";
import { handleQueryRequest } from "@/app/lib/queryService";

vi.mock("@/app/lib/queryService", () => ({
  handleQueryRequest: vi.fn(),
}));

function createRequest(body: string) {
  return new NextRequest("http://localhost/api/query", {
    method: "POST",
    body,
  });
}

describe("POST /api/query", () => {
  beforeEach(() => {
    vi.mocked(handleQueryRequest).mockReset();
  });

  it("returns successful query responses", async () => {
    vi.mocked(handleQueryRequest).mockResolvedValue({
      question: "count trips",
      sql: "SELECT count() FROM nyc_taxi.trips_small;",
      rows: [{ "count()": 12 }],
      rowCount: 1,
      durationMs: 5,
    });

    const response = await POST(createRequest(JSON.stringify({ question: "count trips" })));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      sql: "SELECT count() FROM nyc_taxi.trips_small;",
    });
    expect(handleQueryRequest).toHaveBeenCalledWith("count trips");
  });

  it("returns rejection responses without treating them as errors", async () => {
    vi.mocked(handleQueryRequest).mockResolvedValue({
      rejected: true,
      message: "No supported query.",
    });

    const response = await POST(createRequest(JSON.stringify({ question: "weather" })));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      rejected: true,
      message: "No supported query.",
    });
  });

  it("returns 400 for handler error responses", async () => {
    vi.mocked(handleQueryRequest).mockResolvedValue({
      error: "Unable to generate a supported read-only query.",
    });

    const response = await POST(createRequest(JSON.stringify({ question: "bad" })));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to generate a supported read-only query.",
    });
  });

  it("returns 400 when question is missing", async () => {
    const response = await POST(createRequest(JSON.stringify({ question: 123 })));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Request body must include a string question.",
    });
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await POST(createRequest("{"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Request body must be valid JSON.",
    });
  });
});
