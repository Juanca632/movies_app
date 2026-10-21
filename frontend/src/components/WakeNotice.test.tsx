import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryClient, persistOptions } from "../api/queries";
import WakeNotice from "./WakeNotice";

const NOTICE = /waking up the server/i;

/** A query that answers when `resolve` is called, like a backend that is still booting. */
function deferred() {
  let resolve: (value: string) => void = () => {};
  const promise = new Promise<string>((done) => (resolve = done));
  return { promise, resolve };
}

function Probe({ queryKey, fn, persist }: { queryKey: string[]; fn: () => Promise<string>; persist?: boolean }) {
  useQuery({ queryKey, queryFn: fn, meta: persist ? { persist: true } : undefined });
  return null;
}

describe("WakeNotice", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("says the server is waking up while a skeleton waits, until something answers", async () => {
    const client = createQueryClient();
    const slow = deferred();
    render(
      <QueryClientProvider client={client}>
        <Probe queryKey={["media", "movie", "popular"]} fn={() => slow.promise} />
        <WakeNotice />
      </QueryClientProvider>,
    );

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText(NOTICE)).toBeNull();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText(NOTICE)).toBeInTheDocument();

    await act(async () => slow.resolve("ok"));
    expect(screen.queryByText(NOTICE)).toBeNull();
  });

  it("stays quiet when the last visit's lists are already on screen", () => {
    const client = createQueryClient();
    client.setQueryDefaults(["media", "movie", "popular"], { meta: { persist: true } });
    client.setQueryData(["media", "movie", "popular"], "restored");
    render(
      <QueryClientProvider client={client}>
        {/* The account and a side lookup (the hero's trailer) still wait; neither has a skeleton. */}
        <Probe queryKey={["me"]} fn={() => deferred().promise} />
        <Probe queryKey={["media", "movie", "detail", "1"]} fn={() => deferred().promise} />
        <WakeNotice />
      </QueryClientProvider>,
    );

    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByText(NOTICE)).toBeNull();
  });
});

describe("persistOptions", () => {
  it("saves only successful queries marked to persist", async () => {
    const client = createQueryClient();
    client.setQueryDefaults(["media", "movie", "popular"], { meta: { persist: true } });
    client.setQueryData(["media", "movie", "popular"], "list");
    client.setQueryData(["me", "favorite"], "private");

    const saved = client.getQueryCache().getAll().filter(persistOptions.dehydrateOptions.shouldDehydrateQuery);
    expect(saved.map((query) => query.queryKey)).toEqual([["media", "movie", "popular"]]);
  });
});
