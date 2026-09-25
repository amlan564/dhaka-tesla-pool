# Ride Lifecycle

A ride follows the following lifecycle:

REQUESTED
    ↓
MATCHED
    ↓
DRIVER_ARRIVED
    ↓
STARTED
    ↓
COMPLETED

A ride may be cancelled before it starts:

REQUESTED → CANCELLED

MATCHED → CANCELLED
DRIVER_ARRIVED → CANCELLED