import jwt from "jsonwebtoken";

interface JwtPayload {
  userId: string;
  role: "PASSENGER" | "DRIVER";
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return secret;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "1d",
  });
}
