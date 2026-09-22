import { describe, expect, it } from "vitest";
import { formatRating, formatRuntime, imageUrl, mediaHref, personHref, slugify, year } from "./tmdb";

describe("tmdb helpers", () => {
  it("builds image urls and returns null without a path", () => {
    expect(imageUrl("/a.jpg", "w342")).toBe("https://image.tmdb.org/t/p/w342/a.jpg");
    expect(imageUrl(null, "w342")).toBeNull();
  });

  it("slugifies titles with accents and symbols", () => {
    expect(slugify("Amélie: Le Fabuleux Destin!")).toBe("amelie-le-fabuleux-destin");
    expect(slugify("  Spider-Man   2 ")).toBe("spider-man-2");
  });

  it("keeps the /tv-show prefix for TV links", () => {
    expect(mediaHref("movie", 1, "Inception")).toBe("/movie/1/inception");
    expect(mediaHref("tv", 1396, "Breaking Bad")).toBe("/tv-show/1396/breaking-bad");
    expect(personHref(31, "Tom Hanks")).toBe("/person/31/tom-hanks");
  });

  it("formats runtime, rating and year", () => {
    expect(formatRuntime(148)).toBe("2h 28m");
    expect(formatRuntime(120)).toBe("2h");
    expect(formatRuntime(45)).toBe("45m");
    expect(formatRuntime(null)).toBeNull();
    expect(formatRating(8.44)).toBe("8.4");
    expect(formatRating(0)).toBeNull();
    expect(year("2010-07-15")).toBe("2010");
    expect(year("")).toBeNull();
  });
});
