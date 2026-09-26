import { screen, waitForElementToBeRemoved, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AssistantEvent } from "../api/types";
import { forgetChat } from "../lib/chat";
import { media } from "../test-utils/fixtures";
import { mockApi, renderRoute } from "../test-utils/render";

const NETFLIX = { provider_id: 8, provider_name: "Netflix", logo_path: "/netflix.png" };
const NETFLIX_ADS = { provider_id: 1796, provider_name: "Netflix Standard with Ads", logo_path: "/ads.png" };

/** A Server-Sent Events response, split in awkward chunks like a real network would. */
function stream(events: AssistantEvent[]) {
  const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
  const chunks = [body.slice(0, 10), body.slice(10, 50), body.slice(50)];
  const encoder = new TextEncoder();
  return () =>
    new Response(
      new ReadableStream({
        start(controller) {
          chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
          controller.close();
        },
      }),
      { headers: { "content-type": "text/event-stream" } },
    );
}

// The panel is a dialog over the page (on phones, and in jsdom, a modal bottom sheet).
const panel = () => screen.findByRole("dialog", { name: "Ask AI" });

type FetchMock = ReturnType<typeof vi.fn>;

/** The JSON bodies POSTed to /ask, in order. */
const questionsSent = (fetchMock: FetchMock) =>
  fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/ask")).map(([, init]) => JSON.parse((init as RequestInit).body as string));

/** /ask answers with each response in turn. */
const answers = (...responses: (() => Response)[]) => {
  let next = 0;
  return () => responses[Math.min(next++, responses.length - 1)]();
};

const COMEDY_ANSWER = stream([
  { type: "status", text: "Searching comedy movies on Netflix" },
  {
    type: "answer",
    intro: "Two quick laughs for tonight.",
    picks: [
      { item: media({ id: 7, title: "Funny Film" }), reason: "Only 90 minutes of jokes.", providers: [NETFLIX, NETFLIX_ADS] },
      { item: media({ id: 8, title: "Old Gem", media_type: "tv" }), reason: "A classic.", providers: [] },
    ],
  },
]);
const RECENT_ANSWER = stream([
  { type: "answer", intro: "Newer ones.", picks: [{ item: media({ id: 9, title: "Fresh Laughs" }), reason: "From this year.", providers: [] }] },
]);

async function askInPanel(dialog: HTMLElement, question: string) {
  await userEvent.type(within(dialog).getByRole("textbox", { name: "Your request" }), question);
  await userEvent.click(within(dialog).getByRole("button", { name: "Ask" }));
}

