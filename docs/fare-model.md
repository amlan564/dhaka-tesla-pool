# Fare Model

The MVP uses a simple and predictable fare calculation.

## Formula

passengerFare = baseFare + distanceCharge - poolDiscount

## Base Fare

50 BDT

## Distance Charge

20 BDT per predefined distance unit.

## Pool Discount

15% of the subtotal when the passenger is part of a shared pool.

## Example

Base fare = 50 BDT
Distance charge = 100 BDT

Subtotal:

50 + 100 = 150 BDT

Pool discount:

15% of 150 = 22.50 BDT

Passenger fare:

150 - 22.50 = 127.50 BDT

The final amount is stored in paisa.