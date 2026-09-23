import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { media, mediaDetail, page } from "../test-utils/fixtures";
import { mockApi, renderRoute } from "../test-utils/render";

const SUPERBAD = media({ id: 4, title: "Superbad", genre_ids: [35], overview: "Two co-dependent high school seniors." });

const api = () => ({
  "genres/movie": [{ id: 35, name: "Comedy" }],
  "discover/movie?sort=popular&page=1": page([SUPERBAD]),
  "movie/4?region=US": mediaDetail({ ...SUPERBAD, runtime: 113 }),
});

const stubPointer = (fine: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: fine, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));

describe("hover preview", () => {
  beforeEach(() => stubPointer(true));

  it("grows a card into a preview with details and a trailer", async () => {
    mockApi(api());
    renderRoute("/browse/movie");

    await userEvent.hover(await screen.findByRole("link", { name: /Superbad/ }));
    const preview = await screen.findByRole("group", { name: "Superbad preview" });
    expect(within(preview).getByText("Comedy")).toBeInTheDocument();
    expect(within(preview).getByText(/Two co-dependent/)).toBeInTheDocument();
    expect(await within(preview).findByText("1h 53m")).toBeInTheDocument();
    expect(within(preview).getByRole("link", { name: "Details" })).toHaveAttribute("href", "/movie/4/superbad");

    await userEvent.click(within(preview).getByRole("button", { name: "Trailer" }));
    const dialog = await screen.findByRole("dialog", { name: "Superbad trailer" });
    expect(within(dialog).getByTitle("Official Trailer")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/YoHD9XEInc0?autoplay=1&rel=0",
    );
    expect(screen.queryByRole("group", { name: "Superbad preview" })).not.toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides the trailer button when the title has none", async () => {
    mockApi({ ...api(), "movie/4?region=US": mediaDetail({ ...SUPERBAD, trailer: null }) });
    renderRoute("/browse/movie");

    await userEvent.hover(await screen.findByRole("link", { name: /Superbad/ }));
    const preview = await screen.findByRole("group", { name: "Superbad preview" });
    await waitFor(() => expect(within(preview).queryByRole("button", { name: "Trailer" })).not.toBeInTheDocument());
  });

  it("does not open on touch screens", async () => {
    stubPointer(false);
    mockApi(api());
    renderRoute("/browse/movie");

    await userEvent.hover(await screen.findByRole("link", { name: /Superbad/ }));
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(screen.queryByRole("group", { name: /preview/ })).not.toBeInTheDocument();
  });
});

describe("trailer on the detail page", () => {
  it("plays from the watch trailer button and closes again", async () => {
    mockApi({ "movie/1?region=US": mediaDetail() });
    renderRoute("/movie/1/inception");

    await userEvent.click(await screen.findByRole("button", { name: "Watch trailer" }));
    expect(await screen.findByRole("dialog", { name: "Inception trailer" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close trailer" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("has no trailer button when TMDB has no trailer", async () => {
    mockApi({ "movie/1?region=US": mediaDetail({ trailer: null }) });
    renderRoute("/movie/1/inception");

    expect(await screen.findByRole("heading", { level: 1, name: "Inception" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Watch trailer" })).not.toBeInTheDocument();
  });
});
