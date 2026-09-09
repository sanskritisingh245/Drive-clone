-- CreateTable
CREATE TABLE "FileCollaborator" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',

    CONSTRAINT "FileCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolderCollaborator" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',

    CONSTRAINT "FolderCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FileCollaborator_fileId_userId_key" ON "FileCollaborator"("fileId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "FolderCollaborator_folderId_userId_key" ON "FolderCollaborator"("folderId", "userId");

-- AddForeignKey
ALTER TABLE "FileCollaborator" ADD CONSTRAINT "FileCollaborator_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileCollaborator" ADD CONSTRAINT "FileCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderCollaborator" ADD CONSTRAINT "FolderCollaborator_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderCollaborator" ADD CONSTRAINT "FolderCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
