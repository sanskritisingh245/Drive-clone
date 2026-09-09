/*
  Warnings:

  - Added the required column `path` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `Folder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "File" ADD COLUMN     "path" TEXT NOT NULL DEFAULT '';
ALTER TABLE "File" ALTER COLUMN "path" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "path" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Folder" ALTER COLUMN "path" DROP DEFAULT;
