import { describe, expect, it } from "vitest";
import { areRoutesCompatible } from "../src/services/matching.service.js";

describe("Route Matching", () => {
  it("should allow identical routes", () => {
    const result = areRoutesCompatible(
      "Banani",
      "Mohakhali",
      "Banani",
      "Mohakhali",
    );

    console.log("Matching result:", result);

    expect(result).toBe(true);
  });

  it("should allow compatible destinations from the same pickup zone", () => {
    const result = areRoutesCompatible(
      "Banani",
      "Mohakhali",
      "Banani",
      "Gulshan",
    );

    console.log("Compatible result:", result);

    expect(result).toBe(true);
  });

  it("should reject different pickup zones", () => {
    const result = areRoutesCompatible(
      "Banani",
      "Mohakhali",
      "Gulshan",
      "Mohakhali",
    );

    console.log("Different pickup result:", result);

    expect(result).toBe(false);
  });
});
