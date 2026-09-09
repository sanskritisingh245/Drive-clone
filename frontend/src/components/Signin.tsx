import { api } from "@/lib/api";
import { useState } from "react"
import { useNavigate } from "react-router-dom";


export default function Signin(){

    const[credentials, setCredentials]=useState({
        password:"",
        username:"",
    })
    const[loading , setLoading]=useState(false);
    const navigate = useNavigate();


    function handleChange (e:React.ChangeEvent<HTMLInputElement>){
        const{name,value}=e.target;
        setCredentials({
            ...credentials,
            [name]:value
        })
    }
    
    async function handleClick(){
        setLoading(true)
        const res= await api.post("/signin",{
            username:credentials.username,
            password:credentials.password
        })
        const token=res.data.data;
        console.log(res.data);
        console.log("asd", token);
        localStorage.setItem( "token" ,token);
        setLoading(false)
        navigate("/drive")

    }
    
    return(
        <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
            <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8 flex flex-col gap-5 shadow-md">
                <h1 className="text-3xl font-medium text-gray-800 text-center mb-2">Welcome Back</h1>
                <input type="text" name="username" placeholder="Enter Username" onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500 transition" />
                <input type="password" name="password" placeholder="Enter Password" onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500 transition" />
                <button onClick={handleClick}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition cursor-pointer">
                    Login
                </button>
                <div className="text-center text-gray-500 text-sm">
                    Don't have an account? <button onClick={()=>navigate("/signup")} className="text-blue-600 hover:text-blue-700 underline cursor-pointer">Sign up</button>
                </div>
            </div>
        </div>
    )
}