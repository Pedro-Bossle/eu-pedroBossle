export type TranslationKeys = {
  nav: {
    highlights: string;
    cases: string;
    hire: string;
    stack: string;
    openMenu: string;
    closeMenu: string;
    lightMode: string;
    darkMode: string;
    langPt: string;
    langEn: string;
    switchToPt: string;
    switchToEn: string;
  };
  hero: {
    role: string;
    tagline: string;
    passion: string;
    seeProjects: string;
    whySite: string;
    getInTouch: string;
    balloonProjects: string;
    balloonProjectsDesc: string;
    balloonGithub: string;
    balloonGithubDesc: string;
    balloonContact: string;
    balloonContactDesc: string;
    scroll: string;
  };
  projects: {
    eyebrow: string;
    title: string;
    subtitle: string;
    access: string;
    previous: string;
    next: string;
    previousAria: string;
    nextAria: string;
    goTo: string;
    logoAlt: string;
  };
  cases: {
    eyebrow: string;
    title: string;
    subtitle: string;
    challenge: string;
    solution: string;
    result: string;
  };
  stack: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  why: {
    eyebrow: string;
    title: string;
    steps: string[];
    punchline: string;
    cta: string;
  };
  hire: {
    eyebrow: string;
    title: string;
    subtitle: string;
    step1: string;
    step2: string;
    step3: string;
    styleHint: string;
    name: string;
    email: string;
    idea: string;
    ideaPlaceholder: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
    rateLimit: string;
    or: string;
    emailLink: string;
    linkedinLink: string;
    promise: string;
    vibes: Record<string, string>;
  };
  contact: {
    eyebrow: string;
    title: string;
    linkedin: string;
    github: string;
    instagram: string;
    email: string;
    resumeLink: string;
    tagline: string;
    copyright: string;
  };
  resume: {
    pageTitle: string;
    downloadPdf: string;
    downloadingPdf: string;
    certificate: string;
    companyInstagram: string;
    summaryHeading: string;
    skillsHeading: string;
    experienceHeading: string;
    featuredHeading: string;
    educationHeading: string;
    coursesHeading: string;
    promptWhoami: string;
    promptSummary: string;
    promptSkills: string;
    promptExperience: string;
    promptProjects: string;
    promptEducation: string;
    promptCourses: string;
  };
};

