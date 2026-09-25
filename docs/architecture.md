# System Architecture

```mermaid
flowchart TD

    A[Browser<br/>Passenger / Driver]
        -->|HTTP / REST| B[Next.js Frontend]

    B -->|REST API| C[Node.js + Express API]

    C --> D[Authentication<br/>JWT + bcrypt]

    C --> E[Business Logic]

    E --> F[Ride Management]
    E --> G[Pool Matching]
    E --> H[Fare Calculation]
    E --> I[Capacity Enforcement]
    E --> J[State Transition]

    E --> K[Prisma ORM]

    K --> L[(PostgreSQL Database)]