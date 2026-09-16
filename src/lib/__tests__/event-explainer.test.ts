import { describe, expect, it } from "vitest";
import {
  explainMacroEvent,
  plainImpactLabel,
  plainRegionLabel,
} from "@/lib/macro/event-explainer";

describe("explainMacroEvent (newbie-friendly)", () => {
  it("gives CPI a plain title without trader slang", () => {
    const e = explainMacroEvent("CPI y/y");
    expect(e.simpleTitle.toLowerCase()).toContain("inflation");
    expect(e.whatItIs.toLowerCase()).toMatch(/price|expensive|cost/);
    expect(e.whyItMatters.toLowerCase()).not.toMatch(
      /\bhawkish\b|\bdovish\b|\bfx\b|\bequities\b|\brisk-?on\b/,
    );
  });

  it("explains Fed rate decision in everyday words", () => {
    const e = explainMacroEvent("Fed Interest Rate Decision");
    expect(e.simpleTitle.toLowerCase()).toMatch(/interest|borrowing/);
    expect(e.whyItMatters.toLowerCase()).toMatch(/stock|currency|borrow/);
  });

  it("maps regions and impact labels plainly", () => {
    expect(plainRegionLabel("USD")).toBe("United States");
    expect(plainImpactLabel("high")).toMatch(/big/i);
    expect(plainImpactLabel("medium")).toMatch(/watch/i);
  });
});
