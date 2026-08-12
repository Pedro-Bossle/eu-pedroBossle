function Hero() {
  return (
    <div className="flex justify-center">
      <div className="flex flex-col mx-4 ">
        <h2 className="font-bold text-xl my-3 tracking-widest">Pedro Bossle</h2>
        <p className="ml-5 tracking-wide italic md:mb-5">
          Transformo processos complexos em sistemas simples, rápidos e fáceis
          de usar.
          <br />
          Apaixonado por soluções tecnológicas, automatizar processos e
          simplificar fluxos de trabalho.
        </p>
        <div className="flex flex-col gap-2 text-center md:flex md:flex-row md:gap-2">
          <h3 className="my-2 text-lg font-medium">Venha ver meu mundo:</h3>
          <a
            href="#"
            className="py-1 mx-6 border border-gray-400 rounded-2xl md:px-4 md:py-2"
          >
            Projetos
          </a>
          <a
            href="https://github.com/Pedro-Bossle"
            className="py-1 mx-6 border border-gray-400 rounded-2xl md:px-4 md:py-2"
          >
            Github
          </a>
          <a
            href="#"
            className="py-1 mx-6 border border-gray-400 rounded-2xl md:px-4 md:py-2"
          >
            Contato
          </a>
        </div>
      </div>
    </div>
  );
}
//anotar pra fazer o hover + imagem a direita, separando em uma grid 60/40
export default Hero;
