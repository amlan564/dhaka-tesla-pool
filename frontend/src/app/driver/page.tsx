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
import { Badge } from "@/components/ui/badge";

type VehicleStatus = "ONLINE" | "OFFLINE";

interface Vehicle {
  id: string;
  driverId: string;
  name: string;
  capacity: number;
  occupiedSeats: number;
  status: VehicleStatus;
}

interface VehicleStatusResponse {
  message: string;
  vehicle: Vehicle;
}

interface Passenger {
  id: string;
  fullName: string;
  email: string;
}

interface RideRequest {
  id: string;
  passengerId: string;
  pickupZone: string;
  destinationZone: string;
  requestedSeats: number;
  estimatedFare: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  passenger: Passenger;
}

interface PendingRidesResponse {
  rides: RideRequest[];
}

interface PoolRideRequest {
  id: string;
  pickupZone: string;
  destinationZone: string;
  requestedSeats: number;
  estimatedFare: number;
  status: string;
  passenger: Passenger;
}

interface PoolMember {
  id: string;
  seats: number;
  fare: number;
  joinedAt: string;
  rideRequest: PoolRideRequest;
}

interface DriverPool {
  id: string;
  status: string;
  vehicle: Vehicle;
  members: PoolMember[];
}

interface CurrentPoolResponse {
  pool: DriverPool | null;
}

interface RideHistory {
  id: string;
  pickupZone: string;
  destinationZone: string;
  requestedSeats: number;
  estimatedFare: number;
  status: string;
  updatedAt: string;
  passenger: Passenger;
}

interface RideHistoryResponse {
  rides: RideHistory[];
}