const pt: TranslationKeys = {
  nav: {
    highlights: "Destaques",
    cases: "Casos",
    hire: "Contratar",
    stack: "Stack",
    openMenu: "Abrir menu",
    closeMenu: "Fechar menu",
    lightMode: "Modo claro",
    darkMode: "Modo escuro",
    langPt: "PT",
    langEn: "EN",
    switchToPt: "Mudar para português",
    switchToEn: "Switch to English",
  },
  hero: {
    role: "Desenvolvedor",
    tagline:
      "Transformo processos complexos em sistemas simples, rápidos e fáceis de usar.",
    passion:
      "Apaixonado por soluções tecnológicas, por automatizar processos e por simplificar fluxos de trabalho.",
    seeProjects: "Ver projetos",
    whySite: "Por que um site",
    getInTouch: "Entre em contato",
    balloonProjects: "Projetos",
    balloonProjectsDesc: "Veja o que estou construindo",
    balloonGithub: "GitHub",
    balloonGithubDesc: "Código e experimentos",
    balloonContact: "Contato",
    balloonContactDesc: "Vamos conversar",
    scroll: "↓ Scroll",
  },
  projects: {
    eyebrow: "Destaques",
    title: "Projetos que fiz",
    subtitle:
      "Aqui estão os principais projetos grandes, destinados a clientes ou para uso próprio no dia a dia:",
    access: "Acesse o projeto",
    previous: "← Anterior",
    next: "Próximo →",
    previousAria: "Projeto anterior",
    nextAria: "Próximo projeto",
    goTo: "Ir para",
    logoAlt: "Logo do projeto",
  },
  cases: {
    eyebrow: "Relatos relacionados aos projetos",
    title: "Estudos de Caso",
    subtitle:
      "Aqui você pode ver alguns relatos de usuários das minhas plataformas.",
    challenge: "Desafio",
    solution: "Solução",
    result: "Resultado",
  },
  stack: {
    eyebrow: "Competências",
    title: "Stack e habilidades",
    subtitle:
      "Algumas das tecnologias que já trabalhei e que tenho familiaridade. Juntamente de habilidades e competências profissionais.",
  },
  why: {
    eyebrow: "Presença digital",
    title: "O guia completo para continuar invisível online",
    steps: [
      "Não tenha um website",
      "Diga que Instagram é suficiente",
      "Mande os clientes perguntarem tudo pelo WhatsApp",
      "Responda quando puder",
      "Não mostre preços nem serviços",
      "Faça o cliente procurar as informações",
      "Repita até o concorrente ficar com eles",
    ],
    punchline: "Ou faça o contrário — e seja encontrado.",
    cta: "Quero ser encontrado",
  },
  hire: {
    eyebrow: "Próximo passo",
    title: "Como me contratar",
    subtitle:
      "Escolha um estilo, veja a seção mudar na hora e me conte sua ideia.",
    step1: "Escolha seu estilo",
    step2: "Conte sua ideia no formulário",
    step3: "Tenha mais visibilidade online com um site que é a sua cara",
    styleHint: "Toque em um estilo para ver a seção se transformar",
    name: "Nome",
    email: "E-mail",
    idea: "Ideia",
    ideaPlaceholder: "O que você precisa? Site, sistema, landing…",
    submit: "Enviar mensagem",
    submitting: "Enviando…",
    success: "Mensagem enviada. Em breve entro em contato.",
    error: "Não foi possível enviar. Tente de novo ou use o e-mail direto.",
    rateLimit: "Muitas tentativas. Aguarde um pouco e tente novamente.",
    or: "ou",
    emailLink: "E-mail",
    linkedinLink: "LinkedIn",
    promise: "Mais visibilidade online com um site que é a sua cara.",
    vibes: {
      minimalism: "Limpo, sem firula — o conteúdo manda.",
      swiss: "Tipo cartaz suíço: grade firme e tipografia no centro.",
      "neo-brutalism": "Grosso, barulhento e sem medo de parecer ousado.",
      claymorphism: "Botões e cards macios, quase dá pra apertar.",
      glassmorphism: "Aquele efeito de vidro fosco que virou moda.",
      neumorphism: "Relevo suave, tudo parecendo sair do fundo.",
      cyberpunk: "Escuro, neon e clima de filme sci-fi.",
      cybercore: "Visual de terminal: grid, ciano e cara técnica.",
      synthwave: "Anos 80, pôr do sol e fita VHS.",
      y2k: "Nostalgia dos anos 2000 — chrome, bolhas e rosa.",
      "pixel-art": "Pixelado de propósito, clima de jogo antigo.",
      scrapbook: "Parece colagem de caderno: kraft, recorte e cola.",
      surrealism: "Estranho de propósito — formas e cores que não batem.",
      bento: "Tudo em caixinhas organizadas, estilo dashboard moderno.",
      editorial: "Clima de revista: título grande, hierarquia clara.",
      maximalism: "Cor demais, detalhe demais — e está tudo bem.",
      luxury: "Escuro, dourado e cara de marca premium.",
      "conceptual-sketch": "Rascunho de ideia — linhas soltas, ainda em processo.",
      ethereal: "Leve, suave, com um ar quase sonhador.",
      bohemian: "Aconchegante, terracota e cara de ateliê.",
      victorian: "Ornamento clássico, um pouco teatral.",
      "wabi-sabi": "Simples e imperfeito de propósito — sem polimento demais.",
    },
  },
  contact: {
    eyebrow: "Contato",
    title: "Vamos conversar",
    linkedin: "LinkedIn",
    github: "GitHub",
    instagram: "Instagram",
    email: "Email",
    resumeLink: "Currículo",
    tagline: "Desenvolvimento web e sistemas.",
    copyright: "Todos os direitos reservados.",
  },
  resume: {
    pageTitle: "Currículo",
    downloadPdf: "Baixar PDF",
    downloadingPdf: "Gerando PDF…",
    certificate: "certificado",
    companyInstagram: "Instagram da empresa",
    summaryHeading: "Resumo profissional",
    skillsHeading: "Competências",
    experienceHeading: "Experiência profissional",
    featuredHeading: "Projeto destaque",
    educationHeading: "Formação acadêmica",
    coursesHeading: "Cursos e certificações",
    promptWhoami: "whoami",
    promptSummary: "cat resumo.txt",
    promptSkills: "ls competencias/",
    promptExperience: "cat experiencia.log",
    promptProjects: "cat projetos/destaque",
    promptEducation: "cat formacao.txt",
    promptCourses: "cat cursos.txt",
  },
};

export default pt;
