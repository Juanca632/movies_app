import { describe, expect, it } from "vitest";
import { providerSearchUrl } from "./providerLinks";

describe("providerSearchUrl", () => {
  it("builds an encoded search for verified services", () => {
    expect(providerSearchUrl({ provider_id: 8, provider_name: "Netflix" }, "Spider-Man: No Way Home")).toBe("https://www.netflix.com/search?q=Spider-Man%3A%20No%20Way%20Home");
    expect(providerSearchUrl({ provider_id: 119, provider_name: "Amazon Prime Video" }, "Dune & Co")).toBe("https://www.primevideo.com/search?phrase=Dune%20%26%20Co");
  });

  it("sends every Amazon channel to Prime Video", () => {
    expect(providerSearchUrl({ provider_id: 2032, provider_name: "Universal+ Amazon Channel" }, "Moana")).toBe(
      "https://www.primevideo.com/search?phrase=Moana",
    );
  });

  it("returns null for services without a verified search", () => {
    expect(providerSearchUrl({ provider_id: 337, provider_name: "Disney Plus" }, "Moana")).toBeNull();
  });
});
