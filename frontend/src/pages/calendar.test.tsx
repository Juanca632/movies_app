import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { media } from "../test-utils/fixtures";
import { mockApi, renderRoute } from "../test-utils/render";

describe("CalendarPage", () => {
  beforeEach(() => {
    // Only Date is faked: "today" is October 15, 2026, and user events keep real timers.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T12:00:00"));
  });
  afterEach(() => vi.useRealTimers());

  it("groups the month's releases by day, starting from today", async () => {
    mockApi({
      "releases/theaters?month=2026-10&region=US": [
        media({ id: 1, title: "Early Bird", release_date: "2026-10-03" }),
        media({ id: 2, title: "Opening Today", release_date: "2026-10-15" }),
        media({ id: 3, title: "Late Show", release_date: "2026-10-20" }),
        media({ id: 4, title: "Same Day", release_date: "2026-10-20" }),
      ],
    });
    renderRoute("/calendar");

    const today = await screen.findByRole("region", { name: "Thursday, October 15" });
    expect(within(today).getByText("Today")).toBeInTheDocument();
    expect(within(today).getByRole("link", { name: /Opening Today/ })).toHaveAttribute("href", "/movie/2/opening-today");
    const later = screen.getByRole("region", { name: "Tuesday, October 20" });
    expect(within(later).getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByText("Early Bird")).not.toBeInTheDocument();
    // The country list is not mocked, so the name falls back to its code.
    expect(screen.getByText("Release dates in US")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show 1 earlier day this month" }));
    expect(screen.getByRole("region", { name: "Saturday, October 3" })).toBeInTheDocument();
  });

  it("switches release type and month through the URL", async () => {
    const fetchMock = mockApi({
      "releases/theaters?month=2026-10&region=US": [],
      "releases/tv?month=2026-10": [media({ id: 9, media_type: "tv", title: "New Show", release_date: "2026-10-22" })],
      "releases/tv?month=2026-11": [],
    });
    const { router } = renderRoute("/calendar");

    expect(await screen.findByText("No releases found for October 2026.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "New series" }));
    expect(await screen.findByRole("link", { name: /New Show/ })).toHaveAttribute("href", "/tv-show/9/new-show");
    expect(screen.getByText("Series premiering worldwide")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(await screen.findByText("No releases found for November 2026.")).toBeInTheDocument();
    expect(new URLSearchParams(router.state.location.search).get("month")).toBe("2026-11");
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("releases/tv?month=2026-11"))).toBe(true);
  });

  it("opens the month and type given in the URL", async () => {
    mockApi({
      "releases/home?month=2027-01&region=US": [media({ id: 5, title: "Streaming Soon", release_date: "2027-01-08" })],
    });
    renderRoute("/calendar?kind=home&month=2027-01");

    expect(await screen.findByRole("region", { name: "Friday, January 8" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "At home" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: /earlier/ })).not.toBeInTheDocument();
  });
});
