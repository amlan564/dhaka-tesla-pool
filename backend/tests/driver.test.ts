import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";

describe("Driver Management", () => {
  let driverToken: string;
  let passengerToken: string;
  let rideId: string;

  it("should login the driver", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "jashim.tesla.pool@gmail.com",
      password: "Password123!",
    });

    expect(response.status).toBe(200);

    driverToken = response.body.data.token;

    expect(driverToken).toEqual(expect.any(String));
  });

  it("should login the passenger", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "rafiq.tesla.pool@gmail.com",
      password: "Password123!",
    });

    expect(response.status).toBe(200);

    passengerToken = response.body.data.token;

    expect(passengerToken).toEqual(expect.any(String));
  });

  it("should allow the driver to go online", async () => {
    const response = await request(app)
      .patch("/api/driver/vehicle/status")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        status: "ONLINE",
      });

    expect(response.status).toBe(200);
    expect(response.body.vehicle.status).toBe("ONLINE");
  });

  it("should allow the driver to see pending rides", async () => {
    const response = await request(app)
      .get("/api/driver/rides/requests")
      .set("Authorization", `Bearer ${driverToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.rides)).toBe(true);
  });

  it("should create a ride for the passenger", async () => {
    const response = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        pickupZone: "Banani",
        destinationZone: "Mohakhali",
        requestedSeats: 1,
      });

    expect(response.status).toBe(201);
    expect(response.body.ride.status).toBe("REQUESTED");

    rideId = response.body.ride.id;
  });

  it("should allow the driver to accept the ride", async () => {
    const response = await request(app)
      .patch(`/api/driver/rides/${rideId}/accept`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(response.status).toBe(200);
    expect(response.body.ride.status).toBe("MATCHED");
  });

  it("should show the current pool", async () => {
    const response = await request(app)
      .get("/api/driver/pool")
      .set("Authorization", `Bearer ${driverToken}`);

    expect(response.status).toBe(200);
    expect(response.body.pool).toBeDefined();
    expect(response.body.pool.members.length).toBeGreaterThan(0);
  });

  it("should move the ride to DRIVER_ARRIVED", async () => {
    const response = await request(app)
      .patch(`/api/driver/rides/${rideId}/status`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        status: "DRIVER_ARRIVED",
      });

    expect(response.status).toBe(200);
    expect(response.body.ride.status).toBe("DRIVER_ARRIVED");
  });

  it("should move the ride to STARTED", async () => {
    const response = await request(app)
      .patch(`/api/driver/rides/${rideId}/status`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        status: "STARTED",
      });

    expect(response.status).toBe(200);
    expect(response.body.ride.status).toBe("STARTED");
  });

  it("should move the ride to COMPLETED", async () => {
    const response = await request(app)
      .patch(`/api/driver/rides/${rideId}/status`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        status: "COMPLETED",
      });

    expect(response.status).toBe(200);
    expect(response.body.ride.status).toBe("COMPLETED");
  });

  it("should reject invalid driver state transitions", async () => {
    const response = await request(app)
      .patch(`/api/driver/rides/${rideId}/status`)
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        status: "STARTED",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Invalid ride status transition");
  });

  it("should reject passenger access to driver endpoints", async () => {
    const response = await request(app)
      .get("/api/driver/rides/requests")
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(403);
  });
});
