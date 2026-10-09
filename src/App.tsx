import { BrowserRouter, Route, Routes } from "react-router";
import "./App.css";
import Layout from "./components/Layout/Layout";
import Home from "./pages/Home";
import ResumePage from "./pages/Resume";
import OrcamentosApp from "./pages/orcamentos/OrcamentosApp";

function isOrcamentosHost() {
  const host = window.location.hostname.toLowerCase();
  return (
    host === "orcamentos.devbossle.com.br" ||
    host.startsWith("orcamentos.")
  );
}

function App() {
  if (isOrcamentosHost()) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<OrcamentosApp />} />
        </Routes>
      </BrowserRouter>
    );
  }

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
