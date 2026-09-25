import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { media, mediaDetail, page, person, personDetail } from "../test-utils/fixtures";
import { mockApi, renderRoute } from "../test-utils/render";

const homeApi = () => ({
  "movie?category=now_playing&region=US": page([media({ id: 10, title: "Dune: Part Two" })]),
  "movie?category=popular": page([media({ id: 11, title: "Oppenheimer" })]),
  "movie?category=upcoming&region=US": page([media({ id: 12, title: "Avatar 3" })]),
  "movie?category=top_rated": page([media({ id: 13, title: "The Godfather" })]),
  "tv?category=popular": page([media({ id: 14, media_type: "tv", title: "The Bear" })]),
  "tv?category=top_rated": page([media({ id: 15, media_type: "tv", title: "Breaking Bad" })]),
  "person/popular": [person()],
});

describe("HomePage", () => {
  it("shows the featured movie and every category row", async () => {
    mockApi(homeApi());
    renderRoute("/");

    const hero = await screen.findByRole("region", { name: "Featured" });
    expect(await within(hero).findByRole("heading", { name: "Oppenheimer" })).toBeInTheDocument();

    const tv = await screen.findByRole("region", { name: "Popular TV Shows" });
    expect(within(tv).getByRole("link", { name: /The Bear/ })).toHaveAttribute("href", "/tv-show/14/the-bear");

    const stars = screen.getByRole("region", { name: "Popular Stars" });
    expect(await within(stars).findByRole("link", { name: /Tom Hanks/ })).toHaveAttribute("href", "/person/31/tom-hanks");
    expect(within(stars).getByText("Known for Forrest Gump")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Dune: Part Two/ })).toHaveAttribute("href", "/movie/10/dune-part-two");
  });

  it("lets a failing row retry on its own", async () => {
    let calls = 0;
    mockApi({
      ...homeApi(),
      "movie?category=upcoming&region=US": () =>
        ++calls === 1 ? new Response("boom", { status: 500 }) : Response.json(page([media({ id: 12, title: "Avatar 3" })])),
    });
    renderRoute("/");

    const row = await screen.findByRole("region", { name: "Coming Soon" });
    await userEvent.click(await within(row).findByRole("button", { name: "Try again" }));
    expect(await within(row).findByRole("link", { name: /Avatar 3/ })).toBeInTheDocument();
  });
});

