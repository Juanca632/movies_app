import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { SavedTitle } from "../api/types";
import { mediaDetail } from "../test-utils/fixtures";
import { mockApi, renderRoute } from "../test-utils/render";

const ANA = { name: "Ana", email: "ana@example.com", avatar_url: null };
const INCEPTION_PAGE = "/movie/1/inception";

const saved = (overrides: Partial<SavedTitle> = {}): SavedTitle => ({
  id: 1,
  media_type: "movie",
  title: "Inception",
  poster_path: "/poster.jpg",
  release_date: "2010-07-15",
  saved_at: "2026-09-30T10:00:00Z",
  ...overrides,
});

const signedOut = () => ({ me: () => new Response("Not signed in", { status: 401 }) });

/** A signed-in backend whose lists really change with PUT and DELETE. */
function signedIn(lists: { watchlist?: SavedTitle[]; favorite?: SavedTitle[] } = {}) {
  const state = { watchlist: lists.watchlist ?? [], favorite: lists.favorite ?? [] };
  const methods: string[] = [];
  const toggle = (kind: keyof typeof state) => (init?: RequestInit) => {
    methods.push(`${init?.method} ${kind}`);
    if (init?.method === "PUT") {
      state[kind] = [saved(), ...state[kind]];
      return Response.json(saved());
    }
    state[kind] = [];
    return new Response(null, { status: 204 });
  };
  return {
    methods,
    api: {
      me: ANA,
      "me/watchlist": () => Response.json(state.watchlist),
      "me/favorite": () => Response.json(state.favorite),
      "me/watchlist/movie/1": toggle("watchlist"),
      "me/favorite/movie/1": toggle("favorite"),
    },
  };
}

describe("accounts", () => {
  it("hides sign-in when the server has no accounts", async () => {
    mockApi({ "movie/1?region=US": mediaDetail() });
    renderRoute(INCEPTION_PAGE);

    await screen.findByRole("heading", { name: "Inception" });
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /My list/ })).not.toBeInTheDocument();
  });

  it("offers sign-in that comes back to the same page", async () => {
    mockApi({ ...signedOut(), "movie/1?region=US": mediaDetail() });
    renderRoute(INCEPTION_PAGE);

    const signIn = await screen.findByRole("link", { name: "Sign in" });
    expect(signIn).toHaveAttribute("href", "/api/v1/auth/google/login?next=%2Fmovie%2F1%2Finception");
    // Saving while signed out leads to sign-in as well.
    expect(screen.getByRole("link", { name: "My list" })).toHaveAttribute("href", signIn.getAttribute("href"));
  });

  it("saves and unsaves a title", async () => {
    const backend = signedIn();
    mockApi({ ...backend.api, "movie/1?region=US": mediaDetail() });
    renderRoute(INCEPTION_PAGE);

    const button = await screen.findByRole("button", { name: "My list" });
    await waitFor(() => expect(button).toBeEnabled());
    expect(button).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"));

    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "false"));
    expect(backend.methods).toEqual(["PUT watchlist", "DELETE watchlist"]);
    expect(screen.getByRole("button", { name: "Favorite" })).toHaveAttribute("aria-pressed", "false");
  });

  it("rolls back when saving fails", async () => {
    const backend = signedIn();
    mockApi({
      ...backend.api,
      "me/favorite/movie/1": () => new Response("boom", { status: 500 }),
      "movie/1?region=US": mediaDetail(),
    });
    renderRoute(INCEPTION_PAGE);

    const button = await screen.findByRole("button", { name: "Favorite" });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);

    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "false"));
  });

  it("shows the account menu and signs out", async () => {
    const backend = signedIn();
    let signedOutCalls = 0;
    mockApi({
      ...backend.api,
      "auth/logout": () => {
        signedOutCalls++;
        return new Response(null, { status: 204 });
      },
      "movie/1?region=US": mediaDetail(),
    });
    renderRoute(INCEPTION_PAGE);

    await userEvent.click(await screen.findByRole("button", { name: "Account: Ana" }));
    const menu = screen.getByRole("menu", { name: "Account" });
    expect(within(menu).getByText("ana@example.com")).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "My list" })).toHaveAttribute("href", "/my-list");

    await userEvent.click(within(menu).getByRole("menuitem", { name: "Sign out" }));
    const dialog = screen.getByRole("alertdialog", { name: "Sign out?" });
    expect(signedOutCalls).toBe(0);
    await userEvent.click(within(dialog).getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(signedOutCalls).toBe(1);
  });
});

describe("deleting the account", () => {
  const setup = () => {
    const methods: string[] = [];
    mockApi({
      ...signedIn().api,
      me: (init?: RequestInit) => {
        methods.push(init?.method ?? "GET");
        return init?.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json(ANA);
      },
      "movie/1?region=US": mediaDetail(),
    });
    renderRoute(INCEPTION_PAGE);
    return methods;
  };

  const openDialog = async () => {
    await userEvent.click(await screen.findByRole("button", { name: "Account: Ana" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete account" }));
    return screen.getByRole("alertdialog", { name: "Delete your account?" });
  };

  it("deletes it after confirming", async () => {
    const methods = setup();

    const dialog = await openDialog();
    // Cancel has the focus, so Enter right away is harmless.
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete account" }));

    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(methods).toContain("DELETE");
  });

  it("keeps it when cancelled, with the button or Escape", async () => {
    const methods = setup();

    await userEvent.click(within(await openDialog()).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await openDialog();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Account: Ana" })).toHaveFocus();
    expect(methods).not.toContain("DELETE");
  });

  it("stays open with a message when deleting fails", async () => {
    mockApi({
      ...signedIn().api,
      me: (init?: RequestInit) =>
        init?.method === "DELETE" ? new Response("boom", { status: 500 }) : Response.json(ANA),
      "movie/1?region=US": mediaDetail(),
    });
    renderRoute(INCEPTION_PAGE);

    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete account" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Couldn't delete your account");
    expect(screen.getByRole("button", { name: "Account: Ana" })).toBeInTheDocument();
  });
});

describe("PrivacyPage", () => {
  it("is linked from every page's footer", async () => {
    mockApi({ "movie/1?region=US": mediaDetail() });
    renderRoute(INCEPTION_PAGE);

    await userEvent.click(await screen.findByRole("link", { name: "Privacy" }));

    expect(await screen.findByRole("heading", { name: "Privacy", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Deleting your data" })).toBeInTheDocument();
  });
});

describe("MyListPage", () => {
  it("shows each list in its tab", async () => {
    mockApi(signedIn({ watchlist: [saved(), saved({ id: 2, media_type: "tv", title: "Dark" })] }).api);
    renderRoute("/my-list");

    expect(await screen.findByRole("link", { name: /Dark/ })).toHaveAttribute("href", "/tv-show/2/dark");
    expect(screen.getByRole("link", { name: /Inception/ })).toHaveAttribute("href", "/movie/1/inception");

    await userEvent.click(screen.getByRole("button", { name: "Favorites" }));
    expect(await screen.findByText(/Mark the ones you love/)).toBeInTheDocument();
  });

  it("asks to sign in when signed out", async () => {
    mockApi(signedOut());
    renderRoute("/my-list?tab=favorites");

    expect(await screen.findByRole("link", { name: "Sign in with Google" })).toHaveAttribute(
      "href",
      "/api/v1/auth/google/login?next=%2Fmy-list%3Ftab%3Dfavorites",
    );
  });
});
