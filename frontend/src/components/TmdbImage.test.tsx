import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TmdbImage from "./TmdbImage";

describe("TmdbImage", () => {
  it("renders the TMDB image when there is a path", () => {
    render(<TmdbImage path="/poster.jpg" size="w342" alt="Inception poster" />);
    expect(screen.getByRole("img", { name: "Inception poster" })).toHaveAttribute("src", "https://image.tmdb.org/t/p/w342/poster.jpg");
  });

  it("keeps the fallback's screen-reader label inside its own box", () => {
    // The label is absolutely positioned; if its box is not a containing block it escapes
    // scrolling rows and mobile browsers zoom the page out to fit it (layout checked in a browser).
    render(<TmdbImage path={null} size="w185" alt="Unknown actor" />);
    const label = screen.getByText("Unknown actor");
    expect(label).toHaveClass("sr-only");
    expect(label.parentElement).toHaveClass("relative");
  });
});
