import { isSqlAcceptedByGrammar } from "@/app/lib/grammar";
import { getSqlTableIdentifier } from "@/app/lib/tableConfig";

export type SqlValidationResult =
  | {
      valid: true;
      normalizedSql: string;
    }
  | {
      valid: false;
      reason: string;
    };

const forbiddenKeywordPattern =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|SYSTEM|GRANT|REVOKE|ATTACH|DETACH|OPTIMIZE)\b/i;
/** Validates that generated SQL stays inside the supported read-only surface. */
export function validateSql(sql: string): SqlValidationResult {
  const supportedTable = getSqlTableIdentifier();

  if (sql !== sql.trim()) {
    return reject("SQL must not include leading or trailing whitespace.");
  }

  if (!sql.startsWith("SELECT ")) {
    return reject("SQL must start with SELECT.");
  }

  if (!sql.endsWith(";")) {
    return reject("SQL must end with one semicolon.");
  }

  if ((sql.match(/;/g) ?? []).length !== 1) {
    return reject("SQL must contain exactly one statement.");
  }

  if (sql.includes("--") || sql.includes("/*") || sql.includes("*/")) {
    return reject("SQL must not contain comments.");
  }

  if (forbiddenKeywordPattern.test(sql)) {
    return reject("SQL contains a forbidden keyword.");
  }

  const tableReferences = [...sql.matchAll(/\bFROM ([A-Za-z0-9_.]+)/g)].map(
    (match) => match[1],
  );

  if (
    tableReferences.length === 0 ||
    tableReferences.some((tableReference) => tableReference !== supportedTable)
  ) {
    return reject(`SQL may only reference ${supportedTable}.`);
  }

  if (!isSqlAcceptedByGrammar(sql, supportedTable)) {
    return reject("SQL is outside the supported taxi analytics grammar.");
  }

  return {
    valid: true,
    normalizedSql: sql,
  };
}

function reject(reason: string): SqlValidationResult {
  return {
    valid: false,
    reason,
  };
}
