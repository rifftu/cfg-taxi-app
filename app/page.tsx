"use client";

import { FormEvent, useMemo, useState } from "react";
import { examplePrompts } from "@/app/lib/examples";
import type { QueryResponse, QuerySuccessResponse } from "@/app/lib/queryTypes";

const initialQuestion = examplePrompts[0];

function isSuccessResponse(
  response: QueryResponse | null,
): response is QuerySuccessResponse {
  return Boolean(response && "rows" in response);
}

/** Renders the taxi analytics demo shell. */
export default function Home() {
  const [question, setQuestion] = useState<string>(initialQuestion);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const columns = useMemo(() => {
    if (!isSuccessResponse(response)) {
      return [];
    }

    return Array.from(
      response.rows.reduce((keys, row) => {
        Object.keys(row).forEach((key) => keys.add(key));
        return keys;
      }, new Set<string>()),
    );
  }, [response]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setRequestError(null);
    setResponse(null);

    try {
      const result = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });
      const data = (await result.json()) as QueryResponse;

      if (!result.ok && "error" in data) {
        setRequestError(data.error);
        return;
      }

      setResponse(data);
    } catch {
      setRequestError("Unable to reach the local query API.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">GPT-5 CFG + ClickHouse demo</p>
        <h1>Ask natural-language questions about NYC taxi trips.</h1>
        <p className="hero-copy">
          Ask supported taxi analytics questions, preview the CFG-constrained
          SQL, and inspect the rows returned by the query API.
        </p>
      </section>

      <section className="workspace" aria-label="Taxi analytics query builder">
        <div className="query-panel">
          <form onSubmit={handleSubmit}>
            <label htmlFor="question">Question</label>
            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about totals, tips, payment types, neighborhoods, passengers, or time windows."
              rows={6}
            />

            <div className="examples" aria-label="Example prompts">
              {examplePrompts.map((prompt) => (
                <button
                  className="example-button"
                  key={prompt}
                  type="button"
                  onClick={() => setQuestion(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <button className="submit-button" type="submit" disabled={isLoading}>
              {isLoading ? "Generating query..." : "Generate SQL"}
            </button>
          </form>
        </div>

        <div className="results-panel">
          {!response && !requestError ? (
            <div className="empty-state">
              <h2>Ready for a taxi analytics question</h2>
              <p>
                Choose a reliable demo prompt or type your own. Unsupported
                questions show the same rejection state the live API will use.
              </p>
            </div>
          ) : null}

          {requestError ? (
            <div className="notice notice-error" role="alert">
              {requestError}
            </div>
          ) : null}

          {response && "rejected" in response ? (
            <div className="notice notice-rejected" role="status">
              <h2>Question rejected</h2>
              <p>{response.message}</p>
            </div>
          ) : null}

          {isSuccessResponse(response) ? (
            <div className="result-stack">
              <div className="metadata-grid" aria-label="Query metadata">
                <div>
                  <span>Rows</span>
                  <strong>{response.rowCount}</strong>
                </div>
                <div>
                  <span>Duration</span>
                  <strong>{response.durationMs} ms</strong>
                </div>
                <div>
                  <span>Mode</span>
                  <strong>Mock</strong>
                </div>
              </div>

              <section className="sql-card" aria-labelledby="sql-heading">
                <h2 id="sql-heading">Generated SQL preview</h2>
                <pre>{response.sql}</pre>
              </section>

              <section className="table-card" aria-labelledby="results-heading">
                <h2 id="results-heading">Result rows</h2>
                <div className="table-scroll">
                  {response.rows.length === 0 ? (
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
                        {response.rows.map((row, rowIndex) => (
                          <tr key={`${response.question}-${rowIndex}`}>
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
