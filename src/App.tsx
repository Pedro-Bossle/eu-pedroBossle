import Hero from "./components/Hero";
import "./App.css";
import Layout from "./components/Layout/Layout";
import Projetcts from "./components/Projects";

function App() {
  return (
    <>
      <Layout>
        <Hero />
        <Projetcts />
      </Layout>
    </>
  );
}

export default App;
