import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import "./App.css";
import Layout from "./components/Layout/Layout";
import Home from "./pages/Home";

const ResumePage = lazy(() => import("./pages/Resume"));
const OrcamentosApp = lazy(() => import("./pages/orcamentos/OrcamentosApp"));

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
        <Suspense fallback={null}>
          <Routes>
            <Route path="*" element={<OrcamentosApp />} />
          </Routes>
        </Suspense>
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
              <Suspense fallback={null}>
                <ResumePage />
              </Suspense>
            </Layout>
          }
        />
        <Route
          path="/orcamentos/*"
          element={
            <Suspense fallback={null}>
              <OrcamentosApp />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
