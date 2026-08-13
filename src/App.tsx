import Hero from "./components/Hero";
import "./App.css";
import Layout from "./components/Layout/Layout";
import Projetcts from "./components/Projects";
import Contact from "./components/Contact";

function App() {
  return (
    <>
      <Layout>
        <Hero />
        <Projetcts />
        <Contact />
      </Layout>
    </>
  );
}

export default App;
