import express ,{type Response , type Request } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import crypto from "crypto";
import {SignupSchema, SigninSchema,FolderSchema,FileSchema, CollaboratorSchema} from "./zod";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { authMiddleware } from "./authMiddleware";
import { prisma } from "./db";


const R2_URL = "https://1b0495039ca11957cdc00a7792deaa6b.r2.cloudflarestorage.com";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_ACCESS_SECRET = process.env.R2_ACCESS_SECRET!;
const BUCKET_NAME=process.env.BUCKET_NAME!;
const PUBLIC_URL = "https://pub-6b2475754b47424f87562d56527567e8.r2.dev"
const BASE_URL = process.env.BASE_URL || "http://localhost:4000";

const S3= new S3Client({
    region:"auto",
    endpoint:R2_URL,
    credentials:{
        accessKeyId:R2_ACCESS_KEY_ID,
        secretAccessKey:R2_ACCESS_SECRET,
    }
})


const app=express();
app.use(express.json());
const JWT_SECRET=process.env.JWT_SECRET||"";
app.use(cors());

app.use((req,res,next) => {
    res.header("Access-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Headers","Content-Type");
    res.header("Access-Control-Allow-Methods","GET,POST,OPTIONS");

    if (req.method==="OPTIONS")return res.sendStatus(204);
    next();
});

function getFileExtension(fileName:string) {
    const parts=fileName.split(".");
    const extension=parts[parts.length-1];
    return extension&&extension!==fileName?extension:"bin";
}

function generateToken(){
    return crypto.randomBytes(32).toString("hex");
}

async function shareFile(fileId:string){
    const token=generateToken();

    const file= await prisma.file.update({
        where:{id:fileId},
        data:{
            shareToken:token,
            isPublic:true
        }
    });
    return `${BASE_URL}/share/${token}`
}

async function shareFolder(folderId:string){
    const token= generateToken();

    const folder= await prisma.folder.update({
        where:{id:folderId},
        data:{
            shareToken:token,
            isPublic:true,
        }
    });
     return `${BASE_URL}/share/${token}`

}

async function hasAccessToFiles(fileId:string , token:string){

}

// walks the parentId chain: access to any ancestor (owner or collaborator) grants access to a folder's contents
async function hasFolderAccess(folderId: string, userId: string): Promise<boolean | null> {
    let currentId: string | null = folderId;
    let isFirst = true;
    while (currentId) {
        const folder: { userId: string; parentId: string | null } | null = await prisma.folder.findUnique({
            where: { id: currentId },
            select: { userId: true, parentId: true }
        });
        if (!folder) return isFirst ? null : false;
        isFirst = false;
        if (folder.userId === userId) return true;
        const collaborator = await prisma.folderCollaborator.findFirst({
            where: { folderId: currentId, userId }
        });
        if (collaborator) return true;
        currentId = folder.parentId;
    }
    return false;
}
app.post("/signup", async (req:Request, res:Response)=>{
    try{
        const{success, data}=SignupSchema.safeParse(req.body);
        if(!success){
            return res.status(400).json({
                success:false,
                error:"Invalid_Request"
            })
        }
        const exsistingUser= await prisma.user.findUnique({
            where:{username:data.username}
        })
        if(exsistingUser){
            return res.status(400).json({
                success:false,
                error:"username already taken"
            })
        }
        const hash= await bcrypt.hash(data.password, 10);

        const user = await prisma.user.create({
            data:{
                username:data.username,
                password:hash,
                email:data.email
            }
        })
        return res.status(200).json({
            success:true,
            msg:"Successfully Signedup!"
        })

    }catch(e:any){
        return res.status(500).json({
        success: false,
        msg: e.message || "Internal Server Error",
      });
    }
})

app.post("/signin", async (req:Request, res:Response)=>{
    try{
        const {success, data}=SigninSchema.safeParse(req.body);
        if(!success){
            return res.status(400).json({
                success:false,
                error:"Invalid_credential"
            })
        }
        const exsistingUser= await prisma.user.findUnique({
            where:{username:data.username}
        })
        if(!exsistingUser){
            return res.status(404).json({
                success:false,
                error:"user not found"
            })
        }

        const password= await bcrypt.compare(data.password, exsistingUser.password)
        if(!password){
            return res.status(400).json({
                success:false,
                error:"Incorrect password"
            })
        }
        const token= jwt.sign({
            id:exsistingUser.id,
            username:exsistingUser.username,
            email:exsistingUser.email
        },JWT_SECRET)

        return res.status(200).json({
            success:true,
            data:token
        })
    }catch(e:any){
        return res.status(500).json({
        success: false,
        msg: e.message || "Internal Server Error",
      });
    }
})

