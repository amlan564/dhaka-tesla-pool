import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../generated/prisma/client";
import type { RideStatus } from "../generated/prisma/enums";
import { areRoutesCompatible } from "./matching.service.js";
import { calculateFare } from "./fare.service.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

const ACTIVE_POOL_STATUSES = ["ACTIVE", "STARTED"];

const ALLOWED_DRIVER_TRANSITIONS: Record<string, string[]> = {
  MATCHED: ["DRIVER_ARRIVED"],
  DRIVER_ARRIVED: ["STARTED"],
  STARTED: ["COMPLETED"],
};

async function getDriverVehicle(driverId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { driverId },
  });

  if (!vehicle) {
    throw new Error("Driver vehicle not found");
  }

  return vehicle;
}

export async function updateDriverVehicleStatus(
  driverId: string,
  status: "ONLINE" | "OFFLINE",
) {
  const vehicle = await getDriverVehicle(driverId);

  return prisma.vehicle.update({
    where: { id: vehicle.id },
    data: { status },
  });
}

export async function getPendingRideRequests(driverId: string) {
  await getDriverVehicle(driverId);

  return prisma.rideRequest.findMany({
    where: {
      status: "REQUESTED",
    },
    include: {
      passenger: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function acceptRideRequestTransaction(
  driverId: string,
  rideId: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const vehicle = await tx.vehicle.findUnique({
        where: {
          driverId,
        },
      });

      if (!vehicle) {
        throw new Error("Driver vehicle not found");
      }

      if (vehicle.status !== "ONLINE") {
        throw new Error("Driver must be online to accept a ride");
      }

      const ride = await tx.rideRequest.findUnique({
        where: {
          id: rideId,
        },
        include: {
          poolMembership: true,
        },
      });

      if (!ride) {
        throw new Error("Ride request not found");
      }

      if (ride.status !== "REQUESTED") {
        throw new Error("Ride request is no longer available");
      }

      const reservedVehicles = await tx.$queryRaw<
        Array<{
          id: string;
          driverId: string;
          name: string;
          capacity: number;
          occupiedSeats: number;
          status: "ONLINE" | "OFFLINE";
        }>
      >`
        UPDATE "Vehicle"
        SET
          "occupiedSeats" = "occupiedSeats" + ${ride.requestedSeats},
          "updatedAt" = NOW()
        WHERE
          "id" = ${vehicle.id}
          AND "status" = 'ONLINE'
          AND "occupiedSeats" + ${ride.requestedSeats} <= "capacity"
        RETURNING
          "id",
          "driverId",
          "name",
          "capacity",
          "occupiedSeats",
          "status"
      `;

      if (reservedVehicles.length === 0) {
        throw new Error(
          `Not enough seats available. ${
            vehicle.capacity - vehicle.occupiedSeats
          } seat(s) remaining`,
        );
      }

      /*
       * Find the driver's active pool.
       */
      const activePool = await tx.pool.findFirst({
        where: {
          vehicleId: vehicle.id,
          status: {
            in: ACTIVE_POOL_STATUSES as any,
          },
        },
        include: {
          members: {
            include: {
              rideRequest: true,
            },
          },
        },
      });

      let pool = activePool;

      /*
       * Check route compatibility with every
       * existing pool member.
       */
      if (pool) {
        for (const member of pool.members) {
          const compatible = areRoutesCompatible(
            ride.pickupZone as any,
            ride.destinationZone as any,
            member.rideRequest.pickupZone as any,
            member.rideRequest.destinationZone as any,
          );

          if (!compatible) {
            throw new Error(
              "Ride request is not compatible with the current pool",
            );
          }
        }
      }

      /*
       * Create a pool when the Tesla does not
       * currently have an active pool.
       */
      if (!pool) {
        pool = await tx.pool.create({
          data: {
            vehicleId: vehicle.id,
            status: "ACTIVE",
          },
          include: {
            members: {
              include: {
                rideRequest: true,
              },
            },
          },
        });
      }

      /*
       * Calculate fare based on the new pool size.
       */
      const newPoolSize = pool.members.length + 1;

      const fare = calculateFare(
        ride.pickupZone as any,
        ride.destinationZone as any,
        newPoolSize,
      );

      /*
       * Add passenger to the pool.
       */
      await tx.poolMember.create({
        data: {
          poolId: pool.id,
          rideRequestId: ride.id,
          seats: ride.requestedSeats,
          fare,
        },
      });

      /*
       * Move ride:
       * REQUESTED → MATCHED
       */
      await tx.rideRequest.update({
        where: {
          id: ride.id,
        },
        data: {
          status: "MATCHED",
          estimatedFare: fare * ride.requestedSeats,
        },
      });

      /*
       * Record lifecycle change.
       */
      await tx.rideStatusHistory.create({
        data: {
          rideRequestId: ride.id,
          fromStatus: "REQUESTED",
          toStatus: "MATCHED",
          changedBy: driverId,
        },
      });

      /*
       * Recalculate all pool member fares
       * because the pool size has changed.
       */
      const updatedMembers = await tx.poolMember.findMany({
        where: {
          poolId: pool.id,
        },
        include: {
          rideRequest: true,
        },
      });

      for (const member of updatedMembers) {
        const memberFare = calculateFare(
          member.rideRequest.pickupZone as any,
          member.rideRequest.destinationZone as any,
          updatedMembers.length,
        );

        await tx.poolMember.update({
          where: {
            id: member.id,
          },
          data: {
            fare: memberFare,
          },
        });

        await tx.rideRequest.update({
          where: {
            id: member.rideRequestId,
          },
          data: {
            estimatedFare: memberFare * member.rideRequest.requestedSeats,
          },
        });
      }

      /*
       * Return complete updated ride.
       */
      return tx.rideRequest.findUnique({
        where: {
          id: ride.id,
        },
        include: {
          passenger: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          poolMembership: {
            include: {
              pool: {
                include: {
                  vehicle: true,
                  members: {
                    include: {
                      rideRequest: {
                        select: {
                          id: true,
                          passengerId: true,
                          pickupZone: true,
                          destinationZone: true,
                          requestedSeats: true,
                          estimatedFare: true,
                          status: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          statusHistory: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    },
  );
}

export async function acceptRideRequest(driverId: string, rideId: string) {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await acceptRideRequestTransaction(driverId, rideId);
    } catch (error) {
      const isSerializationConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";

      if (isSerializationConflict && attempt < MAX_RETRIES) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to accept ride request");
}

export async function updateRideStatusByDriver(
  driverId: string,
  rideId: string,
  newStatus: RideStatus,
) {
  return prisma.$transaction(async (tx) => {
    const ride = await tx.rideRequest.findUnique({
      where: {
        id: rideId,
      },
      include: {
        poolMembership: {
          include: {
            pool: true,
          },
        },
      },
    });

    if (!ride) {
      throw new Error("Ride request not found");
    }

    if (!ride.poolMembership) {
      throw new Error("Ride is not assigned to a pool");
    }

    const pool = ride.poolMembership.pool;

    const vehicle = await tx.vehicle.findUnique({
      where: {
        id: pool.vehicleId,
      },
    });

    if (!vehicle || vehicle.driverId !== driverId) {
      throw new Error("You are not authorized to manage this ride");
    }

    const allowedTransitions = ALLOWED_DRIVER_TRANSITIONS[ride.status] ?? [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(
        `Invalid ride status transition: ${ride.status} → ${newStatus}`,
      );
    }

    const updatedRide = await tx.rideRequest.update({
      where: {
        id: rideId,
      },
      data: {
        status: newStatus,
      },
    });

    await tx.rideStatusHistory.create({
      data: {
        rideRequestId: rideId,
        fromStatus: ride.status,
        toStatus: newStatus,
        changedBy: driverId,
      },
    });

    if (newStatus === "STARTED") {
      await tx.pool.update({
        where: {
          id: pool.id,
        },
        data: {
          status: "STARTED",
        },
      });
    }

    if (newStatus === "COMPLETED") {
      await tx.vehicle.update({
        where: {
          id: vehicle.id,
        },
        data: {
          occupiedSeats: {
            decrement: ride.requestedSeats,
          },
        },
      });

      const remaining = await tx.poolMember.count({
        where: {
          poolId: pool.id,
          rideRequest: {
            status: {
              not: "COMPLETED",
            },
          },
        },
      });

      if (remaining === 0) {
        await tx.pool.update({
          where: {
            id: pool.id,
          },
          data: {
            status: "COMPLETED",
          },
        });
      }
    }

    return updatedRide;
  });
}

export async function getDriverCurrentPool(driverId: string) {
  const vehicle = await getDriverVehicle(driverId);

  return prisma.pool.findFirst({
    where: {
      vehicleId: vehicle.id,
      status: {
        in: ACTIVE_POOL_STATUSES as any,
      },
    },
    include: {
      vehicle: true,
      members: {
        include: {
          rideRequest: {
            include: {
              passenger: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getDriverRideHistory(driverId: string) {
  const vehicle = await getDriverVehicle(driverId);

  return prisma.rideRequest.findMany({
    where: {
      poolMembership: {
        pool: {
          vehicleId: vehicle.id,
        },
      },
      status: {
        in: ["COMPLETED", "CANCELLED"],
      },
    },
    include: {
      passenger: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      poolMembership: {
        include: {
          pool: true,
        },
      },
      statusHistory: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}
