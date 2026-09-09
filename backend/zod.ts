import { password } from "bun";
import {z} from "zod";

export const SignupSchema=z.object({
    username:z.string(),
    email:z.email(),
    password:z.string(),
})

export const SigninSchema=z.object({
    username:z.string(),
    password:z.string()
})

export const FolderSchema=z.object({
    title:z.string(),
    parentId:z.string().optional(),
})

export const FileSchema=z.object({
    title:z.string(),
    type:z.enum(["pdf","Video","image"]),
    url:z.string(),
    parentFolderId:z.string().optional()
})

export const CollaboratorSchema = z.object({
    username: z.string(),
    role: z.enum(["viewer","editor"]).optional(),
})
