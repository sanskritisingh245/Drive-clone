/*
  Warnings:

  - You are about to drop the column `expiesAt` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `expiesAt` on the `Folder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "File" DROP COLUMN "expiesAt",
ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Folder" DROP COLUMN "expiesAt",
ADD COLUMN     "expiresAt" TIMESTAMP(3);
