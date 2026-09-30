-- AlterTable
ALTER TABLE "RideRequest" ADD COLUMN     "driverId" TEXT;

-- CreateIndex
CREATE INDEX "RideRequest_driverId_idx" ON "RideRequest"("driverId");

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
