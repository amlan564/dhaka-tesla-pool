import { describe, expect, it } from "vitest";
import { calculateFare } from "../src/services/fare.service.js";

describe("calculateFare", () => {
  it("should calculate fare without discount for a solo passenger", () => {
    const fare = calculateFare("Banani", "Mohakhali", 1);

    expect(fare).toBe(9000);
  });

  it("should apply 10% discount for a 2-passenger pool", () => {
    const fare = calculateFare("Banani", "Mohakhali", 2);

    expect(fare).toBe(8100);
  });

  it("should apply 15% discount for a 3-passenger pool", () => {
    const fare = calculateFare("Banani", "Mohakhali", 3);

    expect(fare).toBe(7650);
  });

  it("should calculate different fares for different distances", () => {
    const shortTrip = calculateFare("Banani", "Mohakhali", 1);

    const longerTrip = calculateFare("Banani", "Uttara", 1);

    expect(longerTrip).toBeGreaterThan(shortTrip);
  });

  it("should reject pickup and destination being the same", () => {
    expect(() => calculateFare("Banani", "Banani", 1)).toThrow(
      "Pickup and destination cannot be the same",
    );
  });

  it("should reject an invalid pool size", () => {
    expect(() => calculateFare("Banani", "Mohakhali", 0)).toThrow(
      "Pool size must be between 1 and 3",
    );

    expect(() => calculateFare("Banani", "Mohakhali", 4)).toThrow(
      "Pool size must be between 1 and 3",
    );
  });

  it("should reject a route without a predefined distance", () => {
    expect(() => calculateFare("Uttara", "Dhanmondi", 1)).toThrow(
      "No predefined distance found for Uttara to Dhanmondi",
    );
  });
});
