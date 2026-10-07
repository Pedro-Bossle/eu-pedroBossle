import { BrowserRouter, Route, Routes } from "react-router";
import "./App.css";
import Layout from "./components/Layout/Layout";
import Home from "./pages/Home";
import ResumePage from "./pages/Resume";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/curriculo-virtual" element={<ResumePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
