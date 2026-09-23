import { describe, expect, it } from "vitest";
import { detectRegion } from "./region";

describe("detectRegion", () => {
  it("takes the country from the first language that names one", () => {
    expect(detectRegion(["es-CO", "en-US"])).toBe("CO");
    expect(detectRegion(["es", "es-MX"])).toBe("MX");
  });

  it("guesses the likely country of a bare language", () => {
    expect(detectRegion(["es"])).toBe("ES");
  });

  it("skips regions that are not countries and falls back to US", () => {
    expect(detectRegion(["es-419", "pt-BR"])).toBe("BR");
    expect(detectRegion([])).toBe("US");
    expect(detectRegion(["not a locale"])).toBe("US");
  });
});
