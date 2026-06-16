import { describe, expect, it, vi } from "vitest";
import { handleQueryRequest, type QueryServiceDependencies } from "@/app/lib/queryService";
import { rejectionMessage } from "@/app/lib/queryTypes";

function createDependencies(
  overrides: Partial<QueryServiceDependencies> = {},
): QueryServiceDependencies {
  return {
    now: () => 1_000,
    sqlGenerator: {
      generateSql: vi.fn(),
    },
    queryExecutor: {
      execute: vi.fn(),
    },
    ...overrides,
  };
}

describe("handleQueryRequest", () => {
  it("generates, validates, and executes supported SQL", async () => {
    const sql = "SELECT sum(total_amount) FROM nyc_taxi.trips_small;";
    const dependencies = createDependencies();
    vi.mocked(dependencies.sqlGenerator.generateSql).mockResolvedValue({
      status: "tool_call",
      sql,
    });
    vi.mocked(dependencies.queryExecutor.execute).mockResolvedValue([
      { "sum(total_amount)": 123.45 },
    ]);

    await expect(handleQueryRequest("sum revenue", dependencies)).resolves.toEqual({
      question: "sum revenue",
      sql,
      rows: [{ "sum(total_amount)": 123.45 }],
      rowCount: 1,
      durationMs: 0,
    });
    expect(dependencies.queryExecutor.execute).toHaveBeenCalledWith(sql);
  });

  it("returns a rejection response when no tool call is emitted", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.sqlGenerator.generateSql).mockResolvedValue({
      status: "rejected",
    });

    await expect(handleQueryRequest("weather in Paris", dependencies)).resolves.toEqual({
      rejected: true,
      message: rejectionMessage,
    });
    expect(dependencies.queryExecutor.execute).not.toHaveBeenCalled();
  });

  it("returns an error when safety validation rejects generated SQL", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.sqlGenerator.generateSql).mockResolvedValue({
      status: "tool_call",
      sql: "DROP TABLE nyc_taxi.trips_small;",
    });

    await expect(handleQueryRequest("drop the table", dependencies)).resolves.toEqual({
      error: "Unable to generate a supported read-only query.",
    });
    expect(dependencies.queryExecutor.execute).not.toHaveBeenCalled();
  });

  it("returns an error when ClickHouse execution fails", async () => {
    const sql = "SELECT count() FROM nyc_taxi.trips_small;";
    const dependencies = createDependencies();
    vi.mocked(dependencies.sqlGenerator.generateSql).mockResolvedValue({
      status: "tool_call",
      sql,
    });
    vi.mocked(dependencies.queryExecutor.execute).mockRejectedValue(new Error("network"));

    await expect(handleQueryRequest("count trips", dependencies)).resolves.toEqual({
      error: "Unable to execute the generated query.",
    });
  });
});
