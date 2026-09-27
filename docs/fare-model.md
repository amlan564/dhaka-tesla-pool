# Fare Model

The MVP uses a simple and predictable fare calculation.

## Formula

passengerFare = baseFare + distanceCharge - poolDiscount

## Base Fare

50 BDT per passenger.

## Distance Charge

20 BDT per predefined distance unit.

The MVP uses predefined distance units between supported Dhaka zones. These are simplified units for fare calculation and do not represent real kilometers or use a map API.

## Pool Discount

## Pool Discount

The pool discount depends on the number of passengers sharing the same pool:

- 1 passenger: 0% discount
- 2 passengers: 10% discount
- 3 passengers: 15% discount

The discount is calculated separately for each passenger based on their own fare subtotal.

A passenger traveling alone does not receive a pool discount.

## Example

Assume the following predefined distance:

Banani → Mohakhali = 2 distance units

For a 3-passenger shared pool:

### Nusrat

Base fare = 50 BDT

Distance charge:

2 × 20 = 40 BDT

Subtotal:

50 + 40 = 90 BDT

Pool discount:

15% of 90 = 13.50 BDT

Passenger fare:

90 - 13.50 = 76.50 BDT

Therefore:

Nusrat's fare = 76.50 BDT

The same calculation is applied independently to Rafiq and Shirin.
If their destinations require different distance units, their final
fares will be different.

## Money Storage

All monetary values are stored as integer paisa (poisha) rather than floating-point decimal values.

For example:

50 BDT   = 5000 paisa,
76.50 BDT = 7650 paisa,
127.50 BDT = 12750 paisa

This avoids floating-point precision issues when calculating and storing monetary amounts.

## Payment

The MVP supports two payment methods:

- Cash
- Simulated TeslaPay wallet

No real payment gateway is required for the MVP.