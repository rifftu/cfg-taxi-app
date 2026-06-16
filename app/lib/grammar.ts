export const clickhouseSqlGrammar = String.raw`
SP: " "
COMMA: ","
SEMI: ";"
NUMBER: /[0-9]+/
DECIMAL: /[0-9]+\.[0-9]+/

start: select_stmt

select_stmt: simple_select SEMI
           | grouped_select SEMI

simple_select: "SELECT" SP aggregate SP "FROM" SP table where_clause?

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

order_clause: SP "ORDER" SP "BY" SP aggregate SP order_dir
order_dir: "DESC" | "ASC"

limit_clause: SP "LIMIT" SP NUMBER
`;

const aggregatePattern =
  "(count\\(\\)|sum\\(total_amount\\)|avg\\(total_amount\\)|sum\\(fare_amount\\)|avg\\(tip_amount\\)|avg\\(trip_distance\\))";
const tablePattern = "nyc_taxi\\.trips_small";
const numberPattern = "[0-9]+";
const decimalPattern = "[0-9]+\\.[0-9]+";
const numberValuePattern = `(?:${decimalPattern}|${numberPattern})`;
const comparatorPattern = "(?:>|>=|<|<=|=)";
const timeConditionPattern = `pickup_datetime >= \\(SELECT max\\(pickup_datetime\\) FROM ${tablePattern}\\) - INTERVAL ${numberPattern} (?:HOUR|DAY)`;
const paymentConditionPattern = "payment_type = '(?:CSH|CRE|NOC|DIS|UNK)'";
const passengerConditionPattern = `passenger_count ${comparatorPattern} ${numberPattern}`;
const distanceConditionPattern = `trip_distance ${comparatorPattern} ${numberValuePattern}`;
const amountConditionPattern = `total_amount ${comparatorPattern} ${numberValuePattern}`;
const conditionPattern = `(?:${timeConditionPattern}|${paymentConditionPattern}|${passengerConditionPattern}|${distanceConditionPattern}|${amountConditionPattern})`;
const wherePattern = `(?: WHERE ${conditionPattern}(?: AND ${conditionPattern}){0,2})?`;
const groupColumnPattern =
  "(payment_type|pickup_ntaname|dropoff_ntaname|passenger_count)";
const simpleSelectPattern = new RegExp(
  `^SELECT ${aggregatePattern} FROM ${tablePattern}${wherePattern};$`,
);
const groupedSelectPattern = new RegExp(
  `^SELECT ${groupColumnPattern}, ${aggregatePattern} FROM ${tablePattern}${wherePattern} GROUP BY \\1(?: ORDER BY \\2 (?:DESC|ASC))?(?: LIMIT ${numberPattern})?;$`,
);

/** Returns whether SQL belongs to the supported grammar surface. */
export function isSqlAcceptedByGrammar(sql: string): boolean {
  return simpleSelectPattern.test(sql) || groupedSelectPattern.test(sql);
}
