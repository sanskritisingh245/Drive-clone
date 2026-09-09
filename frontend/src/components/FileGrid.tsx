import type { File } from "./Drive";
import { api } from "@/lib/api";
import { Button } from "./ui/button";
import { FileText, Film } from "lucide-react";
interface Fprops {
    files: File[]
    onDelete: () => void
}

async function handleShare(fileId: string){
    const res = await api.post(`/files/${fileId}/share`);
    try {
        await navigator.clipboard.writeText(res.data.link);
        alert(`Share link copied: ${res.data.link}`);
    } catch {
        alert(`Share link: ${res.data.link}`);
    }
}

async function handleInvite(fileId: string){
    const username = window.prompt("Share with username:");
    if (!username) return;
    try {
        await api.post(`/files/${fileId}/collaborators`, { username });
        alert(`Shared with ${username}`);
    } catch (e:any) {
        alert(e.response?.data?.error || "Failed to add collaborator");
    }
}

export default function FileGrid({files, onDelete}:Fprops){
    async function handleDelete(fileId: string){
        if (!window.confirm("Delete this file?")) return;
        try {
            await api.delete(`/items/${fileId}`, { params: { type: "file" } });
            onDelete();
        } catch (e:any) {
            alert(e.response?.data?.error || "Failed to delete file");
        }
    }

    return (
        <>
            {files.map(file=>(
                <div
                    key={file.id}
                    className="group flex flex-col items-center gap-2 bg-white border border-gray-200 rounded-xl p-3 shadow-sm"
                >
                    {file.type === "image" ? (
                        <img className="h-20 w-20 rounded-md object-cover border border-gray-200" src={file.url} />
                    ) : (
                        <a href={file.url} target="_blank" rel="noreferrer" className="h-20 w-20 flex items-center justify-center rounded-md border border-gray-200 bg-gray-50">
                            {file.type === "pdf" ? <FileText className="size-8 text-gray-400" /> : <Film className="size-8 text-gray-400" />}
                        </a>
                    )}
                    <span className="text-gray-800 text-sm truncate max-w-full">{file.title}</span>
                    <div className="flex flex-wrap justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <Button size="sm" variant="secondary" onClick={()=> handleShare(file.id)}>Share</Button>
                        <Button size="sm" variant="secondary" onClick={()=> handleInvite(file.id)}>Invite</Button>
                        <Button size="sm" variant="destructive" onClick={()=> handleDelete(file.id)}>Delete</Button>
                    </div>
                </div>
            ))}
        </>
    )
}