app.post("/presign",async (req,res) => {
    const { fileName, fileType }=req.body?? {};

    if (!fileName||!fileType)
        return res.status(400).json({ error:"fileName and fileType are required" });

    if (!fileType.startsWith("image/") && !fileType.startsWith("video/") && fileType !== "application/pdf")
        return res.status(400).json({ error:"Only image, video, or PDF uploads allowed" });

    const extension=getFileExtension(fileName);
    const key=`uploads/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    try {
        const command=new PutObjectCommand({
            Bucket:BUCKET_NAME,
            Key:key,
            ContentType:fileType,
            });

        const signedUrl=await getSignedUrl(S3,command, {
            expiresIn:60,
            });

        const publicUrl=PUBLIC_URL ?? ""
        ?`${PUBLIC_URL.replace(/\/$/,"")}/${key}`
        :null;

        res.json({ signedUrl, key, publicUrl });
    }catch {
        res.status(500).json({ error:"Failed to generate URL" });
    }
});

// hum khaali folders fetch nhi krenge , hum -> humesha ya toh root mai jo saari files ya folders hai voh fetch krenege , ya kisi specific 
// folder ke andr ke files ya folders fetch honge 
app.get("/folders",authMiddleware, async(req:Request, res:Response)=>{
    try{
        const folderId = req.query.folderId as string;
        const userId=req.id;

        if (folderId) {
            const hasAccess = await hasFolderAccess(folderId, userId);
            if (hasAccess === null) {
                return res.status(404).json({ success:false, error:"FOLDER_NOT_FOUND" });
            }
            if (!hasAccess) {
                return res.status(403).json({ success:false, error:"FORBIDDEN" });
            }

            const folders = await prisma.folder.findMany({ where: { parentId: folderId } });
            const files = await prisma.file.findMany({ where: { parentFolderId: folderId } });
            return res.status(200).json({ success:true, data:{folders, files} });
        }

        const folders= await prisma.folder.findMany({
            where:{
                parentId: null,
                OR: [
                    {userId},
                    {folderCollaborator: {some: {userId}}}
                ]
            }
        })

        const files=await prisma.file.findMany({
            where:{
                parentFolderId: null,
                OR: [
                    {userId},
                    {fileCollaborator: {some: {userId}}}
                ]
            }
        })

        return res.status(200).json({
            success:true,
            data:{folders, files}
        })

    }catch(e:any){
        return res.status(500).json({
        success: false,
        msg: e.message || "Internal Server Error",
      });
    }
})

app.post("/folders",authMiddleware, async (req:Request, res:Response)=>{
    try{
        const userId=req.id;
        const{success, data}=FolderSchema.safeParse(req.body);
        if(!success){
            return res.status(400).json({
                success:false,
                error:"invalid data"
            })
        }
        let parent = null;
        if(data.parentId){
            parent = await prisma.folder.findUnique({
                where:{
                    id: data.parentId
                }
            })
            if(!parent){
                return res.status(400).json({
                    success:false,
                    error:"FOLDER_NOT_FOUND"
                })
            }
        }

        const newId=crypto.randomUUID();
        await prisma.folder.create({
            data: {
                title:data.title,
                parentId:data.parentId,
                userId,
                path: parent ? `${parent.path}/${newId}` : `/${newId}`
            }
        })
        
        return res.status(200).json({
            success:true,
            msg:"FOLDER_CREATED_SUCCESSFULLY"
        })

    }catch(e:any){
        return res.status(500).json({
        success: false,
        msg: e.message || "Internal Server Error",
      });
    }
})

app.post("/files", authMiddleware, async(req:Request, res:Response)=>{
    try{
        const userID=req.id as string;
        const{success, data, error}=FileSchema.safeParse(req.body);
        if(!success){
            return res.status(400).json({
                success:false,
                error:"invalid data"
            })
        }
        let parent = null;
        if (data.parentFolderId) {
            parent = await prisma.folder.findUnique({ where: { id: data.parentFolderId } });
            if (!parent) return res.status(400).json({ success:false, error:"FOLDER_NOT_FOUND" });
        }

        const newId = crypto.randomUUID();
        await prisma.file.create({
            data: {
                ...data,
                userId: userID,
                path: parent ? `${parent.path}/${newId}` : `/${newId}`,
            }
        })
        
        return res.status(200).json({
            success:true,
            msg:"file created successfully"
        })
    }catch(e:any){
        return res.status(500).json({
        success: false,
        msg: e.message || "Internal Server Error",
      });
    }


})

app.post("/files/:id/share", authMiddleware, async (req:Request, res:Response)=>{
    try{
        const userId=req.id;
        const id=req.params.id as string;
        const file=await prisma.file.findFirst({
            where:{id, userId}
        })
        if(!file){
            return res.status(404).json({
                success:false,
                error:"file not found"
            })
        }
        const link=await shareFile(file.id);
        return res.status(200).json({
            success:true,
            link
        })
    }catch(e:any){
        return res.status(500).json({
        success: false,
        msg: e.message || "Internal Server Error",
      });
    }
})

app.post("/folders/:id/share", authMiddleware, async (req:Request, res:Response)=>{
    try{
        const userId=req.id;
        const id=req.params.id as string;
        const folder=await prisma.folder.findFirst({
            where:{id, userId}
        })
        if(!folder){
            return res.status(404).json({
                success:false,
                error:"folder not found"
            })
        }
        const link=await shareFolder(folder.id);
        return res.status(200).json({
            success:true,
            link
        })
    }catch(e:any){
        return res.status(500).json({
        success: false,
        msg: e.message || "Internal Server Error",
      });
    }
})

app.delete("/items/:id",authMiddleware, async (req:Request, res:Response)=>{
    try{
        const id=req.params.id as string;
        const type=req.query.type as string;
        const userId= req.id;
        if(type=="file"){
            const file=await prisma.file.findFirst({
                where:{
                    id:id,
                    userId:userId
                }
            })

            if(!file){
                return res.status(404).json({
                    success:false,
                    error:"file not found"
                })
            }

            await prisma.file.delete({
                where:{id:id}
            })

            return res.status(200).json({
                success:true,
                msg:"file successfully deleted"
            })
        }
        if(type=="folder"){
            const folder= await prisma.folder.findFirst({
                where:{
                    id:id,
                    userId:userId
                }
            })

            if(!folder){
                return res.status(404).json({
                    success:false,
                    error:"folder not found"
                })
            }

            await prisma.folder.delete({
                where:{id:id}
            })

            return res.status(200).json({
                success:true,
                msg:"folder deleted successfully!"
            })

        }
        return res.status(400).json({
            success:false,
            error:"Invalid type"
        })
        
    }catch(e:any){
        return res.status(500).json({
        success: false,
        msg: e.message || "Internal Server Error",
      });
    }
})

app.get("/share/:token", async (req, res)=>{
    const {token}=req.params;

    const file = await prisma.file.findUnique({
        where:{
            shareToken:token
        }
    })

    if(file && file.expiresAt && file.expiresAt < new Date()){
        return res.status(403).json({
            success:false,
            error:"LINK_EXPIRED"
        })
    }

    if(file?.isPublic){
        return res.redirect(file.url);
    }


    const folder= await prisma.folder.findUnique({
        where:{shareToken:token},
        include:{
            childrenFiles:true,
            childrenFolder:true
        }
    });

    if(folder?.isPublic){
        return res.json(folder);
    }
  
    return res.status(400).json ({
        success:false,
        error:"INVALID_LINK"
    })
})
app.post("/files/:id/collaborators", authMiddleware, async (req:Request, res:Response)=>{
    try{
        const userId = req.id;
        const fileId = req.params.id as string;

        const { success, data } = CollaboratorSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ 
                success:false, 
                error:"INVALID_DATA" });
        }

        const file = await prisma.file.findFirst({ 
            where: { 
                id: fileId, 
                userId :userId
            } 
        });

        if (!file) {
            return res.status(404).json({ 
                success:false, 
                error:"FILE_NOT_FOUND" 
            });
        }

        const collaboratorUser = await prisma.user.findUnique({ 
            where: { 
                username: data.username 
            } 
        });
        if (!collaboratorUser) {
            return res.status(404).json({ 
                success:false, 
                error:"USER_NOT_FOUND" 
            });
        }

        await prisma.fileCollaborator.create({
            data: { 
                fileId, 
                userId: collaboratorUser.id, 
                role: data.role ?? "viewer" 
            },
        });

        return res.status(200).json({
            success:true, 
            msg:"COLLABORATOR_ADDED" 
        });
        
    }catch(e:any){
        return res.status(500).json({ 
            success: false, 
            msg: e.message || "Internal Server Error" 
        });
    }
})

app.post("/folders/:id/collaborators", authMiddleware, async (req:Request, res:Response)=>{
    try{
        const userId = req.id;
        const folderId = req.params.id as string;

        const { success, data } = CollaboratorSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({
                success:false,
                error:"INVALID_DATA" });
        }

        const folder = await prisma.folder.findFirst({
            where: {
                id: folderId,
                userId :userId
            }
        });

        if (!folder) {
            return res.status(404).json({
                success:false,
                error:"FOLDER_NOT_FOUND"
            });
        }

        const collaboratorUser = await prisma.user.findUnique({
            where: {
                username: data.username
            }
        });
        if (!collaboratorUser) {
            return res.status(404).json({
                success:false,
                error:"USER_NOT_FOUND"
            });
        }

        await prisma.folderCollaborator.create({
            data: {
                folderId,
                userId: collaboratorUser.id,
                role: data.role ?? "viewer"
            },
        });

        return res.status(200).json({
            success:true,
            msg:"COLLABORATOR_ADDED"
        });

    }catch(e:any){
        return res.status(500).json({
            success: false,
            msg: e.message || "Internal Server Error"
        });
    }
})
app.delete("/files/:id/collaborators/:userId", authMiddleware, async (req:Request, res:Response)=>{
    try{
        const userId = req.id;
        const fileId = req.params.id as string;
        const collaboratorId = req.params.userId as string;

        const file = await prisma.file.findFirst({
            where: {
                id: fileId,
                userId :userId
            }
        });

        if (!file) {
            return res.status(404).json({
                success:false,
                error:"FILE_NOT_FOUND"
            });
        }

        const collaborator = await prisma.fileCollaborator.findUnique({
            where: {
                fileId_userId: {
                    fileId,
                    userId: collaboratorId
                }
            }
        });

        if (!collaborator) {
            return res.status(404).json({
                success:false,
                error:"COLLABORATOR_NOT_FOUND"
            });
        }

        await prisma.fileCollaborator.delete({
            where: {
                fileId_userId: {
                    fileId,
                    userId: collaboratorId
                }
            }
        });

        return res.status(200).json({
            success:true,
            msg:"COLLABORATOR_REMOVED"
        });

    }catch(e:any){
        return res.status(500).json({
            success: false,
            msg: e.message || "Internal Server Error"
        });
    }
})
app.get("/files/:id/collaborators/:userId", authMiddleware, async (req:Request, res:Response)=>{
    try{
        const userId = req.id;
        const fileId = req.params.id as string;
        const collaboratorId = req.params.userId as string;

        const file = await prisma.file.findUnique({
            where: {
                id: fileId
            }
        });

        if (!file) {
            return res.status(404).json({
                success:false,
                error:"FILE_NOT_FOUND"
            });
        }

        if (file.userId !== userId && collaboratorId !== userId) {
            return res.status(403).json({
                success:false,
                error:"FORBIDDEN"
            });
        }

        const collaborator = await prisma.fileCollaborator.findUnique({
            where: {
                fileId_userId: {
                    fileId,
                    userId: collaboratorId
                }
            }
        });

        if (!collaborator) {
            return res.status(404).json({
                success:false,
                error:"COLLABORATOR_NOT_FOUND"
            });
        }

        return res.status(200).json({
            success:true,
            data:collaborator
        });

    }catch(e:any){
        return res.status(500).json({
            success: false,
            msg: e.message || "Internal Server Error"
        });
    }
})

app.get("/folders/:id/collaborators/:userId", authMiddleware, async (req:Request, res:Response)=>{
    try{
        const userId = req.id;
        const folderId = req.params.id as string;
        const collaboratorId = req.params.userId as string;

        const folder = await prisma.folder.findUnique({
            where: {
                id: folderId
            }
        });

        if (!folder) {
            return res.status(404).json({
                success:false,
                error:"FOLDER_NOT_FOUND"
            });
        }

        if (folder.userId !== userId && collaboratorId !== userId) {
            return res.status(403).json({
                success:false,
                error:"FORBIDDEN"
            });
        }

        const collaborator = await prisma.folderCollaborator.findUnique({
            where: {
                folderId_userId: {
                    folderId,
                    userId: collaboratorId
                }
            }
        });

        if (!collaborator) {
            return res.status(404).json({
                success:false,
                error:"COLLABORATOR_NOT_FOUND"
            });
        }

        return res.status(200).json({
            success:true,
            data:collaborator
        });

    }catch(e:any){
        return res.status(500).json({
            success: false,
            msg: e.message || "Internal Server Error"
        });
    }
})


app.listen(4000, ()=>{
    console.log("Server running on port 4000");
})