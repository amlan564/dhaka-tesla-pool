"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";

import api from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { User } from "@/types/auth";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface RideStatusHistory {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  createdAt: string;
}

interface Ride {
  id: string;
  passengerId: string;
  pickupZone: string;
  destinationZone: string;
  requestedSeats: number;
  estimatedFare: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: RideStatusHistory[];
}

interface MyRidesResponse {
  rides: Ride[];
}

export default function PassengerHistoryPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get<MyRidesResponse>("/rides");

      const history = response.data.rides.filter(
        (ride) => ride.status === "COMPLETED" || ride.status === "CANCELLED",
      );

      setRides(history);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Failed to load ride history.",
        );
      } else {
        toast.error("Something went wrong while loading history.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = getUser();

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    if (currentUser.role !== "PASSENGER") {
      router.replace("/driver");
      return;
    }

    setUser(currentUser);

    fetchHistory();
  }, [router, fetchHistory]);

  if (!user || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Loading ride history...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold">Dhaka Tesla Pool</h1>

            <p className="text-sm text-muted-foreground">Ride History</p>
          </div>

          <Button variant="outline" className="cursor-pointer" onClick={() => router.push("/passenger")}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <section className="mb-6">
          <h2 className="text-2xl font-bold">All Ride History</h2>

          <p className="text-muted-foreground">
            View your completed and cancelled rides.
          </p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>
              {rides.length} {rides.length === 1 ? "Ride" : "Rides"}
            </CardTitle>

            <CardDescription>Your previous Tesla pool rides.</CardDescription>
          </CardHeader>

          <CardContent>
            {rides.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No ride history yet.
                </p>

                <Button
                  className="mt-4"
                  onClick={() => router.push("/passenger")}
                >
                  Request a Ride
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {rides.map((ride) => {
                  const finalStatusHistory = ride.statusHistory.find(
                    (history) => history.toStatus === ride.status,
                  );

                  const displayDate =
                    finalStatusHistory?.createdAt ?? ride.createdAt;

                  return (
                    <div key={ride.id} className="rounded-lg border p-4">
                      {/* Ride Header */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold">
                            {ride.pickupZone} → {ride.destinationZone}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(displayDate)
                              .toLocaleString("en-GB", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })
                              .replace(/\//g, "-")}
                          </p>
                        </div>

                        <Badge
                          variant={
                            ride.status === "COMPLETED"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {ride.status}
                        </Badge>
                      </div>

                      {/* Ride Details */}
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="rounded-md bg-muted/50 p-3">
                          <p className="text-xs text-muted-foreground">Seats</p>

                          <p className="mt-1 font-medium">
                            {ride.requestedSeats}{" "}
                            {ride.requestedSeats === 1 ? "Seat" : "Seats"}
                          </p>
                        </div>

                        <div className="rounded-md bg-muted/50 p-3">
                          <p className="text-xs text-muted-foreground">Fare</p>

                          <p className="mt-1 font-medium">
                            ৳{(ride.estimatedFare / 100).toFixed(2)}
                          </p>
                        </div>

                        <div className="col-span-2 rounded-md bg-muted/50 p-3 sm:col-span-1">
                          <p className="text-xs text-muted-foreground">
                            Status
                          </p>

                          <p className="mt-1 font-medium">{ride.status}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
