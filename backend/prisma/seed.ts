import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  const jashim = await prisma.user.upsert({
    where: {
      email: "jashim.tesla.pool@gmail.com",
    },
    update: {},
    create: {
      fullName: "Jashim",
      email: "jashim.tesla.pool@gmail.com",
      passwordHash,
      role: "DRIVER",
    },
  });

  const nusrat = await prisma.user.upsert({
    where: {
      email: "nusrat.tesla.pool@gmail.com",
    },
    update: {},
    create: {
      fullName: "Nusrat",
      email: "nusrat.tesla.pool@gmail.com",
      passwordHash,
      role: "PASSENGER",
    },
  });

  const rafiq = await prisma.user.upsert({
    where: {
      email: "rafiq.tesla.pool@gmail.com",
    },
    update: {},
    create: {
      fullName: "Rafiq",
      email: "rafiq.tesla.pool@gmail.com",
      passwordHash,
      role: "PASSENGER",
    },
  });

  const shirin = await prisma.user.upsert({
    where: {
      email: "shirin.tesla.pool@gmail.com",
    },
    update: {},
    create: {
      fullName: "Shirin",
      email: "shirin.tesla.pool@gmail.com",
      passwordHash,
      role: "PASSENGER",
    },
  });

  const bullet = await prisma.vehicle.upsert({
    where: {
      driverId: jashim.id,
    },
    update: {},
    create: {
      driverId: jashim.id,
      name: "Bullet",
      capacity: 3,
      status: "OFFLINE",
    },
  });

  console.log("Seed completed successfully.");
  console.log({
    driver: jashim.fullName,
    vehicle: bullet.name,
    passengers: [nusrat.fullName, rafiq.fullName, shirin.fullName],
  });
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
