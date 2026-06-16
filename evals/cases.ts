export type EvalCase = {
  id: string;
  prompt: string;
  shouldCallTool: boolean;
  expectedSqlIncludes?: string[];
};

export const evalCases: EvalCase[] = [
  {
    id: "sum-total-last-30-hours",
    prompt: "Sum the total amount for taxi trips in the last 30 hours.",
    shouldCallTool: true,
    expectedSqlIncludes: [
      "sum(total_amount)",
      "pickup_datetime >=",
      "INTERVAL 30 HOUR",
    ],
  },
  {
    id: "average-tip-by-payment-type",
    prompt: "Show average tip amount by payment type.",
    shouldCallTool: true,
    expectedSqlIncludes: [
      "payment_type",
      "avg(tip_amount)",
      "GROUP BY payment_type",
    ],
  },
  {
    id: "top-pickup-neighborhoods-revenue",
    prompt: "Top 10 pickup neighborhoods by total revenue.",
    shouldCallTool: true,
    expectedSqlIncludes: [
      "pickup_ntaname",
      "sum(total_amount)",
      "GROUP BY pickup_ntaname",
      "ORDER BY",
      "LIMIT 10",
    ],
  },
  {
    id: "reject-weather",
    prompt: "What's the weather in Paris tomorrow?",
    shouldCallTool: false,
  },
];
