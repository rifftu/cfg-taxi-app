import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

const fetchMock = vi.fn();

function mockFetchResponse(body: unknown, ok = true) {
  fetchMock.mockResolvedValueOnce({
    ok,
    json: async () => body,
  });
}

describe("Home", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("renders the initial empty state", () => {
    render(<Home />);

    expect(screen.getByText(/ready for a taxi analytics question/i)).toBeInTheDocument();
  });

  it("shows a loading state while the query is pending", async () => {
    const user = userEvent.setup();
    fetchMock.mockReturnValueOnce(new Promise(() => undefined));
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /generate sql/i }));

    expect(
      screen.getByRole("button", { name: /generating query/i }),
    ).toBeDisabled();
  });

  it("renders API errors", async () => {
    const user = userEvent.setup();
    mockFetchResponse({ error: "Unable to generate a supported read-only query." }, false);
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /generate sql/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to generate a supported read-only query.",
    );
  });

  it("renders rejected questions", async () => {
    const user = userEvent.setup();
    mockFetchResponse({
      rejected: true,
      message: "That question can't be answered with the supported taxi trip analytics.",
    });
    render(<Home />);

    await user.clear(screen.getByLabelText(/question/i));
    await user.type(screen.getByLabelText(/question/i), "What is the weather?");
    await user.click(screen.getByRole("button", { name: /generate sql/i }));

    expect(await screen.findByText(/question rejected/i)).toBeInTheDocument();
  });

  it("renders generated SQL, metadata, and result rows", async () => {
    const user = userEvent.setup();
    mockFetchResponse({
      question: "count trips",
      sql: "SELECT count() FROM nyc_taxi.trips_small;",
      rows: [{ "count()": 42 }],
      rowCount: 1,
      durationMs: 12,
    });
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /generate sql/i }));

    expect(await screen.findByText("SELECT count() FROM nyc_taxi.trips_small;")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("12 ms")).toBeInTheDocument();
  });

  it("renders empty results distinctly from the initial state", async () => {
    const user = userEvent.setup();
    mockFetchResponse({
      question: "count trips",
      sql: "SELECT count() FROM nyc_taxi.trips_small WHERE passenger_count > 99;",
      rows: [],
      rowCount: 0,
      durationMs: 10,
    });
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /generate sql/i }));

    await waitFor(() => {
      expect(screen.getByText(/no rows returned/i)).toBeInTheDocument();
    });
  });
});
