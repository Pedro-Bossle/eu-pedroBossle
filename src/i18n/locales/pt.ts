export type TranslationKeys = {
  nav: {
    home: string;
    highlights: string;
    cases: string;
    stack: string;
    resume: string;
    contact: string;
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
  };
  contact: {
    eyebrow: string;
    title: string;
    resumeLink: string;
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
    home: "Início",
    highlights: "Destaques",
    cases: "Cases",
    stack: "Stack",
    resume: "Currículo",
    contact: "Contato",
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
      "Apaixonado por soluções tecnológicas, automatizar processos e simplificar fluxos de trabalho.",
    seeProjects: "Ver projetos",
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
  },
  contact: {
    eyebrow: "Contato",
    title: "Vamos conversar",
    resumeLink: "Meu Currículo Virtual",
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
