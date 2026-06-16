"use client";

import { FormEvent, useMemo, useState } from "react";
import { examplePrompts } from "@/app/lib/examples";
import type {
  ControlSqlResponse,
  ExecuteSqlResponse,
  GenerateSqlApiResponse,
  QueryErrorResponse,
  QueryRejectedResponse,
  QuerySuccessResponse,
  SqlProposalResponse,
} from "@/app/lib/queryTypes";

const initialQuestion = examplePrompts[0];

function isSuccessResponse(
  response: ExecuteSqlResponse | null,
): response is QuerySuccessResponse {
  return Boolean(response && "rows" in response);
}

/** Renders the taxi analytics demo shell. */
export default function Home() {
  const [question, setQuestion] = useState<string>(initialQuestion);
  const [proposal, setProposal] = useState<SqlProposalResponse | null>(null);
  const [controlResult, setControlResult] = useState<
    ControlSqlResponse | QueryErrorResponse | null
  >(null);
  const [rejection, setRejection] = useState<QueryRejectedResponse | null>(null);
  const [executionResponse, setExecutionResponse] =
    useState<ExecuteSqlResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const columns = useMemo(() => {
    if (!isSuccessResponse(executionResponse)) {
      return [];
    }

    return Array.from(
      executionResponse.rows.reduce((keys, row) => {
        Object.keys(row).forEach((key) => keys.add(key));
        return keys;
      }, new Set<string>()),
    );
  }, [executionResponse]);

  function updateQuestion(nextQuestion: string) {
    setQuestion(nextQuestion);
    setProposal(null);
    setControlResult(null);
    setRejection(null);
    setExecutionResponse(null);
    setRequestError(null);
  }

  async function handleGenerateSql(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsGenerating(true);
    setRequestError(null);
    setProposal(null);
    setControlResult(null);
    setRejection(null);
    setExecutionResponse(null);

    try {
      const result = await fetch("/api/generate-sql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });
      const data = (await result.json()) as GenerateSqlApiResponse;

      if (!result.ok && "error" in data) {
        setRequestError(data.error);
        return;
      }

      if (!("cfg" in data)) {
        setRequestError("Unable to generate a supported read-only query.");
        return;
      }

      setControlResult(data.control);

      if ("rejected" in data.cfg) {
        setRejection(data.cfg);
        return;
      }

      if ("sql" in data.cfg) {
        setProposal(data.cfg);
        return;
      }

      setRequestError(data.cfg.error);
    } catch {
      setRequestError("Unable to reach the SQL generation API.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleExecuteSql() {
    if (!proposal) {
      return;
    }

    setIsExecuting(true);
    setRequestError(null);
    setExecutionResponse(null);

    try {
      const result = await fetch("/api/execute-sql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: proposal.question,
          sql: proposal.sql,
        }),
      });
      const data = (await result.json()) as ExecuteSqlResponse;

      if (!result.ok && "error" in data) {
        setRequestError(data.error);
        return;
      }

      setExecutionResponse(data);
    } catch {
      setRequestError("Unable to reach the SQL execution API.");
    } finally {
      setIsExecuting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">GPT-5 CFG + ClickHouse demo</p>
        <h1>Ask natural-language questions about NYC taxi trips.</h1>
        <h2>By Jerry</h2>
        <p className="hero-copy">
          Ask supported taxi analytics questions, inspect the CFG-constrained
          SQL, then run it against ClickHouse when it looks right.
        </p>
      </section>

      <section className="workspace" aria-label="Taxi analytics query builder">
        <div className="query-panel">
          <form onSubmit={handleGenerateSql}>
            <label htmlFor="question">Question</label>
            <textarea
              id="question"
              value={question}
              onChange={(event) => updateQuestion(event.target.value)}
              placeholder="Ask about totals, tips, payment types, neighborhoods, passengers, or time windows."
              rows={6}
            />

            <div className="examples" aria-label="Example prompts">
              {examplePrompts.map((prompt) => (
                <button
                  className="example-button"
                  key={prompt}
                  type="button"
                  onClick={() => updateQuestion(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <button
              className="submit-button"
              type="submit"
              disabled={isGenerating || isExecuting}
            >
              {isGenerating ? "Generating SQL..." : "Generate SQL"}
            </button>
          </form>
        </div>

        <div className="results-panel">
          {!proposal &&
          !controlResult &&
          !rejection &&
          !executionResponse &&
          !requestError ? (
            <div className="empty-state">
              <h2>Ready for a taxi analytics question</h2>
              <p>
                Choose a demo prompt or type your own.
              </p>
            </div>
          ) : null}

          {proposal || controlResult || rejection ? (
            <div className="comparison-grid" aria-label="SQL comparison">
              <section className="sql-card" aria-labelledby="cfg-sql-heading">
                <p className="card-label">CFG constrained</p>
                <h2 id="cfg-sql-heading">
                  {proposal ? "Executable SQL" : "No executable SQL"}
                </h2>
                {proposal ? (
                  <>
                  <pre>{proposal.sql}</pre>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={isExecuting}
                    onClick={handleExecuteSql}
                  >
                    {isExecuting ? "Running query..." : "Run against ClickHouse"}
                  </button>
                  </>
                ) : null}
                {rejection ? (
                  <div className="inline-rejection" role="status">
                    <h3>Question rejected</h3>
                    <p>{rejection.message}</p>
                  </div>
                ) : null}
              </section>

              {controlResult ? (
                <section className="sql-card control-card" aria-labelledby="control-sql-heading">
                  <p className="card-label">Non-CFG comparison only</p>
                  <h2 id="control-sql-heading">Display-only SQL</h2>
                  {"error" in controlResult ? (
                    <p className="control-warning">{controlResult.error}</p>
                  ) : (
                    <>
                      <pre>{controlResult.sql}</pre>
                      {controlResult.notes ? (
                        <p className="control-notes">{controlResult.notes}</p>
                      ) : null}
                    </>
                  )}
                  <p className="control-warning">
                    This SQL is not CFG-constrained and cannot be executed from this UI.
                  </p>
                </section>
              ) : null}
            </div>
          ) : null}

          {requestError ? (
            <div className="notice notice-error" role="alert">
              {requestError}
            </div>
          ) : null}

          {isSuccessResponse(executionResponse) ? (
            <div className="result-stack">
              <div className="metadata-grid" aria-label="Query metadata">
                <div>
                  <span>Rows</span>
                  <strong>{executionResponse.rowCount}</strong>
                </div>
                <div>
                  <span>Duration</span>
                  <strong>{executionResponse.durationMs} ms</strong>
                </div>
                <div>
                  <span>Mode</span>
                  <strong>Live</strong>
                </div>
              </div>

              <section className="table-card" aria-labelledby="results-heading">
                <h2 id="results-heading">Result rows</h2>
                <div className="table-scroll">
                  {executionResponse.rows.length === 0 ? (
                    <p className="no-rows">No rows returned for this query.</p>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          {columns.map((column) => (
                            <th key={column}>{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {executionResponse.rows.map((row, rowIndex) => (
                          <tr key={`${executionResponse.question}-${rowIndex}`}>
                            {columns.map((column) => (
                              <td key={column}>{formatCellValue(row[column])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function formatCellValue(value: QuerySuccessResponse["rows"][number][string]) {
  if (value === null) {
    return "NULL";
  }

  return String(value);
}
