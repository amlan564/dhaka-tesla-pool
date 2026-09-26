import type { Request, Response } from "express";
import { loginUser, registerUser } from "../services/auth.service";
import { loginSchema, registerSchema } from "../validators/auth.validator";

export async function register(req: Request, res: Response): Promise<void> {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Validation failed",
      errors: result.error.issues,
    });
    return;
  }

  try {
    const data = await registerUser(result.data);

    res.status(201).json({
      message: "Registration successful",
      data,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Email already registered"
    ) {
      res.status(409).json({
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Validation failed",
      errors: result.error.issues,
    });
    return;
  }

  try {
    const data = await loginUser(result.data);

    res.status(200).json({
      message: "Login successful",
      data,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Invalid email or password"
    ) {
      res.status(401).json({
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      message: "Internal server error",
    });
  }
}
