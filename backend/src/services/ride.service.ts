import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import type { CreateRideInput } from "../validators/ride.validator";
import { calculateFare } from "./fare.service";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

const VALID_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ["MATCHED", "CANCELLED"],
  MATCHED: ["DRIVER_ARRIVED", "CANCELLED"],
  DRIVER_ARRIVED: ["STARTED", "CANCELLED"],
  STARTED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export async function createRideRequest(
  passengerId: string,
  input: CreateRideInput,
) {
  const passenger = await prisma.user.findUnique({
    where: {
      id: passengerId,
    },
  });

  if (!passenger || passenger.role !== "PASSENGER") {
    throw new Error("Passenger account not found");
  }

  if (input.pickupZone === input.destinationZone) {
    throw new Error("Pickup and destination cannot be the same");
  }

  const estimatedFarePerSeat = calculateFare(
    input.pickupZone,
    input.destinationZone,
    1,
  );

  const estimatedFare = estimatedFarePerSeat * input.requestedSeats;

  return prisma.rideRequest.create({
    data: {
      passengerId,
      pickupZone: input.pickupZone,
      destinationZone: input.destinationZone,
      requestedSeats: input.requestedSeats,
      estimatedFare,
      status: "REQUESTED",

      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: "REQUESTED",
          changedBy: passengerId,
        },
      },
    },

    include: {
      statusHistory: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

export async function getPassengerRides(passengerId: string) {
  return prisma.rideRequest.findMany({
    where: {
      passengerId,
    },
    include: {
      poolMembership: {
        include: {
          pool: {
            include: {
              vehicle: true,
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
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getPassengerRide(passengerId: string, rideId: string) {
  const ride = await prisma.rideRequest.findFirst({
    where: {
      id: rideId,
      passengerId,
    },
    include: {
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
                      pickupZone: true,
                      destinationZone: true,
                      requestedSeats: true,
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

  if (!ride) {
    throw new Error("Ride request not found");
  }

  return ride;
}

export async function cancelRide(passengerId: string, rideId: string) {
  return prisma.$transaction(async (tx) => {
    const ride = await tx.rideRequest.findFirst({
      where: {
        id: rideId,
        passengerId,
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

    if (
      ride.status !== "REQUESTED" &&
      ride.status !== "MATCHED" &&
      ride.status !== "DRIVER_ARRIVED"
    ) {
      throw new Error("Ride cannot be cancelled after it has started");
    }

    if (ride.poolMembership) {
      const poolId = ride.poolMembership.poolId;

      const pool = await tx.pool.findUnique({
        where: {
          id: poolId,
        },
        include: {
          vehicle: true,
        },
      });

      if (!pool) {
        throw new Error("Pool not found");
      }

      await tx.poolMember.delete({
        where: {
          id: ride.poolMembership.id,
        },
      });

      await tx.vehicle.update({
        where: {
          id: pool.vehicleId,
        },
        data: {
          occupiedSeats: {
            decrement: ride.requestedSeats,
          },
        },
      });

      const remainingMembers = await tx.poolMember.findMany({
        where: {
          poolId,
        },
        include: {
          rideRequest: true,
        },
      });

      if (remainingMembers.length === 0) {
        await tx.pool.update({
          where: {
            id: poolId,
          },
          data: {
            status: "CANCELLED",
          },
        });
      } else {
        for (const member of remainingMembers) {
          const newFare = calculateFare(
            member.rideRequest.pickupZone as any,
            member.rideRequest.destinationZone as any,
            remainingMembers.length,
          );

          await tx.poolMember.update({
            where: {
              id: member.id,
            },
            data: {
              fare: newFare,
            },
          });

          await tx.rideRequest.update({
            where: {
              id: member.rideRequestId,
            },
            data: {
              estimatedFare: newFare * member.rideRequest.requestedSeats,
            },
          });
        }
      }
    }

    await tx.rideRequest.update({
      where: {
        id: rideId,
      },
      data: {
        status: "CANCELLED",
      },
    });

    await tx.rideStatusHistory.create({
      data: {
        rideRequestId: rideId,
        fromStatus: ride.status,
        toStatus: "CANCELLED",
        changedBy: passengerId,
      },
    });

    return tx.rideRequest.findUnique({
      where: {
        id: rideId,
      },
      include: {
        statusHistory: {
          orderBy: {
            createdAt: "asc",
          },
        },
        poolMembership: true,
      },
    });
  });
}

export async function transitionRideStatus(
  rideId: string,
  newStatus: "MATCHED" | "DRIVER_ARRIVED" | "STARTED" | "COMPLETED",
  changedBy: string,
) {
  return prisma.$transaction(async (tx) => {
    const ride = await tx.rideRequest.findUnique({
      where: {
        id: rideId,
      },
    });

    if (!ride) {
      throw new Error("Ride request not found");
    }

    const allowedTransitions = VALID_TRANSITIONS[ride.status] ?? [];

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
        changedBy,
      },
    });

    return updatedRide;
  });
}
