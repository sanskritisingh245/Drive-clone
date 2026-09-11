import axios from "axios";

export const api = axios.create({
    baseURL: "/api",
    headers: {
        "Content-Type": "Application/json"
    }
});

api.interceptors.request.use((req)=>{
    let token=localStorage.getItem("token")
    if(!token){
        token=""
    }
    req.headers.Authorization = token
    
    return req;
})