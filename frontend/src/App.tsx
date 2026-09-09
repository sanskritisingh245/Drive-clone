
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

import Singup from "./components/Signup";
import Signin from "./components/Signin";
import Drive from "./components/Drive";



export function App() {
  return (
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/signin" replace />} />
      <Route path="/signup" element={<Singup/>}/>
      <Route path="/signin" element={<Signin/>}/>
      <Route path="/drive/:folderId?" element={<Drive/>}/>
    </Routes>
    </BrowserRouter>
  );
}

export default App;
