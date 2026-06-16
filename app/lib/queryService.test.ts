import { describe, expect, it, vi } from "vitest";
import {
  executeSqlQuery,
  generateCfgSqlForQuestion,
  generateSqlForQuestion,
  handleQueryRequest,
  type QueryServiceDependencies,
} from "@/app/lib/queryService";
import { rejectionMessage } from "@/app/lib/queryTypes";

function createDependencies(
  overrides: Partial<QueryServiceDependencies> = {},
): QueryServiceDependencies {
  return {
    now: () => 1_000,
    sqlGenerator: {
      generateSql: vi.fn(),
    },
    controlSqlGenerator: {
      generateControlSql: vi.fn(),
    },
    queryExecutor: {
      execute: vi.fn(),
    },
    ...overrides,
  };
}

describe("handleQueryRequest", () => {
  it("generates supported SQL without executing it", async () => {
    const sql = "SELECT sum(total_amount) FROM nyc_taxi.trips_small;";
    const dependencies = createDependencies();
    vi.mocked(dependencies.sqlGenerator.generateSql).mockResolvedValue({
      status: "tool_call",
      sql,
    });

    await expect(generateCfgSqlForQuestion("sum revenue", dependencies)).resolves.toEqual({
      question: "sum revenue",
      sql,
    });
    expect(dependencies.queryExecutor.execute).not.toHaveBeenCalled();
  });

  it("generates CFG and control SQL in one comparison response", async () => {
    const sql = "SELECT sum(total_amount) FROM nyc_taxi.trips_small;";
    const dependencies = createDependencies();
    vi.mocked(dependencies.sqlGenerator.generateSql).mockResolvedValue({
      status: "tool_call",
      sql,
    });
    vi.mocked(dependencies.controlSqlGenerator.generateControlSql).mockResolvedValue({
      sql: "SELECT min(pickup_datetime), max(pickup_datetime) FROM nyc_taxi.trips_small;",
      notes: "Shows dataset timestamp range.",
    });

    await expect(generateSqlForQuestion("sum revenue", dependencies)).resolves.toEqual({
      cfg: {
        question: "sum revenue",
        sql,
      },
      control: {
        sql: "SELECT min(pickup_datetime), max(pickup_datetime) FROM nyc_taxi.trips_small;",
        notes: "Shows dataset timestamp range.",
      },
    });
    expect(dependencies.queryExecutor.execute).not.toHaveBeenCalled();
  });

  it("returns the control SQL even when CFG generation rejects the question", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.sqlGenerator.generateSql).mockResolvedValue({
      status: "rejected",
    });
    vi.mocked(dependencies.controlSqlGenerator.generateControlSql).mockResolvedValue({
      sql: "SELECT min(pickup_datetime), max(pickup_datetime) FROM nyc_taxi.trips_small;",
    });

    await expect(
      generateSqlForQuestion("what is the earliest and latest timestamp", dependencies),
    ).resolves.toEqual({
      cfg: {
        rejected: true,
        message: rejectionMessage,
      },
      control: {
        sql: "SELECT min(pickup_datetime), max(pickup_datetime) FROM nyc_taxi.trips_small;",
      },
    });
  });

  it("executes already generated SQL after validation", async () => {
    const sql = "SELECT count() FROM nyc_taxi.trips_small;";
    const dependencies = createDependencies();
    vi.mocked(dependencies.queryExecutor.execute).mockResolvedValue([{ "count()": 12 }]);

    await expect(executeSqlQuery("count trips", sql, dependencies)).resolves.toEqual({
      question: "count trips",
      sql,
      rows: [{ "count()": 12 }],
      rowCount: 1,
      durationMs: 0,
    });
    expect(dependencies.queryExecutor.execute).toHaveBeenCalledWith(sql);
  });

  it("does not execute unsafe SQL proposals", async () => {
    const dependencies = createDependencies();

    await expect(
      executeSqlQuery("bad", "DROP TABLE nyc_taxi.trips_small;", dependencies),
    ).resolves.toEqual({
      error: "Unable to generate a supported read-only query.",
    });
    expect(dependencies.queryExecutor.execute).not.toHaveBeenCalled();
  });

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
