import { describe, expect, it } from "vitest";
import { explainMacroEvent } from "@/lib/macro/event-explainer";

describe("explainMacroEvent", () => {
  it("explains CPI", () => {
    const e = explainMacroEvent("CPI y/y");
    expect(e.whatItIs.toLowerCase()).toContain("inflation");
    expect(e.whyItMatters.toLowerCase()).toMatch(/rate|hawkish|inflation/);
  });

  it("explains Fed rate decision", () => {
    const e = explainMacroEvent("Fed Interest Rate Decision");
    expect(e.whatItIs.toLowerCase()).toContain("central-bank");
    expect(e.whyItMatters.toLowerCase()).toMatch(/fx|equit/);
  });

  it("falls back for unknown titles", () => {
    const e = explainMacroEvent("Obscure Widget Index");
    expect(e.whatItIs.length).toBeGreaterThan(20);
    expect(e.whyItMatters.toLowerCase()).toContain("surprise");
  });
});
