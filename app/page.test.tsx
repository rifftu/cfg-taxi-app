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

  it("shows a loading state while SQL generation is pending", async () => {
    const user = userEvent.setup();
    fetchMock.mockReturnValueOnce(new Promise(() => undefined));
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /generate sql/i }));

    expect(
      screen.getByRole("button", { name: /generating sql/i }),
    ).toBeDisabled();
  });

  it("renders API errors", async () => {
    const user = userEvent.setup();
    mockFetchResponse(
      {
        cfg: { error: "Unable to generate a supported read-only query." },
        control: { error: "Unable to generate comparison SQL." },
      },
      false,
    );
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /generate sql/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to generate a supported read-only query.",
    );
  });

  it("renders rejected questions", async () => {
    const user = userEvent.setup();
    mockFetchResponse({
      cfg: {
        rejected: true,
        message: "That question can't be answered with the supported taxi trip analytics.",
      },
      control: {
        sql: "SELECT min(pickup_datetime), max(pickup_datetime) FROM nyc_taxi.trips_small;",
        notes: "Uses min/max timestamps.",
      },
    });
    render(<Home />);

    await user.clear(screen.getByLabelText(/question/i));
    await user.type(screen.getByLabelText(/question/i), "What is the weather?");
    await user.click(screen.getByRole("button", { name: /generate sql/i }));

    expect(await screen.findByText(/question rejected/i)).toBeInTheDocument();
    expect(screen.getByText(/no executable sql/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sql comparison/i)).toContainElement(
      screen.getByText(/display-only sql/i),
    );
    expect(screen.getByText(/non-cfg comparison only/i)).toBeInTheDocument();
    expect(screen.getByText(/uses min\/max timestamps/i)).toBeInTheDocument();
  });

  it("renders CFG and non-CFG SQL before executing anything", async () => {
    const user = userEvent.setup();
    mockFetchResponse({
      cfg: {
        question: "count trips",
        sql: "SELECT count() FROM nyc_taxi.trips_small;",
      },
      control: {
        sql: "SELECT min(pickup_datetime), max(pickup_datetime) FROM nyc_taxi.trips_small;",
        notes: "Displays the dataset range.",
      },
    });
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /generate sql/i }));

    expect(await screen.findByText("SELECT count() FROM nyc_taxi.trips_small;")).toBeInTheDocument();
    expect(
      screen.getByText(
        "SELECT min(pickup_datetime), max(pickup_datetime) FROM nyc_taxi.trips_small;",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/display-only sql/i)).toBeInTheDocument();
    expect(screen.getByText(/not CFG-constrained and cannot be executed/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run against clickhouse/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/generate-sql",
      expect.objectContaining({
        body: JSON.stringify({
          question: "Sum the total amount for taxi trips in the last 30 hours.",
        }),
      }),
    );
  });

  it("executes proposed SQL only after the user clicks run", async () => {
    const user = userEvent.setup();
    mockFetchResponse({
      cfg: {
        question: "count trips",
        sql: "SELECT count() FROM nyc_taxi.trips_small;",
      },
      control: {
        sql: "SELECT min(pickup_datetime), max(pickup_datetime) FROM nyc_taxi.trips_small;",
      },
    });
    mockFetchResponse({
      question: "count trips",
      sql: "SELECT count() FROM nyc_taxi.trips_small;",
      rows: [{ "count()": 42 }],
      rowCount: 1,
      durationMs: 12,
    });
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /generate sql/i }));
    await user.click(await screen.findByRole("button", { name: /run against clickhouse/i }));

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("12 ms")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/execute-sql",
      expect.objectContaining({
        body: JSON.stringify({
          question: "count trips",
          sql: "SELECT count() FROM nyc_taxi.trips_small;",
        }),
      }),
    );
  });

  it("renders empty results distinctly from the initial state", async () => {
    const user = userEvent.setup();
    mockFetchResponse({
      cfg: {
        question: "count trips",
        sql: "SELECT count() FROM nyc_taxi.trips_small WHERE passenger_count > 99;",
      },
      control: {
        sql: "SELECT count() FROM nyc_taxi.trips_small WHERE passenger_count > 99;",
      },
    });
    mockFetchResponse({
      question: "count trips",
      sql: "SELECT count() FROM nyc_taxi.trips_small WHERE passenger_count > 99;",
      rows: [],
      rowCount: 0,
      durationMs: 10,
    });
    render(<Home />);

    await user.click(screen.getByRole("button", { name: /generate sql/i }));
    await user.click(await screen.findByRole("button", { name: /run against clickhouse/i }));

    await waitFor(() => {
      expect(screen.getByText(/no rows returned/i)).toBeInTheDocument();
    });
  });
});
