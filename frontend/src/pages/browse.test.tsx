import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { media, mediaDetail, page } from "../test-utils/fixtures";
import { mockApi, renderRoute } from "../test-utils/render";

const REGIONS = [
  { code: "CO", name: "Colombia" },
  { code: "US", name: "United States" },
];
const NETFLIX = { provider_id: 8, provider_name: "Netflix", logo_path: null };

const browseApi = () => ({
  regions: REGIONS,
  "genres/movie": [
    { id: 28, name: "Action" },
    { id: 35, name: "Comedy" },
  ],
  "providers/movie?region=US": [NETFLIX, { provider_id: 1796, provider_name: "Netflix basic with Ads", logo_path: null }],
  "providers/movie?region=CO": [NETFLIX],
  "discover/movie?sort=popular&page=1": page([media({ id: 1, title: "Inception" })], { total_pages: 2, total_results: 40 }),
  "discover/movie?sort=popular&page=2": page([media({ id: 3, title: "Tenet" })], { page: 2, total_pages: 2, total_results: 40 }),
  "discover/movie?sort=popular&page=1&genre=35": page([media({ id: 4, title: "Superbad" })]),
  "discover/movie?sort=popular&page=1&genre=35&provider=8&region=US": page([media({ id: 5, title: "Murder Mystery" })]),
  "discover/movie?sort=top_rated&page=1&genre=35&provider=8&region=CO": page([media({ id: 6, title: "The Mask" })]),
});

describe("BrowsePage", () => {
  it("lists popular movies and loads more", async () => {
    mockApi(browseApi());
    renderRoute("/browse/movie");

    expect(await screen.findByRole("heading", { level: 1, name: "Movies" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Inception/ })).toBeInTheDocument();
    expect(screen.getByText("40 titles")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByRole("link", { name: /Tenet/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Inception/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("filters by genre and streaming service, keeping the filters in the URL", async () => {
    mockApi(browseApi());
    const { router } = renderRoute("/browse/movie");

    const genres = await screen.findByRole("group", { name: "Genres" });
    await userEvent.click(await within(genres).findByRole("button", { name: "Comedy" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Comedy Movies" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Superbad/ })).toBeInTheDocument();

    const services = screen.getByRole("combobox", { name: /Streaming in United States/ });
    // Ad tiers are hidden from the service list.
    expect(within(services).queryByRole("option", { name: /with Ads/ })).not.toBeInTheDocument();
    await userEvent.selectOptions(services, "Netflix");
    expect(await screen.findByRole("link", { name: /Murder Mystery/ })).toBeInTheDocument();
    expect(router.state.location.search).toBe("?genre=35&provider=8");
  });

  it("uses the country picked in the navbar for the service filter", async () => {
    mockApi(browseApi());
    renderRoute("/browse/movie?genre=35&provider=8&sort=top_rated");

    const country = await screen.findByRole("combobox", { name: "Country" });
    await within(country).findByRole("option", { name: "Colombia" });
    await userEvent.selectOptions(country, "Colombia");
    expect(await screen.findByRole("link", { name: /The Mask/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Streaming in Colombia/ })).toHaveValue("8");
  });

  it("shows a 404 for an unknown media type", async () => {
    mockApi({});
    renderRoute("/browse/books");
    expect(await screen.findByText("We couldn't find that page.")).toBeInTheDocument();
  });
});

describe("country picker", () => {
  it("reloads where to watch for the chosen country", async () => {
    mockApi({
      regions: REGIONS,
      "movie/1?region=US": mediaDetail(),
      "movie/1?region=CO": mediaDetail({ providers: null }),
    });
    renderRoute("/movie/1/inception");

    expect(await screen.findByRole("img", { name: "Netflix" })).toBeInTheDocument();
    expect(await screen.findByText(/Availability in United States/)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Country" }), "Colombia");
    await waitFor(() => expect(screen.queryByRole("img", { name: "Netflix" })).not.toBeInTheDocument());
    expect(screen.getByText(/Not available to stream, rent or buy in Colombia/)).toBeInTheDocument();
    expect(localStorage.getItem("region")).toBe("CO");
  });
});
