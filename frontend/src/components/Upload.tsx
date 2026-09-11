import { useState, type ChangeEvent } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import ImagePreview from "./ImagePreview"
import { api } from "@/lib/api";
const PUBLIC_URL = "https://pub-6b2475754b47424f87562d56527567e8.r2.dev"
type UploadImageFormProps = {
  onUploadSuccess: (url: string) => void;
  folderId?: string;
};

function detectFileType(file: File): "image" | "pdf" | "Video" | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("video/")) return "Video";
  return null;
}

export default function UploadImageForm({
  onUploadSuccess,
  folderId,
}: UploadImageFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [previewUrl , setPreviewUrl]=useState<string>("");

  async function handleUpload() {
    if (!selectedFile) {
      setMessage("Please choose a file.");
      return;
    }
    const fileType = detectFileType(selectedFile);
    if (!fileType) {
      setMessage("Unsupported file type. Use an image, PDF, or video.");
      return;
    }

    setIsUploading(true);

    try {
      const presignResponse = await fetch(
        "/api/presign",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileType: selectedFile.type,
          }),
        }
      );
      if (!presignResponse.ok) {
        const { error } = await presignResponse.json();
        throw new Error(error || "Failed to get upload URL");
      }
      const {
        signedUrl,
        key,
        publicUrl,
      }: {
        signedUrl: string;
        key: string;
        publicUrl: string;
      } = await presignResponse.json();

      await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      onUploadSuccess(publicUrl); // better than createObjectUR

      await api.post("/files", {
          title: selectedFile.name,
          url: publicUrl,
          type: fileType,
          ...(folderId ? { parentFolderId: folderId } : {}),
      })


      setMessage("Upload successful!");
    } catch (error: any) {
      setMessage(error.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if(!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  return (
    <div className="flex flex-col gap-3">
      <Input type="file" accept="image/*,application/pdf,video/*" onChange={handleFileChange} />
      <Button onClick={handleUpload} disabled={isUploading}>
        {isUploading ? "Uploading..." : "Upload File"}
      </Button>
      {message && <p>{message}</p>}
      {selectedFile?.type.startsWith("image/") && <ImagePreview previewUrl={previewUrl}/>}
    </div>
  );
}