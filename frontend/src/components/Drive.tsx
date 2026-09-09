import { api } from "@/lib/api";
import { useEffect, useState } from "react"
import FolderGrid from "./FolderGrid";
import FileGrid from "./FileGrid";
import UploadImageForm from "./Upload";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "./ui/button";

export type File =  {
    id: string,
    title:string,
    type:string,
    url:string,
    userId:string,
    parentId:string

}

export type Folder =  {
    id:string,
    title:string,
    userId:string,
    parentId:string,
    type:string
}


export default function Drive(){
    const[folders , setFolders]=useState<Folder[]>([]);
    const[files, setFiles]= useState<File[]>([]);
    const[loading, setLoadings]=useState(false);
    const[showUpload , setShowUpload]=useState(false);
    const [isDialogOpen, SetIsDialogOpen] = useState(false);
    const[folderName, setFolderName]=useState("");
    const[accessError, setAccessError]=useState("");


    const {folderId}=useParams();
    const navigate=useNavigate();

    async function fetchData(){
        setLoadings(true);
        setAccessError("");
        try {
            const res= await api.get(`/folders`,{
                params:{folderId}
            });
            setFolders(res.data.data.folders);
            setFiles(res.data.data.files);
        } catch (e:any) {
            setFolders([]);
            setFiles([]);
            setAccessError(e.response?.data?.error === "FORBIDDEN"
                ? "You don't have access to this folder."
                : "This folder doesn't exist.");
        }
        setLoadings(false);
    }
    useEffect(()=>{
        fetchData();
    },[showUpload, folderId])

    const onOpen = async (id:string) => {
        navigate(`/drive/${id}`)
    }
    const onClose = () => {
        SetIsDialogOpen(false);
    }
    async function createfolder() {
        await api.post("/folders", {
            title: folderName,
            ...(folderId ? { parentId: folderId} : {}),
        })
        fetchData();  
    }
    if(loading){
        return(
            <div>Loading.......</div>
        )
    }

    async function openDialog() {
        SetIsDialogOpen(true);
    }
    
    
    return(
        <>
        
        {
            isDialogOpen && <FolderDialog onClick={createfolder} onClose={onClose} setFolderName={setFolderName} folderName={folderName}  />    
        }
        <div className="p-6 flex flex-col gap-6">
            <div className="flex gap-3">
                <Button onClick={openDialog} className="bg-blue-600 hover:bg-blue-700">Create Folder</Button>
                <Button onClick={()=>setShowUpload(true)} className="bg-blue-600 hover:bg-blue-700">Upload</Button>
            </div>
            {showUpload && (
                <UploadImageForm
                    folderId={folderId}
                    onUploadSuccess={(url)=>{
                        // make POST /folders with url in body and type as "File"-> create file
                        fetchData();
                        setShowUpload(false);

                    }}
                />
            )}
            {accessError ? (
                <div className="text-gray-500 text-center mt-10">
                    {accessError}
                </div>
            ) : folders.length ===0 && files.length===0 ?(
                <div className="text-gray-500 text-center mt-10">
                    This folder is empty
                </div>
            ):(
                <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
                    <FolderGrid folders={folders} onOpen={onOpen} onDelete={fetchData}/>
                    <FileGrid files={files} onDelete={fetchData}/>
                </div>
            )}
        </div>
        </>
        
    )
}

type TDialogProps = {
    onClick : any,
    onClose: any,
    folderName : any,
    setFolderName: any
}

const FolderDialog = ({onClick, onClose, folderName, setFolderName }: TDialogProps) => {
    function handleChange(e:React.ChangeEvent<HTMLInputElement>){
        setFolderName(e.target.value) 
    }
    return (
        <div className="fixed inset-0 z-100 bg-white/20 items-center justify-center flex backdrop-blur-sm" onClick={onClose}>
            <div className="flex flex-col w-40 h-50  mb-5 border-2 border-black bg-gray-100 text-black  items-center justify-center" onClick={(e)=> {e.stopPropagation()}}>
                <input type="text" name="title" placeholder="Title" className="border-2 border-neutral-800 mb-5 flex items-center justify-center w-25 " onChange={handleChange}></input>
                <button onClick={onClick} className="border-2  border-neutral-800 w-25 mb-5 "> createfolder</button>
                <button onClick={onClose} className="border-2   border-neutral-800 w-8  ">x</button>
            </div>
        </div>
    )
}