# Database ERD

```mermaid
erDiagram
    USER ||--o| VEHICLE : owns
    USER ||--o{ RIDE_REQUEST : creates
    VEHICLE ||--o{ POOL : serves
    POOL ||--o{ POOL_MEMBER : contains
    RIDE_REQUEST ||--o| POOL_MEMBER : joins
    RIDE_REQUEST ||--o{ RIDE_STATUS_HISTORY : has
    USER ||--o{ RIDE_STATUS_HISTORY : changes

    USER {
        uuid id PK
        string fullName
        string email UK
        string passwordHash
        Role role
        datetime createdAt
        datetime updatedAt
    }

    VEHICLE {
        uuid id PK
        uuid driverId FK
        string name
        int capacity "3 seats"
        VehicleStatus status
        datetime createdAt
        datetime updatedAt
    }

    RIDE_REQUEST {
        uuid id PK
        uuid passengerId FK
        string pickupZone
        string destinationZone
        int requestedSeats
        int estimatedFare
        RideStatus status
        datetime createdAt
        datetime updatedAt
    }

    POOL {
        uuid id PK
        uuid vehicleId FK
        PoolStatus status
        datetime createdAt
        datetime updatedAt
    }

    POOL_MEMBER {
        uuid id PK
        uuid poolId FK
        uuid rideRequestId FK
        int seats
        int fare
        datetime joinedAt
    }

    RIDE_STATUS_HISTORY {
        uuid id PK
        uuid rideRequestId FK
        RideStatus fromStatus
        RideStatus toStatus
        uuid changedBy FK
        datetime createdAt
    }