export default function DriverDashboard() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [acceptingRideId, setAcceptingRideId] = useState<string | null>(null);
  const [currentPool, setCurrentPool] = useState<DriverPool | null>(null);
  const [loadingPool, setLoadingPool] = useState(true);
  const [rideHistory, setRideHistory] = useState<RideHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadDriver = useCallback(async () => {
    const currentUser = getUser();

    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (currentUser.role !== "DRIVER") {
      router.push("/passenger");
      return;
    }

    setUser(currentUser);

    try {
      const response = await api.get<{ vehicle: Vehicle }>("/driver/vehicle");

      setVehicle(response.data.vehicle);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          clearAuth();
          router.push("/login");
          return;
        }

        toast.error(error.response?.data?.message || "Failed to load vehicle");
      } else {
        toast.error("Failed to load vehicle");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadRideRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);

      const response = await api.get<PendingRidesResponse>(
        "/driver/rides/requests",
      );

      setRideRequests(response.data.rides);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Failed to load ride requests",
        );
      } else {
        toast.error("Failed to load ride requests");
      }
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const handleAcceptRide = async (rideId: string) => {
    try {
      setAcceptingRideId(rideId);

      await api.patch(`/driver/rides/${rideId}/accept`);

      toast.success("Ride accepted successfully");

      await loadRideRequests();
      await loadCurrentPool();
      await loadDriver();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to accept ride");
      } else {
        toast.error("Failed to accept ride");
      }
    } finally {
      setAcceptingRideId(null);
    }
  };

  const handleRideStatusUpdate = async (
    rideId: string,
    status: "DRIVER_ARRIVED" | "STARTED" | "COMPLETED",
  ) => {
    try {
      await api.patch(`/driver/rides/${rideId}/status`, {
        status,
      });

      toast.success(
        status === "DRIVER_ARRIVED"
          ? "Arrival marked successfully"
          : status === "STARTED"
            ? "Trip started successfully"
            : "Trip completed successfully",
      );

      await loadCurrentPool();
      await loadRideHistory();
      await loadDriver();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Failed to update ride status",
        );
      } else {
        toast.error("Failed to update ride status");
      }
    }
  };

  const loadCurrentPool = useCallback(async () => {
    try {
      setLoadingPool(true);

      const response = await api.get<CurrentPoolResponse>("/driver/pool");

      setCurrentPool(response.data.pool);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Failed to load current pool",
        );
      } else {
        toast.error("Failed to load current pool");
      }
    } finally {
      setLoadingPool(false);
    }
  }, []);

  const loadRideHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);

      const response = await api.get<RideHistoryResponse>(
        "/driver/rides/history",
      );

      setRideHistory(response.data.rides);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Failed to load ride history",
        );
      } else {
        toast.error("Failed to load ride history");
      }
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadDriver();
    loadRideRequests();
    loadCurrentPool();
    loadRideHistory();
  }, [loadDriver, loadRideRequests, loadCurrentPool, loadRideHistory]);

  const handleVehicleStatus = async (status: VehicleStatus) => {
    try {
      setUpdatingStatus(true);

      const response = await api.patch<VehicleStatusResponse>(
        "/driver/vehicle/status",
        { status },
      );

      setVehicle(response.data.vehicle);

      toast.success(
        status === "ONLINE" ? "You are now online" : "You are now offline",
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message || "Failed to update vehicle status",
        );
      } else {
        toast.error("Failed to update vehicle status");
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-muted/30 p-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold">Dhaka Tesla Pool</h1>
            <p className="text-sm text-muted-foreground">Driver Dashboard</p>
          </div>

          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <section>
          <h2 className="text-2xl font-bold">
            Welcome{user?.fullName ? `, ${user.fullName}` : ""}
          </h2>
          <p className="text-muted-foreground">
            Manage your vehicle, ride requests, and current pool.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Vehicle Status */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Status</CardTitle>
              <CardDescription>
                Control whether you are available for rides.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>

                <Badge
                  variant={
                    vehicle?.status === "ONLINE" ? "default" : "secondary"
                  }
                >
                  {vehicle?.status ?? "OFFLINE"}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={updatingStatus || vehicle?.status === "ONLINE"}
                  onClick={() => handleVehicleStatus("ONLINE")}
                >
                  Go Online
                </Button>

                <Button
                  className="flex-1"
                  variant="outline"
                  disabled={updatingStatus || vehicle?.status === "OFFLINE"}
                  onClick={() => handleVehicleStatus("OFFLINE")}
                >
                  Go Offline
                </Button>
              </div>

              {vehicle && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    Vehicle:{" "}
                    <span className="font-medium text-foreground">
                      {vehicle.name}
                    </span>
                  </p>

                  <p>
                    Seats:{" "}
                    <span className="font-medium text-foreground">
                      {vehicle.occupiedSeats}/{vehicle.capacity}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ride Requests */}
          <Card>
            <CardHeader>
              <CardTitle>Ride Requests</CardTitle>
              <CardDescription>
                Available passenger ride requests.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {loadingRequests ? (
                <p className="text-sm text-muted-foreground">
                  Loading ride requests...
                </p>
              ) : rideRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending ride requests.
                </p>
              ) : (
                <div className="max-h-75 space-y-3 overflow-y-auto pr-1">
                  {rideRequests.map((ride) => (
                    <div
                      key={ride.id}
                      className="space-y-3 rounded-lg border p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {ride.passenger.fullName}
                          </p>

                          <p className="text-sm text-muted-foreground">
                            {ride.pickupZone} → {ride.destinationZone}
                          </p>
                        </div>

                        <Badge variant="secondary">{ride.status}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Seats</p>
                          <p className="font-medium">{ride.requestedSeats}</p>
                        </div>

                        <div>
                          <p className="text-muted-foreground">
                            Estimated Fare
                          </p>
                          <p className="font-medium">
                            ৳{(ride.estimatedFare / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        disabled={acceptingRideId === ride.id}
                        onClick={() => handleAcceptRide(ride.id)}
                      >
                        {acceptingRideId === ride.id
                          ? "Accepting..."
                          : "Accept Ride"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Pool */}
          <Card>
            <CardHeader>
              <CardTitle>Current Pool</CardTitle>
              <CardDescription>
                Passengers currently assigned to your pool.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {loadingPool ? (
                <p className="text-sm text-muted-foreground">
                  Loading current pool...
                </p>
              ) : !currentPool ? (
                <p className="text-sm text-muted-foreground">No active pool.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{currentPool.vehicle.name}</p>

                      <p className="text-sm text-muted-foreground">
                        {currentPool.members.length} passenger
                        {currentPool.members.length !== 1 ? "s" : ""}
                      </p>
                    </div>

                    <Badge>{currentPool.status}</Badge>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Seats</span>

                      <span className="font-medium">
                        {currentPool.vehicle.occupiedSeats}/
                        {currentPool.vehicle.capacity}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Available</span>

                      <span className="font-medium">
                        {currentPool.vehicle.capacity -
                          currentPool.vehicle.occupiedSeats}
                      </span>
                    </div>
                  </div>

                  <div className="max-h-40 space-y-3 overflow-y-auto pr-1">
                    {currentPool.members.map((member) => (
                      <div key={member.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">
                            {member.rideRequest.passenger.fullName}
                          </p>

                          <Badge variant="secondary">
                            {member.rideRequest.status}
                          </Badge>
                        </div>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {member.rideRequest.pickupZone} →{" "}
                          {member.rideRequest.destinationZone}
                        </p>

                        <div className="mt-2 flex justify-between text-sm">
                          <span>Seats: {member.seats}</span>

                          <span>৳{(member.fare / 100).toFixed(2)}</span>
                        </div>

                        {member.rideRequest.status === "MATCHED" && (
                          <Button
                            className="mt-3 w-full"
                            onClick={() =>
                              handleRideStatusUpdate(
                                member.rideRequest.id,
                                "DRIVER_ARRIVED",
                              )
                            }
                          >
                            Mark Arrival
                          </Button>
                        )}

                        {member.rideRequest.status === "DRIVER_ARRIVED" && (
                          <Button
                            className="mt-3 w-full"
                            onClick={() =>
                              handleRideStatusUpdate(
                                member.rideRequest.id,
                                "STARTED",
                              )
                            }
                          >
                            Start Trip
                          </Button>
                        )}

                        {member.rideRequest.status === "STARTED" && (
                          <Button
                            className="mt-3 w-full"
                            onClick={() =>
                              handleRideStatusUpdate(
                                member.rideRequest.id,
                                "COMPLETED",
                              )
                            }
                          >
                            Complete Trip
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ride History */}
        <Card>
          <CardHeader>
            <CardTitle>Ride History</CardTitle>
            <CardDescription>
              Your completed and cancelled rides.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loadingHistory ? (
              <p className="text-sm text-muted-foreground">
                Loading ride history...
              </p>
            ) : rideHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No ride history yet.
              </p>
            ) : (
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {rideHistory.map((ride) => (
                  <div key={ride.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{ride.passenger.fullName}</p>

                        <p className="text-sm text-muted-foreground">
                          {ride.pickupZone} → {ride.destinationZone}
                        </p>
                      </div>

                      <Badge
                        variant={
                          ride.status === "COMPLETED" ? "default" : "secondary"
                        }
                      >
                        {ride.status}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Seats</p>
                        <p className="font-medium">{ride.requestedSeats}</p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Fare</p>
                        <p className="font-medium">
                          ৳{(ride.estimatedFare / 100).toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <p className="text-muted-foreground">Time</p>
                        <p className="font-medium">
                          {new Date(ride.updatedAt)
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
