import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";

describe("Health Check", () => {
  it("should return API health status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      status: "ok",
      message: "Dhaka Tesla Pool API is running",
    });
  });
});

describe("Authentication", () => {
  it("should register a new passenger successfully", async () => {
    const uniqueEmail = `test-${Date.now()}@example.com`;

    const response = await request(app).post("/api/auth/register").send({
      fullName: "Test Passenger",
      email: uniqueEmail,
      password: "Password123!",
    });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Registration successful");

    expect(response.body.data.user).toMatchObject({
      fullName: "Test Passenger",
      email: uniqueEmail,
      role: "PASSENGER",
    });

    expect(response.body.data.token).toEqual(expect.any(String));
  });

  it("should reject duplicate registration", async () => {
    const uniqueEmail = `duplicate-${Date.now()}@example.com`;

    const firstResponse = await request(app).post("/api/auth/register").send({
      fullName: "Duplicate Test",
      email: uniqueEmail,
      password: "Password123!",
    });

    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(app).post("/api/auth/register").send({
      fullName: "Duplicate Test",
      email: uniqueEmail,
      password: "Password123!",
    });

    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body.message).toBe("Email already registered");
  });

  it("should reject invalid registration data", async () => {
    const response = await request(app).post("/api/auth/register").send({
      fullName: "A",
      email: "invalid-email",
      password: "123",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
    expect(response.body.errors).toBeInstanceOf(Array);
  });

  it("should login a passenger successfully", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "nusrat.tesla.pool@gmail.com",
      password: "Password123!",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login successful");

    expect(response.body.data.user).toMatchObject({
      fullName: "Nusrat",
      email: "nusrat.tesla.pool@gmail.com",
      role: "PASSENGER",
    });

    expect(response.body.data.token).toEqual(expect.any(String));
  });

  it("should login the driver successfully", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "jashim.tesla.pool@gmail.com",
      password: "Password123!",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login successful");

    expect(response.body.data.user).toMatchObject({
      fullName: "Jashim",
      email: "jashim.tesla.pool@gmail.com",
      role: "DRIVER",
    });

    expect(response.body.data.token).toEqual(expect.any(String));
  });

  it("should reject login with an incorrect password", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "nusrat.tesla.pool@gmail.com",
      password: "WrongPassword",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email or password");
  });

  it("should reject login for an unknown email", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "unknown@example.com",
      password: "Password123!",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email or password");
  });
});
