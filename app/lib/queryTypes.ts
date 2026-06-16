export type QueryRow = Record<string, string | number | boolean | null>;

export type QuerySuccessResponse = {
  question: string;
  sql: string;
  rows: QueryRow[];
  rowCount: number;
  durationMs: number;
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

export const rejectionMessage =
  "That question can't be answered with the supported taxi trip analytics.";
