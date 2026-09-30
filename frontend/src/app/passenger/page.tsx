"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";

import api from "@/lib/api";
import { clearAuth, getUser } from "@/lib/auth";
import type { User } from "@/types/auth";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const RIDE_ZONES = [
  "Banani",
  "Gulshan",
  "Mohakhali",
  "Dhanmondi",
  "Mirpur",
  "Uttara",
  "Farmgate",
  "Bashundhara",
] as const;

type RideZone = (typeof RIDE_ZONES)[number];

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

interface RideRequestResponse {
  message: string;
  ride: Ride;
}

interface MyRidesResponse {
  rides: Ride[];
}

export default function PassengerDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [pickupZone, setPickupZone] = useState<RideZone | "">("");
  const [destinationZone, setDestinationZone] = useState<RideZone | "">("");
  const [requestedSeats, setRequestedSeats] = useState("1");

  const [requestingRide, setRequestingRide] = useState(false);

  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [rideHistory, setRideHistory] = useState<Ride[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [cancellingRide, setCancellingRide] = useState(false);

  const fetchRides = useCallback(async () => {
    try {
      setLoadingRides(true);

      const response = await api.get<MyRidesResponse>("/rides");

      const rides = response.data.rides;

      const activeStatuses = [
        "REQUESTED",
        "MATCHED",
        "ACCEPTED",
        "DRIVER_ARRIVED",
        "STARTED",
      ];

      const currentRide =
        rides.find((ride) => activeStatuses.includes(ride.status)) ?? null;

      setActiveRide(currentRide);

      setRideHistory(
        rides.filter(
          (ride) => ride.status === "COMPLETED" || ride.status === "CANCELLED",
        ),
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Failed to load your rides.",
        );
      } else {
        toast.error("Something went wrong while loading rides.");
      }
    } finally {
      setLoadingRides(false);
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
    setLoading(false);

    fetchRides();
  }, [router, fetchRides]);

  function handleLogout() {
    clearAuth();

    toast.success("Logged out successfully.");

    router.push("/login");
  }

  async function handleRequestRide() {
    if (!pickupZone) {
      toast.error("Please select a pickup zone.");
      return;
    }

    if (!destinationZone) {
      toast.error("Please select a destination zone.");
      return;
    }

    if (pickupZone === destinationZone) {
      toast.error("Pickup and destination cannot be the same.");
      return;
    }

    setRequestingRide(true);

    try {
      const response = await api.post<RideRequestResponse>("/rides", {
        pickupZone,
        destinationZone,
        requestedSeats: Number(requestedSeats),
      });

      toast.success(
        `Ride requested successfully! Estimated fare: ৳${(
          response.data.ride.estimatedFare / 100
        ).toFixed(2)}`,
      );

      setPickupZone("");
      setDestinationZone("");
      setRequestedSeats("1");

      await fetchRides();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message ||
            "Failed to request the ride. Please try again.",
        );
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setRequestingRide(false);
    }
  }

  async function handleCancelRide() {
    if (!activeRide) {
      return;
    }

    setCancellingRide(true);

    try {
      await api.patch(`/rides/${activeRide.id}/cancel`);

      toast.success("Ride cancelled successfully.");

      setActiveRide(null);

      await fetchRides();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Failed to cancel the ride.",
        );
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setCancellingRide(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold">Dhaka Tesla Pool</h1>

            <p className="text-sm text-muted-foreground">Passenger Dashboard</p>
          </div>

          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <section>
          <h2 className="text-2xl font-bold">Welcome, {user.fullName}</h2>

          <p className="text-muted-foreground">
            Manage your rides and request a Tesla pool ride.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {/* Request Ride */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Request a Ride</CardTitle>

              <CardDescription>Book a Tesla pool ride.</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col space-y-5">
              <div className="space-y-2">
                <Label htmlFor="pickup-zone">Pickup Zone</Label>

                <Select
                  value={pickupZone}
                  onValueChange={(value) => setPickupZone(value as RideZone)}
                >
                  <SelectTrigger id="pickup-zone" className="w-full">
                    <SelectValue placeholder="Select pickup zone" />
                  </SelectTrigger>

                  <SelectContent>
                    {RIDE_ZONES.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination-zone">Destination Zone</Label>

                <Select
                  value={destinationZone}
                  onValueChange={(value) =>
                    setDestinationZone(value as RideZone)
                  }
                >
                  <SelectTrigger id="destination-zone" className="w-full">
                    <SelectValue placeholder="Select destination zone" />
                  </SelectTrigger>

                  <SelectContent>
                    {RIDE_ZONES.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requested-seats">Number of Seats</Label>

                <Select
                  value={requestedSeats}
                  onValueChange={(value) => {
                    if (value) {
                      setRequestedSeats(value);
                    }
                  }}
                >
                  <SelectTrigger id="requested-seats" className="w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="1">1 seat</SelectItem>

                    <SelectItem value="2">2 seats</SelectItem>

                    <SelectItem value="3">3 seats</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="mt-auto w-full cursor-pointer"
                onClick={handleRequestRide}
                disabled={requestingRide}
              >
                {requestingRide ? "Requesting..." : "Request Ride"}
              </Button>
            </CardContent>
          </Card>
          {/* Active Ride */}

          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>Active Ride</CardTitle>

                  <CardDescription>
                    Your current Tesla pool ride.
                  </CardDescription>
                </div>

                {activeRide && (
                  <Badge variant="secondary">{activeRide.status}</Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col">
              {loadingRides ? (
                <p className="text-sm text-muted-foreground">Loading ride...</p>
              ) : activeRide ? (
                <div className="flex flex-1 flex-col">
                  {/* Route */}
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-3 w-3 shrink-0 rounded-full bg-foreground" />

                      <div>
                        <p className="text-xs text-muted-foreground">Pickup</p>

                        <p className="font-medium">{activeRide.pickupZone}</p>
                      </div>
                    </div>

                    <div className="ml-1.5 h-6 border-l border-dashed border-black" />

                    <div className="flex items-center gap-3">
                      <div className="flex h-3 w-3 shrink-0 rounded-full border-2 border-foreground" />

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Destination
                        </p>

                        <p className="font-medium">
                          {activeRide.destinationZone}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ride Information */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Seats</p>

                      <p className="mt-1 font-semibold">
                        {activeRide.requestedSeats}{" "}
                        {activeRide.requestedSeats === 1 ? "Seat" : "Seats"}
                      </p>
                    </div>

                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Estimated Fare
                      </p>

                      <p className="mt-1 font-semibold">
                        ৳{(activeRide.estimatedFare / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Status Message */}
                  <div className="my-2">
                    <p className="text-sm text-muted-foreground">
                      {activeRide.status === "REQUESTED" &&
                        "Waiting for a driver to accept your ride."}

                      {activeRide.status === "MATCHED" &&
                        "Your ride has been matched with a Tesla."}

                      {activeRide.status === "ACCEPTED" &&
                        "Your driver has accepted the ride."}

                      {activeRide.status === "DRIVER_ARRIVED" &&
                        "Your driver has arrived at the pickup point."}

                      {activeRide.status === "STARTED" &&
                        "Your ride is currently in progress."}
                    </p>
                  </div>

                  {/* Cancel Button */}
                  <Button
                    variant="destructive"
                    className="mt-auto w-full cursor-pointer"
                    onClick={handleCancelRide}
                    disabled={cancellingRide || activeRide.status === "STARTED"}
                  >
                    {cancellingRide
                      ? "Cancelling..."
                      : activeRide.status === "STARTED"
                        ? "Ride Started"
                        : "Cancel Ride"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active ride.</p>
              )}
            </CardContent>
          </Card>

          {/* Ride History */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Ride History</CardTitle>

              <CardDescription>View your previous rides.</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col">
              {loadingRides ? (
                <p className="text-sm text-muted-foreground">
                  Loading history...
                </p>
              ) : rideHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No completed rides yet.
                </p>
              ) : (
                <div className="flex flex-1 flex-col">
                  <div className="space-y-3">
                    {rideHistory.slice(0, 2).map((ride) => {
                      const finalStatusHistory = ride.statusHistory.find(
                        (history) => history.toStatus === ride.status,
                      );

                      const displayDate =
                        finalStatusHistory?.createdAt ?? ride.createdAt;

                      return (
                        <div key={ride.id} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold">
                              {ride.pickupZone} → {ride.destinationZone}
                            </p>

                            <Badge variant="secondary">{ride.status}</Badge>
                          </div>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {ride.requestedSeats}{" "}
                            {ride.requestedSeats === 1 ? "seat" : "seats"} · ৳
                            {(ride.estimatedFare / 100).toFixed(2)}
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
                      );
                    })}
                  </div>

                  {rideHistory.length > 2 && (
                    <Button
                      variant="outline"
                      className="mt-auto w-full cursor-pointer"
                      onClick={() => router.push("/passenger/history")}
                    >
                      View All History
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
