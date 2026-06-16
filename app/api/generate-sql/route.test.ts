import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/generate-sql/route";
import { generateSqlForQuestion } from "@/app/lib/queryService";

vi.mock("@/app/lib/queryService", () => ({
  generateSqlForQuestion: vi.fn(),
}));

function createRequest(body: string) {
  return new NextRequest("http://localhost/api/generate-sql", {
    method: "POST",
    body,
  });
}

describe("POST /api/generate-sql", () => {
  beforeEach(() => {
    vi.mocked(generateSqlForQuestion).mockReset();
  });

  it("returns SQL proposals", async () => {
    vi.mocked(generateSqlForQuestion).mockResolvedValue({
      cfg: {
        question: "count trips",
        sql: "SELECT count() FROM nyc_taxi.trips_small;",
      },
      control: {
        sql: "SELECT count() FROM nyc_taxi.trips_small;",
        notes: "Counts trips.",
      },
    });

    const response = await POST(createRequest(JSON.stringify({ question: "count trips" })));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      cfg: {
        question: "count trips",
        sql: "SELECT count() FROM nyc_taxi.trips_small;",
      },
      control: {
        sql: "SELECT count() FROM nyc_taxi.trips_small;",
        notes: "Counts trips.",
      },
    });
    expect(generateSqlForQuestion).toHaveBeenCalledWith("count trips");
  });

  it("returns rejection responses without treating them as errors", async () => {
    vi.mocked(generateSqlForQuestion).mockResolvedValue({
      cfg: {
        rejected: true,
        message: "No supported query.",
      },
      control: {
        sql: "SELECT min(pickup_datetime), max(pickup_datetime) FROM nyc_taxi.trips_small;",
      },
    });

    const response = await POST(createRequest(JSON.stringify({ question: "weather" })));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      cfg: {
        rejected: true,
        message: "No supported query.",
      },
      control: {
        sql: "SELECT min(pickup_datetime), max(pickup_datetime) FROM nyc_taxi.trips_small;",
      },
    });
  });

  it("returns 400 when both generation paths fail", async () => {
    vi.mocked(generateSqlForQuestion).mockResolvedValue({
      cfg: {
        error: "Unable to generate a supported read-only query.",
      },
      control: {
        error: "Unable to generate comparison SQL.",
      },
    });

    const response = await POST(createRequest(JSON.stringify({ question: "bad" })));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      cfg: {
        error: "Unable to generate a supported read-only query.",
      },
      control: {
        error: "Unable to generate comparison SQL.",
      },
    });
  });

  it("returns 400 when question is missing", async () => {
    const response = await POST(createRequest(JSON.stringify({ question: 123 })));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Request body must include a string question.",
    });
  });
});
