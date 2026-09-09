import type { Folder } from "./Drive"
import { api } from "@/lib/api";
import { Button } from "./ui/button";
import { Folder as FolderIcon } from "lucide-react";

interface Fprops {
    folders: Folder[]
    onOpen: (prop: string)=>void
    onDelete: () => void
}

async function handleShare(e: React.MouseEvent, folderId: string){
    e.stopPropagation();
    const res = await api.post(`/folders/${folderId}/share`);
    try {
        await navigator.clipboard.writeText(res.data.link);
        alert(`Share link copied: ${res.data.link}`);
    } catch {
        alert(`Share link: ${res.data.link}`);
    }
}

async function handleInvite(e: React.MouseEvent, folderId: string){
    e.stopPropagation();
    const username = window.prompt("Share with username:");
    if (!username) return;
    try {
        await api.post(`/folders/${folderId}/collaborators`, { username });
        alert(`Shared with ${username}`);
    } catch (e:any) {
        alert(e.response?.data?.error || "Failed to add collaborator");
    }
}

export default function FolderGrid({folders, onOpen, onDelete}: Fprops){
    async function handleDelete(e: React.MouseEvent, folderId: string){
        e.stopPropagation();
        if (!window.confirm("Delete this folder?")) return;
        try {
            await api.delete(`/items/${folderId}`, { params: { type: "folder" } });
            onDelete();
        } catch (e:any) {
            alert(e.response?.data?.error || "Failed to delete folder");
        }
    }

    return (
        <>
            {folders.map(folder=>(
                    <div
                        key={folder.id}
                        onClick={()=>onOpen(folder.id)}
                        className="group flex flex-col items-center gap-2 bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
                    >
                        <FolderIcon className="size-10 text-gray-400 shrink-0" />
                        <span className="text-gray-800 text-sm truncate max-w-full">{folder.title}</span>
                        <div className="flex flex-wrap justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <Button size="sm" variant="secondary" onClick={(e)=>handleShare(e, folder.id)}>Share</Button>
                            <Button size="sm" variant="secondary" onClick={(e)=>handleInvite(e, folder.id)}>Invite</Button>
                            <Button size="sm" variant="destructive" onClick={(e)=>handleDelete(e, folder.id)}>Delete</Button>
                        </div>
                    </div>
            ))}
        </>
    )
}
