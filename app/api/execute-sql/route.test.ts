import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/execute-sql/route";
import { executeSqlQuery } from "@/app/lib/queryService";

vi.mock("@/app/lib/queryService", () => ({
  executeSqlQuery: vi.fn(),
}));

function createRequest(body: string) {
  return new NextRequest("http://localhost/api/execute-sql", {
    method: "POST",
    body,
  });
}

describe("POST /api/execute-sql", () => {
  beforeEach(() => {
    vi.mocked(executeSqlQuery).mockReset();
  });

  it("executes SQL proposals", async () => {
    vi.mocked(executeSqlQuery).mockResolvedValue({
      question: "count trips",
      sql: "SELECT count() FROM nyc_taxi.trips_small;",
      rows: [{ "count()": 12 }],
      rowCount: 1,
      durationMs: 5,
    });

    const response = await POST(
      createRequest(
        JSON.stringify({
          question: "count trips",
          sql: "SELECT count() FROM nyc_taxi.trips_small;",
        }),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      rowCount: 1,
      sql: "SELECT count() FROM nyc_taxi.trips_small;",
    });
    expect(executeSqlQuery).toHaveBeenCalledWith(
      "count trips",
      "SELECT count() FROM nyc_taxi.trips_small;",
    );
  });

  it("returns 400 for execution errors", async () => {
    vi.mocked(executeSqlQuery).mockResolvedValue({
      error: "Unable to execute the generated query.",
    });

    const response = await POST(
      createRequest(JSON.stringify({ sql: "SELECT count() FROM nyc_taxi.trips_small;" })),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to execute the generated query.",
    });
  });

  it("returns 400 when sql is missing", async () => {
    const response = await POST(createRequest(JSON.stringify({ question: "count" })));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Request body must include a string sql value.",
    });
  });
});
