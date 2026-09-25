# Assumptions

## 1. Geography

The MVP does not use real-time map routing.

Passengers select predefined Dhaka areas.

Supported areas:

- Banani
- Gulshan
- Mohakhali
- Dhanmondi
- Mirpur
- Uttara
- Farmgate
- Bashundhara

## 2. Ride Matching

Two ride requests can be considered compatible when:

1. Their pickup areas are the same.
2. Their destination areas belong to the same predefined compatible route group.
3. The vehicle has enough remaining seats.

The matching rule is intentionally simple because the challenge does
not require real-world routing.

## 3. Vehicle Capacity

Each vehicle has a fixed maximum capacity.

The system must reject any request that would cause:

occupied seats > vehicle capacity.

## 4. Payment

No real payment gateway is required.

The MVP supports:

- Cash
- Simulated TeslaPay

## 5. Money Storage

All monetary values are stored as integer paisa.

For example:

130 BDT = 13000 paisa

This avoids floating-point precision issues.

## 6. Authentication

JWT-based authentication will be used.

Passwords will be stored using bcrypt hashing.

## 7. Cancellation

A passenger can cancel a ride only before the ride starts.

Once a ride reaches STARTED, passenger cancellation is not allowed.