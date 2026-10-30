import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import "./App.css";
import Layout from "./components/Layout/Layout";
import Home from "./pages/Home";

const ResumePage = lazy(() => import("./pages/Resume"));
const ModelPreview = lazy(() => import("./pages/ModelPreview"));
const CasesPage = lazy(() => import("./pages/CasesPage"));
const ContatoPage = lazy(() => import("./pages/Contato"));
const PrivacyPage = lazy(() =>
  import("./pages/Legal").then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import("./pages/Legal").then((m) => ({ default: m.TermsPage })),
);
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
          path="/modelos/:id"
          element={
            <Suspense fallback={null}>
              <ModelPreview />
            </Suspense>
          }
        />
        <Route
          path="/estudos-de-caso"
          element={
            <Layout>
              <Suspense fallback={null}>
                <CasesPage />
              </Suspense>
            </Layout>
          }
        />
        <Route
          path="/contato"
          element={
            <Layout>
              <Suspense fallback={null}>
                <ContatoPage />
              </Suspense>
            </Layout>
          }
        />
        <Route
          path="/termos-de-uso"
          element={
            <Layout>
              <Suspense fallback={null}>
                <TermsPage />
              </Suspense>
            </Layout>
          }
        />
        <Route
          path="/politica-de-privacidade"
          element={
            <Layout>
              <Suspense fallback={null}>
                <PrivacyPage />
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
