import { describe, expect, it } from "vitest";
import { validateSql } from "@/app/lib/sqlSafety";

const validSql = "SELECT sum(total_amount) FROM nyc_taxi.trips_small;";

describe("validateSql", () => {
  it("accepts supported read-only SQL", () => {
    expect(validateSql(validSql)).toEqual({
      valid: true,
      normalizedSql: validSql,
    });
  });

  it.each([
    ["forbidden DROP", "SELECT sum(total_amount) FROM nyc_taxi.trips_small; DROP TABLE nyc_taxi.trips_small;"],
    ["forbidden DELETE", "DELETE FROM nyc_taxi.trips_small;"],
    ["stacked statement", "SELECT sum(total_amount) FROM nyc_taxi.trips_small; SELECT count() FROM nyc_taxi.trips_small;"],
    ["line comment", "SELECT sum(total_amount) FROM nyc_taxi.trips_small -- nope;"],
    ["block comment", "SELECT sum(total_amount) FROM nyc_taxi.trips_small /* nope */;"],
    ["disallowed table", "SELECT sum(total_amount) FROM other.trips_small;"],
    ["disallowed column", "SELECT sum(secret_amount) FROM nyc_taxi.trips_small;"],
    ["missing semicolon", "SELECT sum(total_amount) FROM nyc_taxi.trips_small"],
    ["extra semicolon", "SELECT sum(total_amount) FROM nyc_taxi.trips_small;;"],
  ])("rejects %s", (_label, sql) => {
    expect(validateSql(sql)).toMatchObject({ valid: false });
  });

  it("rejects mixed case instead of silently normalizing generated SQL", () => {
    expect(validateSql("select sum(total_amount) FROM nyc_taxi.trips_small;")).toMatchObject({
      valid: false,
    });
  });

  it("rejects trailing whitespace after the required semicolon", () => {
    expect(validateSql(`${validSql} `)).toMatchObject({ valid: false });
  });
});
