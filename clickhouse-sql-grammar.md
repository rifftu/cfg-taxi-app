# ClickHouse SQL Grammar

This document explains the grammar we currently use for the CFG-backed SQL path.
The source of truth is `app/lib/grammar.ts`; this document describes the contract and the design tradeoffs.

## What The Grammar Is For

The grammar constrains GPT's `clickhouse_sql` custom tool output to a small, read-only subset of ClickHouse SQL for the taxi demo. If the model calls the CFG tool, it cannot emit arbitrary text or arbitrary SQL; it must emit one string accepted by this grammar.

That gives us deterministic guarantees that prompting alone cannot give:

- No destructive statements.
- No stacked statements.
- No `SELECT *`.
- No arbitrary table names.
- No arbitrary functions or columns.
- No grouped query where the projected column and `GROUP BY` column disagree.

The grammar does not make the model smarter. It makes unsupported output shapes unrepresentable on the trusted execution path.

## Runtime Table

The checked-in offline corpus still uses `nyc_taxi.trips_small` as its canonical fixture table. At runtime, `createClickHouseSqlGrammar(tableIdentifier)` renders the same grammar shape with the configured table identifier. In the current live environment that table is:

```text
default.nyc_taxi
```

This lets the deterministic corpus remain stable while live OpenAI generation and SQL validation target the actual ClickHouse sample table.

## Supported Query Families

The grammar intentionally supports analytics summaries, not general text-to-SQL. There are two top-level query shapes:

```sql
SELECT <aggregate> FROM <table> [WHERE ...];
```

```sql
SELECT <group_column>, <aggregate>
FROM <table>
[WHERE ...]
GROUP BY <same_group_column>
[ORDER BY <same_aggregate> ASC|DESC]
[LIMIT <number>];
```

The allowed aggregate functions are:

- `count()`
- `sum(total_amount)`
- `avg(total_amount)`
- `sum(fare_amount)`
- `avg(tip_amount)`
- `avg(trip_distance)`

The allowed grouped dimensions are:

- `payment_type`
- `pickup_ntaname`
- `dropoff_ntaname`
- `passenger_count`

The allowed filters are:

- Dataset-relative pickup time windows: `pickup_datetime >= (SELECT max(pickup_datetime) FROM <table>) - INTERVAL N HOUR|DAY`
- Payment type equality for `CSH`, `CRE`, `NOC`, `DIS`, or `UNK`.
- `passenger_count` comparisons.
- `trip_distance` comparisons.
- `total_amount` comparisons.

## Intentional Gaps

This is not a comprehensive grammar for the taxi dataset. It intentionally rejects reasonable questions that would require unsupported SQL, such as:

- Earliest/latest timestamps with `min(pickup_datetime)` or `max(pickup_datetime)`.
- Percentiles, medians, standard deviation, or other statistical functions.
- Time bucketing by hour/day/month.
- Raw row inspection.
- Multi-column grouping.
- Route analysis from pickup to dropoff pairs.
- Neighborhood-name equality filters.
- Aliases such as `AS total_revenue`.
- Joins, subqueries other than the dataset-relative time anchor, CTEs, or unions.

Those gaps are acceptable for the current demo because the goal is to prove the CFG-constrained path on a known set of demo questions, not to maximize natural language query coverage.

## Important Design Choices

Grouped queries are written as rigid templates, one per group column. This is deliberate. It prevents invalid ClickHouse SQL like:

```sql
SELECT payment_type, sum(total_amount)
FROM default.nyc_taxi
GROUP BY pickup_ntaname;
```

`ORDER BY` is limited to the aggregate expression. That avoids sorting grouped results by a column that is neither grouped nor aggregated.

Aliases are not allowed. They would improve readability, but they also add more surface area to parse and validate. The UI can display raw ClickHouse column names for this demo.

Only one, two, or three `WHERE` conditions are allowed. This keeps the grammar small and avoids recursive condition expressions. If we need more flexibility, we should add it intentionally with tests.

Whitespace is strict. The grammar emits a normalized SQL style with exact spaces. That makes validation and comparison easier, but means hand-written SQL with different spacing may fail the deterministic parser even if ClickHouse would accept it.

## Safety Model

The grammar is the first safety layer, not the only safety layer.

The execution path is:

1. GPT emits a `clickhouse_sql` tool call constrained by the grammar.
2. The server extracts the SQL from the tool call.
3. `validateSql()` checks statement shape, comments, forbidden keywords, table references, and grammar membership again.
4. ClickHouse executes only SQL that passed validation.

This means a grammar-valid query still has to pass server-side validation before execution. The non-CFG control output is for display only and is not executable through the UI.

## Validation

There are three separate validation layers:

- `npm run test:grammar` compiles the grammar with LLGuidance and runs the deterministic accept/reject corpus.
- `npm run test:clickhouse-corpus` executes positive corpus cases against ClickHouse to catch parseable-but-invalid SQL.
- `npm run eval` asks the live model to route prompts into the CFG tool or reject out-of-scope prompts, then checks SQL shape and execution.

The corpus includes positive examples for single aggregate, grouped aggregate, time filters, and numeric filters. It includes negative examples for `SELECT *`, destructive statements, projection/`GROUP BY` mismatch, stacked statements, comment injection, and aliases.

## When To Extend The Grammar

Extend the grammar when we have a concrete demo question or product behavior that needs a new SQL family. Good candidates are:

- `min(pickup_datetime)` and `max(pickup_datetime)` for dataset range questions.
- `min()` / `max()` for numeric fields.
- Time bucketing with a fixed set of safe ClickHouse functions.
- Route leaderboards grouped by pickup and dropoff neighborhood.
- Equality filters on pickup/dropoff neighborhood names, if we can constrain the value set safely.

For each extension, add:

- Positive corpus cases.
- Negative corpus cases that prove the new surface does not allow nearby bad SQL.
- Safety-validator tests if the validator needs new allowed functions/columns.
- At least one eval case if the behavior is user-facing.

If the grammar starts becoming large or awkward, consider switching the model output from raw SQL to a constrained query-intent object and compiling that object to SQL server-side.