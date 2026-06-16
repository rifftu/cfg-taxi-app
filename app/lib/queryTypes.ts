export type QueryRow = Record<string, string | number | boolean | null>;

export type QuerySuccessResponse = {
  question: string;
  sql: string;
  rows: QueryRow[];
  rowCount: number;
  durationMs: number;
};

export type SqlProposalResponse = {
  question: string;
  sql: string;
};

export type ControlSqlResponse = {
  sql: string;
  notes?: string;
};

export type QueryRejectedResponse = {
  rejected: true;
  message: string;
};

export type QueryErrorResponse = {
  error: string;
};

export type QueryResponse =
  | QuerySuccessResponse
  | QueryRejectedResponse
  | QueryErrorResponse;

export type GenerateSqlResponse =
  | SqlProposalResponse
  | QueryRejectedResponse
  | QueryErrorResponse;

export type GenerateSqlComparisonResponse = {
  cfg: GenerateSqlResponse;
  control: ControlSqlResponse | QueryErrorResponse;
};

export type GenerateSqlApiResponse =
  | GenerateSqlComparisonResponse
  | QueryErrorResponse;

export type ExecuteSqlResponse = QuerySuccessResponse | QueryErrorResponse;

export const rejectionMessage =
  "That question can't be answered with the supported taxi trip analytics.";
