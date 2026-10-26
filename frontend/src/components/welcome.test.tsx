import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { mockApi, renderRoute } from "../test-utils/render";

const signedOut = { me: () => new Response("Not signed in", { status: 401 }) };
const noAccounts = { me: () => new Response("Accounts are not set up", { status: 503 }) };

// It opens after a short pause on the page.
const tour = () => screen.findByRole("dialog", { name: "Welcome to MoviesApp" }, { timeout: 2000 });

describe("welcome tour", () => {
  // The shared setup marks it seen, so it stays out of every other test.
  beforeEach(() => localStorage.removeItem("moviesapp-welcome-seen"));

  it("opens on a first visit and walks through the app, the AI and accounts", async () => {
    mockApi(signedOut);
    renderRoute("/calendar");

    const dialog = await tour();
    expect(within(dialog).getByText("1 of 3")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Next" }));
    expect(within(dialog).getByRole("heading", { name: "Just ask the AI" })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Next" }));
    expect(within(dialog).getByRole("heading", { name: "Make it yours" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/api/v1/auth/google/login?next=%2Fcalendar",
    );

    await userEvent.click(within(dialog).getByRole("button", { name: "Start exploring" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem("moviesapp-welcome-seen")).not.toBeNull();
  });

  it("skips the account step when the server has no accounts", async () => {
    mockApi(noAccounts);
    renderRoute("/calendar");

    const dialog = await tour();
    await waitFor(() => expect(within(dialog).getByText("1 of 2")).toBeInTheDocument());
    await userEvent.click(within(dialog).getByRole("button", { name: "Next" }));
    expect(within(dialog).getByRole("button", { name: "Start exploring" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("asks the assistant an example question", async () => {
    mockApi(signedOut);
    renderRoute("/calendar");

    const dialog = await tour();
    await userEvent.click(within(dialog).getByRole("button", { name: "Next" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Something funny and short for tonight" }));

    const panel = await screen.findByRole("dialog", { name: "Ask AI" });
    expect(within(panel).getByText("Something funny and short for tonight")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Welcome to MoviesApp" })).not.toBeInTheDocument();
  });

  it("stays away once seen, and from links that open the assistant", async () => {
    mockApi(signedOut);
    localStorage.setItem("moviesapp-welcome-seen", "1");
    const { unmount } = renderRoute("/calendar");
    await expect(tour()).rejects.toThrow();
    unmount();

    localStorage.removeItem("moviesapp-welcome-seen");
    renderRoute("/calendar?ask=");
    await screen.findByRole("dialog", { name: "Ask AI" });
    await expect(tour()).rejects.toThrow();
  });

  it("opens again from the footer", async () => {
    mockApi(signedOut);
    localStorage.setItem("moviesapp-welcome-seen", "1");
    renderRoute("/privacy");

    await userEvent.click(await screen.findByRole("button", { name: "How it works" }));
    const dialog = await tour();
    await userEvent.click(within(dialog).getByRole("button", { name: "Skip the tour" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
