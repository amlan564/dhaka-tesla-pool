import "dotenv/config";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import app from "../src/app.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

describe("Pooling and Concurrency", () => {
  let driverToken: string;
  let nusratToken: string;
  let rafiqToken: string;
  let shirinToken: string;

  async function login(email: string) {
    const response = await request(app).post("/api/auth/login").send({
      email,
      password: "Password123!",
    });

    expect(response.status).toBe(200);

    return response.body.data.token;
  }

  beforeAll(async () => {
    driverToken = await login("jashim.tesla.pool@gmail.com");
    nusratToken = await login("nusrat.tesla.pool@gmail.com");
    rafiqToken = await login("rafiq.tesla.pool@gmail.com");
    shirinToken = await login("shirin.tesla.pool@gmail.com");
  });

  beforeEach(async () => {
    await prisma.poolMember.deleteMany();

    await prisma.rideStatusHistory.deleteMany();

    await prisma.rideRequest.deleteMany();

    await prisma.pool.deleteMany();

    await prisma.vehicle.updateMany({
      data: {
        status: "OFFLINE",
        occupiedSeats: 0,
      },
    });
  });

  afterAll(async () => {
    await prisma.poolMember.deleteMany();

    await prisma.rideStatusHistory.deleteMany();

    await prisma.rideRequest.deleteMany();

    await prisma.pool.deleteMany();

    await prisma.vehicle.updateMany({
      data: {
        status: "OFFLINE",
        occupiedSeats: 0,
      },
    });

    await prisma.$disconnect();
  });

  it("should login all demo users", () => {
    expect(driverToken).toEqual(expect.any(String));
    expect(nusratToken).toEqual(expect.any(String));
    expect(rafiqToken).toEqual(expect.any(String));
    expect(shirinToken).toEqual(expect.any(String));
  });

  it("should keep the Tesla capacity within 3 seats", async () => {
    const onlineResponse = await request(app)
      .patch("/api/driver/vehicle/status")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        status: "ONLINE",
      });

    expect(onlineResponse.status).toBe(200);

    const nusratRide = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${nusratToken}`)
      .send({
        pickupZone: "Banani",
        destinationZone: "Mohakhali",
        requestedSeats: 1,
      });

    const rafiqRide = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${rafiqToken}`)
      .send({
        pickupZone: "Banani",
        destinationZone: "Mohakhali",
        requestedSeats: 1,
      });

    const shirinRide = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${shirinToken}`)
      .send({
        pickupZone: "Banani",
        destinationZone: "Mohakhali",
        requestedSeats: 1,
      });

    expect(nusratRide.status).toBe(201);
    expect(rafiqRide.status).toBe(201);
    expect(shirinRide.status).toBe(201);

    const firstAccept = await request(app)
      .patch(`/api/driver/rides/${nusratRide.body.ride.id}/accept`)
      .set("Authorization", `Bearer ${driverToken}`);

    const secondAccept = await request(app)
      .patch(`/api/driver/rides/${rafiqRide.body.ride.id}/accept`)
      .set("Authorization", `Bearer ${driverToken}`);

    const thirdAccept = await request(app)
      .patch(`/api/driver/rides/${shirinRide.body.ride.id}/accept`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(firstAccept.status).toBe(200);
    expect(secondAccept.status).toBe(200);
    expect(thirdAccept.status).toBe(200);

    const poolResponse = await request(app)
      .get("/api/driver/pool")
      .set("Authorization", `Bearer ${driverToken}`);

    expect(poolResponse.status).toBe(200);
    expect(poolResponse.body.pool).toBeDefined();

    const pool = poolResponse.body.pool;

    const occupiedSeats = pool.members.reduce(
      (total: number, member: { seats: number }) => total + member.seats,
      0,
    );

    expect(pool.members).toHaveLength(3);
    expect(occupiedSeats).toBe(3);
    expect(occupiedSeats).toBeLessThanOrEqual(3);
  });

  it("should reject a fourth passenger when the Tesla has no remaining seats", async () => {
    const onlineResponse = await request(app)
      .patch("/api/driver/vehicle/status")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        status: "ONLINE",
      });

    expect(onlineResponse.status).toBe(200);

    const rides = await Promise.all([
      request(app)
        .post("/api/rides")
        .set("Authorization", `Bearer ${nusratToken}`)
        .send({
          pickupZone: "Banani",
          destinationZone: "Mohakhali",
          requestedSeats: 1,
        }),

      request(app)
        .post("/api/rides")
        .set("Authorization", `Bearer ${rafiqToken}`)
        .send({
          pickupZone: "Banani",
          destinationZone: "Mohakhali",
          requestedSeats: 1,
        }),

      request(app)
        .post("/api/rides")
        .set("Authorization", `Bearer ${shirinToken}`)
        .send({
          pickupZone: "Banani",
          destinationZone: "Mohakhali",
          requestedSeats: 1,
        }),
    ]);

    expect(rides[0].status).toBe(201);
    expect(rides[1].status).toBe(201);
    expect(rides[2].status).toBe(201);

    for (const ride of rides) {
      const acceptResponse = await request(app)
        .patch(`/api/driver/rides/${ride.body.ride.id}/accept`)
        .set("Authorization", `Bearer ${driverToken}`);

      expect(acceptResponse.status).toBe(200);
    }

    const fourthRide = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${nusratToken}`)
      .send({
        pickupZone: "Banani",
        destinationZone: "Mohakhali",
        requestedSeats: 1,
      });

    expect(fourthRide.status).toBe(201);

    const acceptResponse = await request(app)
      .patch(`/api/driver/rides/${fourthRide.body.ride.id}/accept`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(acceptResponse.status).toBe(400);

    expect(acceptResponse.body.message).toContain("Not enough seats available");
  });

  it("should prevent overbooking when two passengers accept the last seat concurrently", async () => {
    const onlineResponse = await request(app)
      .patch("/api/driver/vehicle/status")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        status: "ONLINE",
      });

    expect(onlineResponse.status).toBe(200);

    const firstRide = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${nusratToken}`)
      .send({
        pickupZone: "Banani",
        destinationZone: "Mohakhali",
        requestedSeats: 2,
      });

    expect(firstRide.status).toBe(201);

    const firstAccept = await request(app)
      .patch(`/api/driver/rides/${firstRide.body.ride.id}/accept`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(firstAccept.status).toBe(200);
    expect(firstAccept.body.ride.requestedSeats).toBe(2);

    const secondRide = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${rafiqToken}`)
      .send({
        pickupZone: "Banani",
        destinationZone: "Mohakhali",
        requestedSeats: 1,
      });

    const thirdRide = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${shirinToken}`)
      .send({
        pickupZone: "Banani",
        destinationZone: "Mohakhali",
        requestedSeats: 1,
      });

    expect(secondRide.status).toBe(201);
    expect(thirdRide.status).toBe(201);

    const secondRideId = secondRide.body.ride.id;
    const thirdRideId = thirdRide.body.ride.id;

    const [secondAccept, thirdAccept] = await Promise.all([
      request(app)
        .patch(`/api/driver/rides/${secondRideId}/accept`)
        .set("Authorization", `Bearer ${driverToken}`),

      request(app)
        .patch(`/api/driver/rides/${thirdRideId}/accept`)
        .set("Authorization", `Bearer ${driverToken}`),
    ]);

    const responses = [secondAccept, thirdAccept];

    const successfulResponses = responses.filter(
      (response) => response.status === 200,
    );

    const rejectedResponses = responses.filter(
      (response) => response.status === 400,
    );

    expect(successfulResponses).toHaveLength(1);
    expect(rejectedResponses).toHaveLength(1);

    expect(rejectedResponses[0].body.message).toContain(
      "Not enough seats available",
    );

    const poolResponse = await request(app)
      .get("/api/driver/pool")
      .set("Authorization", `Bearer ${driverToken}`);

    expect(poolResponse.status).toBe(200);
    expect(poolResponse.body.pool).toBeDefined();

    const pool = poolResponse.body.pool;

    const occupiedSeats = pool.members.reduce(
      (total: number, member: { seats: number }) => total + member.seats,
      0,
    );

    expect(occupiedSeats).toBe(3);
    expect(occupiedSeats).toBeLessThanOrEqual(3);
  });

  it("should cancel one passenger without cancelling the other pooled passenger", async () => {
    const onlineResponse = await request(app)
      .patch("/api/driver/vehicle/status")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        status: "ONLINE",
      });

    expect(onlineResponse.status).toBe(200);

    const nusratRide = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${nusratToken}`)
      .send({
        pickupZone: "Banani",
        destinationZone: "Mohakhali",
        requestedSeats: 1,
      });

    const rafiqRide = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${rafiqToken}`)
      .send({
        pickupZone: "Banani",
        destinationZone: "Gulshan",
        requestedSeats: 1,
      });

    expect(nusratRide.status).toBe(201);
    expect(rafiqRide.status).toBe(201);

    const nusratAccept = await request(app)
      .patch(`/api/driver/rides/${nusratRide.body.ride.id}/accept`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(nusratAccept.status).toBe(200);

    const rafiqAccept = await request(app)
      .patch(`/api/driver/rides/${rafiqRide.body.ride.id}/accept`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(rafiqAccept.status).toBe(200);

    const cancelResponse = await request(app)
      .patch(`/api/rides/${nusratRide.body.ride.id}/cancel`)
      .set("Authorization", `Bearer ${nusratToken}`);

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.message).toBe("Ride cancelled successfully");
    expect(cancelResponse.body.ride.status).toBe("CANCELLED");

    const rafiqResponse = await request(app)
      .get(`/api/rides/${rafiqRide.body.ride.id}`)
      .set("Authorization", `Bearer ${rafiqToken}`);

    expect(rafiqResponse.status).toBe(200);
    expect(rafiqResponse.body.ride.status).toBe("MATCHED");

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        driverId: (
          await prisma.user.findUniqueOrThrow({
            where: {
              email: "jashim.tesla.pool@gmail.com",
            },
          })
        ).id,
      },
    });

    expect(vehicle?.occupiedSeats).toBe(1);

    const poolResponse = await request(app)
      .get("/api/driver/pool")
      .set("Authorization", `Bearer ${driverToken}`);

    expect(poolResponse.status).toBe(200);
    expect(poolResponse.body.pool).toBeDefined();
    expect(poolResponse.body.pool.members).toHaveLength(1);
    expect(poolResponse.body.pool.members[0].rideRequestId).toBe(
      rafiqRide.body.ride.id,
    );
  });

  it("should cancel the pool when the last passenger cancels", async () => {
    const onlineResponse = await request(app)
      .patch("/api/driver/vehicle/status")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        status: "ONLINE",
      });

    expect(onlineResponse.status).toBe(200);

    const rideResponse = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${nusratToken}`)
      .send({
        pickupZone: "Banani",
        destinationZone: "Mohakhali",
        requestedSeats: 1,
      });

    expect(rideResponse.status).toBe(201);

    const rideId = rideResponse.body.ride.id;

    const acceptResponse = await request(app)
      .patch(`/api/driver/rides/${rideId}/accept`)
      .set("Authorization", `Bearer ${driverToken}`);

    expect(acceptResponse.status).toBe(200);

    const cancelResponse = await request(app)
      .patch(`/api/rides/${rideId}/cancel`)
      .set("Authorization", `Bearer ${nusratToken}`);

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.ride.status).toBe("CANCELLED");

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        driverId: (
          await prisma.user.findUniqueOrThrow({
            where: {
              email: "jashim.tesla.pool@gmail.com",
            },
          })
        ).id,
      },
    });

    expect(vehicle?.occupiedSeats).toBe(0);

    const pool = await prisma.pool.findFirst({
      include: {
        members: true,
      },
    });

    expect(pool).toBeDefined();
    expect(pool?.status).toBe("CANCELLED");
    expect(pool?.members).toHaveLength(0);
  });
});
