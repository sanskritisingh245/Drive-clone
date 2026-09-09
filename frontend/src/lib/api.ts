import axios from "axios";

export const api = axios.create({
    baseURL: "http://localhost:4000",
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