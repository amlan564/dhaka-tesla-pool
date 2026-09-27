# Assumptions

## 1. Geography

The MVP does not use real-time map routing or external map APIs.

Passengers select from a predefined list of Dhaka areas.

Supported areas:

- Banani
- Gulshan
- Mohakhali
- Dhanmondi
- Mirpur
- Uttara
- Farmgate
- Bashundhara

The system uses these predefined areas instead of real-world GPS coordinates or routing services.

## 2. Ride Matching

Two ride requests can be considered compatible when:

1. Their pickup areas are the same.
2. Their destinations are compatible according to the predefined route-compatibility rules.
3. The vehicle has enough remaining seats.

The MVP uses the following predefined compatible destination groups:

- Banani route group: Gulshan, Mohakhali
- Gulshan route group: Banani, Bashundhara
- Mohakhali route group: Banani, Mirpur
- Dhanmondi route group: Farmgate, Gulshan
- Mirpur route group: Mohakhali, Uttara
- Uttara route group: Banani, Mirpur
- Farmgate route group: Dhanmondi, Banani
- Bashundhara route group: Gulshan

For example:

- Nusrat: Banani → Mohakhali
- Rafiq: Banani → Gulshan

Both passengers have the same pickup area, Banani, and their destinations are compatible according to the predefined route rules. Therefore, they can be considered for the same pool.

The matching rule is intentionally simple, deterministic, and testable because the challenge does not require real-world routing.

## 3. Vehicle Capacity

Each vehicle has a fixed maximum capacity.

The system must reject any pool operation that would cause:

occupied seats > vehicle capacity.

For the MVP, the Tesla vehicle has a capacity of 3 seats.

Capacity checks must be performed transactionally to prevent overbooking when multiple ride requests are processed concurrently.

## 4. Payment

No real payment gateway is required.

The MVP supports:

- Cash
- Simulated TeslaPay

## 5. Money Storage

All monetary values are stored as integer paisa (poisha).

For example:

127.50 BDT = 12750 paisa

This avoids floating-point precision issues when calculating and storing monetary values.

## 6. Authentication

- JWT-based authentication will be used.
- Passwords will be stored using bcrypt hashing.
- Passengers can register through the API.
- Driver accounts are provided through the seeded demo data.

## 7. Cancellation

A passenger can cancel a ride only before the ride starts.

Once a ride reaches STARTED, passenger cancellation is not allowed.
