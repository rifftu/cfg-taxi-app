# ClickHouse SQL Grammar (CFG)

This is the Lark context-free grammar that constrains GPT-5's generated ClickHouse SQL for the `nyc_taxi.trips_small` dataset. It is referenced by [system-design-tech-spec.md](/Users/jerrylai/git/cursor-sandbox-gpt/system-design-tech-spec.md); see that doc for the overall architecture, the supported SQL surface area, and the validation strategy.

This is the intended starting point, not the final grammar. It should be validated against the OpenAI API and simplified if the API rejects it as too complex.

## Grammar

```lark
SP: " "
COMMA: ","
SEMI: ";"
NUMBER: /[0-9]+/
DECIMAL: /[0-9]+\.[0-9]+/

start: select_stmt

select_stmt: simple_select SEMI
           | grouped_select SEMI

simple_select: "SELECT" SP aggregate SP "FROM" SP table where_clause?

// Grouped queries use one rigid template per group column so the projected
// column and the GROUP BY column can never diverge (invalid in ClickHouse).
grouped_select: "SELECT" SP grouped_body order_clause? limit_clause?

grouped_body: "payment_type" COMMA SP aggregate SP "FROM" SP table where_clause? SP "GROUP" SP "BY" SP "payment_type"
            | "pickup_ntaname" COMMA SP aggregate SP "FROM" SP table where_clause? SP "GROUP" SP "BY" SP "pickup_ntaname"
            | "dropoff_ntaname" COMMA SP aggregate SP "FROM" SP table where_clause? SP "GROUP" SP "BY" SP "dropoff_ntaname"
            | "passenger_count" COMMA SP aggregate SP "FROM" SP table where_clause? SP "GROUP" SP "BY" SP "passenger_count"

table: "nyc_taxi.trips_small"

aggregate: "count()"
         | "sum(total_amount)"
         | "avg(total_amount)"
         | "sum(fare_amount)"
         | "avg(tip_amount)"
         | "avg(trip_distance)"

where_clause: SP "WHERE" SP condition
            | SP "WHERE" SP condition SP "AND" SP condition
            | SP "WHERE" SP condition SP "AND" SP condition SP "AND" SP condition

condition: time_condition
         | payment_condition
         | passenger_condition
         | distance_condition
         | amount_condition

time_condition: "pickup_datetime" SP ">=" SP "(SELECT max(pickup_datetime) FROM nyc_taxi.trips_small)" SP "-" SP "INTERVAL" SP NUMBER SP time_unit
time_unit: "HOUR" | "DAY"

payment_condition: "payment_type" SP "=" SP payment_value
payment_value: "'CSH'" | "'CRE'" | "'NOC'" | "'DIS'" | "'UNK'"

passenger_condition: "passenger_count" SP comparator SP NUMBER
distance_condition: "trip_distance" SP comparator SP number_value
amount_condition: "total_amount" SP comparator SP number_value
number_value: NUMBER | DECIMAL
comparator: ">" | ">=" | "<" | "<=" | "="

// ORDER BY is restricted to the aggregate (the leaderboard case) so the grammar
// cannot order by an ungrouped, unaggregated column.
order_clause: SP "ORDER" SP "BY" SP aggregate SP order_dir
order_dir: "DESC" | "ASC"

limit_clause: SP "LIMIT" SP NUMBER
```

## Design notes

Two correctness decisions are baked into this grammar: grouped queries are expanded as one rigid template per group column so the projection and `GROUP BY` columns always match, and `ORDER BY` is limited to the aggregate so the result can never sort by an ungrouped column. `NUMBER` and `DECIMAL` are disjoint (`DECIMAL` requires a dot) to avoid greedy-lexer ambiguity. If the API still reports the grammar as too complex, reduce the aggregate/condition lists further.
