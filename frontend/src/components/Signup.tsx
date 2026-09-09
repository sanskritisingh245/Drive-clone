import { api } from "@/lib/api";

import { useState } from "react"
import { useNavigate } from "react-router-dom";

export default function Singup(){
    const navigate= useNavigate();
    const [error , setError] = useState("");
    const [credentials, setCredentials]=useState({
        email:"",
        password:"",
        username:""
    })
    function handleChange (e:React.ChangeEvent<HTMLInputElement>){
        const{name, value}=e.target;
        setCredentials({
            ...credentials,
            [name]:value
        })
    }
    //console.log(credentials)
    const[loading, setLoading]=useState(false);
    async function handlesignup(){
        setLoading(true);
        try{
            const res= await api.post("/signup",{
                username:credentials.username,
                email:credentials.email,
                password:credentials.password
            })
            navigate("/signin");
        }catch(e:any){
            setError(e.response?.data?. error || "SIGNUP_FAILED")
        } finally{
            setLoading(false);
        }
    }
    
    function handleClick(){
        navigate("/signin")   
    }


    return(
        <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
            <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-8 flex flex-col gap-5 shadow-md">
                <h1 className="text-3xl font-medium text-gray-800 text-center mb-2">Create Account</h1>
                <input type="text" name="email" placeholder="Enter Email" onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500 transition" />
                <input type="password" name="password" placeholder="Enter Password" onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500 transition" />
                <input type="text" name="username" placeholder="Enter Username" onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500 transition" />
                <button onClick={handlesignup}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition cursor-pointer">
                    Signup
                </button>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <div className="text-center text-gray-500 text-sm">
                    Already signed up? <button onClick={handleClick} className="text-blue-600 hover:text-blue-700 underline cursor-pointer">Login</button>
                </div>
            </div>
        </div>
    )
}