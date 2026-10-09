import { BrowserRouter, Route, Routes } from "react-router";
import "./App.css";
import Layout from "./components/Layout/Layout";
import Home from "./pages/Home";
import ResumePage from "./pages/Resume";
import OrcamentosApp from "./pages/orcamentos/OrcamentosApp";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <Home />
            </Layout>
          }
        />
        <Route
          path="/curriculo-virtual"
          element={
            <Layout>
              <ResumePage />
            </Layout>
          }
        />
        <Route path="/orcamentos/*" element={<OrcamentosApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