describe("AI assistant", () => {
  it("opens from the navbar on any page and shows the picks with where to stream them", async () => {
    const fetchMock = mockApi({ ask: COMEDY_ANSWER });
    const { router } = renderRoute("/calendar");

    // The first one is the navbar's; the other is the phone tab bar's.
    const [navbarButton] = await screen.findAllByRole("button", { name: "Ask AI", expanded: false });
    await userEvent.click(navbarButton);
    const dialog = await panel();
    expect(within(dialog).getByRole("textbox", { name: "Your request" })).toHaveFocus();
    await askInPanel(dialog, "a short comedy");

    expect(await within(dialog).findByText("Two quick laughs for tonight.")).toBeInTheDocument();
    // It opened over the calendar, which is still the page underneath.
    expect(router.state.location.pathname).toBe("/calendar");
    expect(questionsSent(fetchMock)).toEqual([{ question: "a short comedy", region: "US", history: [] }]);

    const pickCard = (title: string) => within(dialog).getByRole("link", { name: title }).closest("li")!;
    const funny = pickCard("Funny Film");
    expect(within(funny).getByRole("link", { name: "Funny Film" })).toHaveAttribute("href", "/movie/7/funny-film");
    expect(within(funny).getByText("Only 90 minutes of jokes.")).toBeInTheDocument();
    // The ad tier is the same service: only one logo.
    expect(within(funny).getAllByRole("img").map((img) => img.getAttribute("alt"))).toEqual(["Netflix"]);
    expect(within(pickCard("Old Gem")).getByText("Not on a streaming subscription in US.")).toBeInTheDocument();
  });

  it("is a conversation: follow-ups send a recap of the earlier turns", async () => {
    const fetchMock = mockApi({ ask: answers(COMEDY_ANSWER, RECENT_ANSWER) });
    renderRoute("/calendar?ask=");
    const dialog = await panel();

    await askInPanel(dialog, "a short comedy");
    await within(dialog).findByText("Two quick laughs for tonight.");
    await askInPanel(dialog, "more recent ones");

    expect(await within(dialog).findByText("Newer ones.")).toBeInTheDocument();
    // Both turns stay on screen, in order.
    expect(within(dialog).getAllByRole("article").map((turn) => turn.getAttribute("aria-label"))).toEqual(["a short comedy", "more recent ones"]);
    expect(questionsSent(fetchMock)[1]).toEqual({
      question: "more recent ones",
      region: "US",
      history: [
        {
          question: "a short comedy",
          picks: [
            { media_type: "movie", id: 7, title: "Funny Film" },
            { media_type: "tv", id: 8, title: "Old Gem" },
          ],
        },
      ],
    });
  });

  it("keeps the chat after closing the panel and reloading, until a new chat starts", async () => {
    mockApi({ ask: COMEDY_ANSWER });
    const first = renderRoute("/calendar?ask=");
    await askInPanel(await panel(), "a short comedy");
    await screen.findByText("Two quick laughs for tonight.");
    first.unmount();

    // A "reload": nothing in memory, only what the browser stored.
    forgetChat();
    renderRoute("/calendar?ask=");
    const dialog = await panel();
    expect(within(dialog).getByText("Two quick laughs for tonight.")).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "New chat" }));
    expect(within(dialog).queryByText("Two quick laughs for tonight.")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Like Interstellar, on Netflix" })).toBeInTheDocument();
  });

  it("starts from the slim bar under the home banner", async () => {
    mockApi({ ask: COMEDY_ANSWER });
    const { router } = renderRoute("/");

    await userEvent.type(await screen.findByRole("textbox", { name: "Ask AI what to watch" }), "a short comedy{Enter}");

    expect(await within(await panel()).findByText("Two quick laughs for tonight.")).toBeInTheDocument();
    expect(router.state.location.search).toBe("?ask=");
  });

  it("is offered in the search box when the query reads like a request", async () => {
    const fetchMock = mockApi({ ask: COMEDY_ANSWER });
    renderRoute("/calendar");
    const search = await screen.findByRole("combobox", { name: "Search movies, TV shows and people" });

    await userEvent.type(search, "Inception");
    expect(screen.queryByRole("option", { name: /Ask AI/ })).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, "something funny tonight");
    const option = await screen.findByRole("option", { name: /Ask AI: “something funny tonight”/ });
    await userEvent.click(within(option).getByRole("button"));

    expect(await within(await panel()).findByText("Two quick laughs for tonight.")).toBeInTheDocument();
    expect(questionsSent(fetchMock)).toHaveLength(1);
  });

  it("asks a question that comes in a shared link, once", async () => {
    const fetchMock = mockApi({ ask: COMEDY_ANSWER });
    const { router } = renderRoute("/calendar?ask=a%20short%20comedy");

    expect(await within(await panel()).findByText("Two quick laughs for tonight.")).toBeInTheDocument();
    expect(router.state.location.search).toBe("?ask=");
    expect(questionsSent(fetchMock)).toHaveLength(1);
  });

  it("asks one of the examples, and closes keeping the page", async () => {
    mockApi({ ask: stream([{ type: "answer", intro: "Space epics ahead.", picks: [] }]) });
    const { router } = renderRoute("/calendar?ask=");

    const dialog = await panel();
    await userEvent.click(within(dialog).getByRole("button", { name: "Like Interstellar, on Netflix" }));
    expect(await within(dialog).findByText("Space epics ahead.")).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitForElementToBeRemoved(dialog); // after its exit animation
    expect(router.state.location.pathname).toBe("/calendar");
    expect(router.state.location.search).toBe("");
  });

  it("closes with Escape", async () => {
    mockApi({});
    renderRoute("/calendar?ask=");

    const dialog = await panel();
    await userEvent.keyboard("{Escape}");

    await waitForElementToBeRemoved(dialog);
  });

  it("explains when the visitor has asked too much", async () => {
    mockApi({ ask: () => Response.json({ detail: "Too many questions for now. Try again in a while." }, { status: 429 }) });
    renderRoute("/calendar?ask=again");

    expect(await within(await panel()).findByRole("alert")).toHaveTextContent("Too many questions for now.");
  });

  it("shows errors the assistant streams back, with a retry", async () => {
    const fetchMock = mockApi({
      ask: stream([
        { type: "status", text: "Looking up “Nothing”" },
        { type: "error", message: "That one was hard to answer. Try rephrasing it." },
      ]),
    });
    renderRoute("/calendar?ask=hard%20one");

    const dialog = await panel();
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("That one was hard to answer.");

    await userEvent.click(within(dialog).getByRole("button", { name: "Try again" }));
    await within(dialog).findByRole("alert");
    expect(questionsSent(fetchMock)).toHaveLength(2);
  });

  it("has a tab in the phone tab bar", async () => {
    mockApi({});
    renderRoute("/calendar");

    const tabBar = await screen.findByRole("navigation", { name: "Sections" });
    expect(within(tabBar).getAllByRole("link").map((link) => link.textContent)).toEqual(["Home", "Movies", "TV", "Calendar"]);

    await userEvent.click(within(tabBar).getByRole("button", { name: "Ask AI" }));
    expect(await panel()).toBeInTheDocument();
  });
});
