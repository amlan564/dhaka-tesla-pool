import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";

describe("Ride Management", () => {
  let passengerToken: string;
  let otherPassengerToken: string;
  let driverToken: string;
  let rideId: string;

  it("should login the passenger", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "nusrat.tesla.pool@gmail.com",
      password: "Password123!",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login successful");
    expect(response.body.data.token).toEqual(expect.any(String));

    passengerToken = response.body.data.token;
  });

  it("should login another passenger", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "rafiq.tesla.pool@gmail.com",
      password: "Password123!",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toEqual(expect.any(String));

    otherPassengerToken = response.body.data.token;
  });

  it("should login the driver", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "jashim.tesla.pool@gmail.com",
      password: "Password123!",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login successful");
    expect(response.body.data.token).toEqual(expect.any(String));

    driverToken = response.body.data.token;
  });

  it("should create a ride request for a passenger", async () => {
    const response = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        pickupZone: "Banani",
        destinationZone: "Mohakhali",
        requestedSeats: 1,
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Ride request created successfully");
    expect(response.body.ride).toBeDefined();
    expect(response.body.ride.status).toBe("REQUESTED");

    rideId = response.body.ride.id;
  });

  it("should reject a driver trying to create a ride", async () => {
    const response = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        pickupZone: "Banani",
        destinationZone: "Mohakhali",
        requestedSeats: 1,
      });

    expect(response.status).toBe(403);
  });

  it("should reject the same pickup and destination", async () => {
    const response = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${passengerToken}`)
      .send({
        pickupZone: "Banani",
        destinationZone: "Banani",
        requestedSeats: 1,
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Pickup and destination cannot be the same",
    );
  });

  it("should return the passenger's rides", async () => {
    const response = await request(app)
      .get("/api/rides")
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.rides)).toBe(true);

    expect(
      response.body.rides.some((ride: { id: string }) => ride.id === rideId),
    ).toBe(true);
  });

  it("should return the passenger's ride details", async () => {
    const response = await request(app)
      .get(`/api/rides/${rideId}`)
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.ride.id).toBe(rideId);
  });

  it("should reject another passenger from cancelling the ride", async () => {
    const response = await request(app)
      .patch(`/api/rides/${rideId}/cancel`)
      .set("Authorization", `Bearer ${otherPassengerToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Ride request not found");
  });

  it("should cancel a requested ride", async () => {
    const response = await request(app)
      .patch(`/api/rides/${rideId}/cancel`)
      .set("Authorization", `Bearer ${passengerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Ride cancelled successfully");
    expect(response.body.ride.status).toBe("CANCELLED");
  });
});
