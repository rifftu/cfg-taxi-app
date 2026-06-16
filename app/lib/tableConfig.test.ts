import { describe, expect, it } from "vitest";
import {
  defaultSqlTableIdentifier,
  getSqlTableIdentifier,
  withSqlTableIdentifier,
} from "@/app/lib/tableConfig";

describe("table configuration", () => {
  it("defaults to the spec table", () => {
    expect(getSqlTableIdentifier({})).toBe(defaultSqlTableIdentifier);
  });

  it("uses database and table env values when configured", () => {
    expect(
      getSqlTableIdentifier({
        CLICKHOUSE_DATABASE: "default",
        CLICKHOUSE_TABLE: "nyc_taxi",
      }),
    ).toBe("default.nyc_taxi");
  });

  it("rewrites fixture SQL to the configured table", () => {
    expect(
      withSqlTableIdentifier(
        "SELECT count() FROM nyc_taxi.trips_small;",
        "default.nyc_taxi",
      ),
    ).toBe("SELECT count() FROM default.nyc_taxi;");
  });
});