describe("MediaPage", () => {
  it("renders a movie with runtime, genres, cast, providers and recommendations", async () => {
    mockApi({
      "movie/1?region=US": mediaDetail(),
      "acclaim/tt1375666": {
        awards: "Won 4 Oscars. 160 wins & 220 nominations total",
        scores: [
          { source: "imdb", value: "8.8" },
          { source: "rotten_tomatoes", value: "86%" },
        ],
      },
    });
    renderRoute("/movie/1/inception");

    expect(await screen.findByRole("heading", { level: 1, name: "Inception" })).toBeInTheDocument();
    const acclaim = await screen.findByRole("region", { name: "Awards and ratings" });
    expect(within(acclaim).getByText("Won 4 Oscars. 160 wins & 220 nominations total")).toBeInTheDocument();
    expect(within(acclaim).getByText("Rotten Tomatoes").nextSibling).toHaveTextContent("86%");
    expect(screen.getByText("2h 28m")).toBeInTheDocument();
    expect(screen.getByText(/Directed by/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Christopher Nolan" })).toHaveAttribute("href", "/person/525/christopher-nolan");
    expect(screen.getByText("Science Fiction")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Leonardo DiCaprio/ })).toHaveAttribute("href", "/person/6193/leonardo-dicaprio");
    expect(screen.getByRole("img", { name: "Netflix" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Netflix basic with Ads" })).not.toBeInTheDocument();
    // Verified services search for the title; the rest fall back to TMDB's watch page.
    expect(screen.getByRole("link", { name: "Netflix" })).toHaveAttribute("href", "https://www.netflix.com/search?q=Inception");
    expect(screen.getByRole("link", { name: "HBO Max" })).toHaveAttribute("href", "https://www.themoviedb.org/movie/1/watch");
    expect(screen.getByRole("link", { name: /Interstellar/ })).toHaveAttribute("href", "/movie/2/interstellar");
    expect(document.title).toBe("Inception · MyMoviesApp");
  });

  it("asks the tv endpoint for TV shows and shows seasons", async () => {
    const fetchMock = mockApi({
      "tv/1396?region=US": mediaDetail({
        id: 1396,
        media_type: "tv",
        title: "Breaking Bad",
        runtime: null,
        number_of_seasons: 5,
        number_of_episodes: 62,
        creators: [
          { id: 66633, name: "Vince Gilligan" },
          { id: 1, name: "Peter Gould" },
        ],
      }),
    });
    renderRoute("/tv-show/1396/breaking-bad");

    expect(await screen.findByRole("heading", { level: 1, name: "Breaking Bad" })).toBeInTheDocument();
    expect(screen.getByText("5 seasons")).toBeInTheDocument();
    expect(screen.getByText("62 episodes")).toBeInTheDocument();
    expect(screen.getByText(/Created by/)).toHaveTextContent("Created by Vince Gilligan and Peter Gould");
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/v1/tv/1396?region=US"))).toBe(true);
  });

  it("lists the movie's saga in order and marks the current part", async () => {
    mockApi({
      "movie/673?region=US": mediaDetail({
        id: 673,
        title: "Harry Potter and the Prisoner of Azkaban",
        collection: { id: 1241, name: "Harry Potter Collection", poster_path: null, backdrop_path: "/hp.jpg" },
        recommendations: [media({ id: 671, title: "Philosopher's Stone" }), media({ id: 2, title: "Interstellar" })],
      }),
      "collection/1241": {
        id: 1241,
        name: "Harry Potter Collection",
        overview: "",
        poster_path: null,
        backdrop_path: "/hp.jpg",
        parts: [
          media({ id: 671, title: "Philosopher's Stone", release_date: "2001-11-16" }),
          media({ id: 673, title: "Prisoner of Azkaban", release_date: "2004-05-31" }),
          media({ id: 12445, title: "Deathly Hallows: Part 2", release_date: "2011-07-12" }),
        ],
      },
    });
    renderRoute("/movie/673");

    const saga = await screen.findByRole("region", { name: "Harry Potter Collection" });
    expect(within(saga).getByText("3 movies · 2001–2011")).toBeInTheDocument();
    const links = within(saga).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/movie/671/philosopher-s-stone",
      "/movie/673/prisoner-of-azkaban",
      "/movie/12445/deathly-hallows-part-2",
    ]);
    expect(links[1]).toHaveAttribute("aria-current", "page");
    expect(within(links[1]).getByText("You're here")).toBeInTheDocument();
    const more = screen.getByRole("region", { name: "More like this" });
    expect(within(more).getAllByRole("link").map((link) => link.textContent)).toEqual([expect.stringContaining("Interstellar")]);
  });

  it("lists a show's episodes by season, starting from the latest one on air", async () => {
    const episode = (season: number, n: number, name: string, airDate: string | null) => ({
      id: season * 100 + n,
      season_number: season,
      episode_number: n,
      name,
      overview: "",
      air_date: airDate,
      runtime: 47,
      still_path: null,
      vote_average: 8.2,
    });
    const season = (n: number, episodes: ReturnType<typeof episode>[]) => ({
      season_number: n,
      name: n === 0 ? "Specials" : `Season ${n}`,
      air_date: episodes[0].air_date,
      episode_count: episodes.length,
      poster_path: null,
      overview: "",
      episodes,
    });
    const s1 = season(1, [episode(1, 1, "Pilot", "2008-01-20")]);
    const s2 = season(2, [episode(2, 1, "Seven Thirty-Seven", "2009-03-08")]);
    const s3 = season(3, [episode(3, 1, "Future Episode", "2999-01-01")]);
    const specials = season(0, [episode(0, 1, "Minisode", null)]);
    const summary = ({ season_number, name, air_date, episode_count, poster_path }: ReturnType<typeof season>) => ({
      season_number,
      name,
      air_date,
      episode_count,
      poster_path,
    });
    mockApi({
      "tv/1396?region=US": mediaDetail({
        id: 1396,
        media_type: "tv",
        title: "Breaking Bad",
        seasons: [summary(s1), summary(s2), summary(s3), summary(specials)],
        next_episode: episode(3, 1, "Future Episode", "2999-01-01"),
      }),
      "tv/1396/season/1": s1,
      "tv/1396/season/2": s2,
      "tv/1396/season/3": s3,
      "tv/1396/season/0": specials,
    });
    const { router } = renderRoute("/tv-show/1396/breaking-bad");

    expect((await screen.findByText("Next episode")).parentElement).toHaveTextContent("Next episode · S3 E1 “Future Episode” · January 1, 2999");
    const episodes = screen.getByRole("region", { name: "Episodes" });
    // Neither the specials nor season 3, which has not started yet: the latest season on air.
    expect(await within(episodes).findByRole("heading", { name: /Seven Thirty-Seven/ })).toBeInTheDocument();
    expect(within(episodes).getByText("March 8, 2009 · 47m · ★ 8.2")).toBeInTheDocument();

    await userEvent.click(within(episodes).getByRole("combobox", { name: "Season" }));
    await userEvent.click(within(episodes).getByRole("option", { name: /Season 3/ }));
    expect(await within(episodes).findByRole("heading", { name: /Future Episode/ })).toBeInTheDocument();
    expect(within(episodes).getByText("Airs January 1, 2999")).toBeInTheDocument();
    expect(router.state.location.search).toBe("?season=3");
  });

  it("opens the season given in the URL", async () => {
    const pilot = {
      id: 1,
      season_number: 1,
      episode_number: 1,
      name: "Pilot",
      overview: "",
      air_date: "2008-01-20",
      runtime: null,
      still_path: null,
      vote_average: 0,
    };
    mockApi({
      "tv/1396?region=US": mediaDetail({
        id: 1396,
        media_type: "tv",
        title: "Breaking Bad",
        seasons: [
          { season_number: 1, name: "Season 1", air_date: "2008-01-20", episode_count: 1, poster_path: null },
          { season_number: 2, name: "Season 2", air_date: "2009-03-08", episode_count: 13, poster_path: null },
        ],
      }),
      "tv/1396/season/1": { season_number: 1, name: "Season 1", air_date: null, episode_count: 1, poster_path: null, overview: "", episodes: [pilot] },
    });
    renderRoute("/tv-show/1396/breaking-bad?season=1");

    const episodes = await screen.findByRole("region", { name: "Episodes" });
    expect(await within(episodes).findByRole("heading", { name: /Pilot/ })).toBeInTheDocument();
    expect(within(episodes).getByRole("combobox", { name: "Season" })).toHaveTextContent("Season 1 · 1 episode");
  });

  it("shows a 404 for an unknown movie", async () => {
    mockApi({});
    renderRoute("/movie/999/nope");
    expect(await screen.findByText("We couldn't find that movie.")).toBeInTheDocument();
  });

  it("offers a retry when the server fails", async () => {
    let calls = 0;
    mockApi({ "movie/1?region=US": () => (++calls === 1 ? new Response("boom", { status: 502 }) : Response.json(mediaDetail())) });
    renderRoute("/movie/1");

    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Inception" })).toBeInTheDocument();
  });
});

describe("PersonPage", () => {
  it("renders the person with a collapsible biography and credits", async () => {
    mockApi({ "person/31": personDetail() });
    renderRoute("/person/31/tom-hanks");

    expect(await screen.findByRole("heading", { level: 1, name: "Tom Hanks" })).toBeInTheDocument();
    expect(screen.getByText(/July 9, 1956 · Concord/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Read more" }));
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Forrest Gump/ })).toHaveAttribute("href", "/movie/13/forrest-gump");
    expect(screen.queryByRole("region", { name: "TV Shows" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Directed" })).not.toBeInTheDocument();
  });

  it("leads with the work behind the camera for directors", async () => {
    mockApi({
      "person/525": personDetail({
        id: 525,
        name: "Christopher Nolan",
        known_for_department: "Directing",
        movies: [media({ id: 7, title: "Cameo" })],
        directed: [media({ id: 27205, title: "Inception" })],
        written: [media({ id: 27205, title: "Inception" })],
      }),
    });
    renderRoute("/person/525/christopher-nolan");

    await screen.findByRole("heading", { level: 1, name: "Christopher Nolan" });
    const rows = screen.getAllByRole("region").map((region) => region.getAttribute("aria-label"));
    expect(rows).toEqual(["Directed", "Written", "Movies"]);
    const directed = screen.getByRole("region", { name: "Directed" });
    expect(within(directed).getByRole("link", { name: /Inception/ })).toHaveAttribute("href", "/movie/27205/inception");
  });
});

describe("SearchPage", () => {
  it("searches from the navbar and paginates", async () => {
    mockApi({
      ...homeApi(),
      "search?q=tom&page=1": page([media({ title: "Tomb Raider" }), person()], { total_pages: 2, total_results: 30 }),
      "search?q=tom&page=2": page([media({ id: 99, title: "Tombstone" })], { page: 2, total_pages: 2, total_results: 30 }),
    });
    const { router } = renderRoute("/");

    await userEvent.type(await screen.findByRole("combobox", { name: /Search/ }), "tom{Enter}");
    expect(await screen.findByRole("link", { name: /Tomb Raider/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tom Hanks/ })).toHaveAttribute("href", "/person/31/tom-hanks");
    expect(screen.getByText("30 results")).toBeInTheDocument();
    expect(router.state.location.search).toBe("?q=tom");

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByRole("link", { name: /Tombstone/ })).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("suggests results while typing and opens one with the keyboard", async () => {
    mockApi({
      ...homeApi(),
      "search?q=tom&page=1": page([media({ id: 13, title: "Forrest Gump" }), person()]),
    });
    const { router } = renderRoute("/");

    await userEvent.type(await screen.findByRole("combobox", { name: /Search/ }), "tom");
    const list = await screen.findByRole("listbox", { name: "Suggestions" });
    expect(await within(list).findByRole("option", { name: /Tom Hanks/ })).toBeInTheDocument();
    expect(within(list).getByRole("option", { name: /See all results for “tom”/ })).toBeInTheDocument();

    await userEvent.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(router.state.location.pathname).toBe("/movie/13/forrest-gump"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("does not suggest anything for a single character", async () => {
    const fetchMock = mockApi(homeApi());
    renderRoute("/");

    await userEvent.type(await screen.findByRole("combobox", { name: /Search/ }), "t");
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("search"))).toBe(false);
  });

  it("prompts for a query when there is none", async () => {
    mockApi({});
    renderRoute("/search");
    expect(await screen.findByText(/Search for movies, TV shows and people/)).toBeInTheDocument();
  });
});

describe("routing", () => {
  it("shows a 404 page for unknown URLs", async () => {
    mockApi({});
    renderRoute("/does/not/exist");
    await waitFor(() => expect(screen.getByText("We couldn't find that page.")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  });
});
