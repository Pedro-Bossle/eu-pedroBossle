export type TranslationKeys = {
  nav: {
    models: string;
    contactPage: string;
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
    readCase: string;
  };
  cases: {
    eyebrow: string;
    title: string;
    subtitle: string;
    challenge: string;
    solution: string;
    result: string;
    back: string;
    allCases: string;
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
  models: {
    eyebrow: string;
    title: string;
    subtitle: string;
    viewModel: string;
    wantModel: string;
    sampleNote: string;
    ctaTitle: string;
    ctaText: string;
    ctaButton: string;
    notFound: string;
    backToModels: string;
    deviceLabel: string;
    desktop: string;
    mobile: string;
    fullscreen: string;
    items: Record<
      string,
      { name: string; niche: string; pitch: string; features: string[] }
    >;
  };
  form: {
    name: string;
    email: string;
    idea: string;
    ideaPlaceholder: string;
    model: string;
    modelNone: string;
    consentPre: string;
    consentLink: string;
    consentPost: string;
    consentError: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
    rateLimit: string;
    modelPrefix: string;
    noticePre: string;
    noticePost: string;
  };
  contactPage: {
    eyebrow: string;
    title: string;
    subtitle: string;
    formTitle: string;
    formSubtitle: string;
    directTitle: string;
    whyTitle: string;
    whySubtitle: string;
    reasons: { title: string; text: string }[];
    projectsTitle: string;
    projectsSubtitle: string;
    visit: string;
    modelsLink: string;
    skinTitle: string;
    skinDefault: string;
  };
  legal: {
    terms: string;
    privacy: string;
  };
};

const pt: TranslationKeys = {
  nav: {
    models: "Modelos",
    contactPage: "Contato",
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
    role: "Desenvolvedor web em Caxias do Sul",
    tagline:
      "Crio sites e sistemas que transformam processos complexos em soluções simples, rápidas e fáceis de usar.",
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
    readCase: "Ler estudo de caso",
  },
  cases: {
    eyebrow: "Relatos relacionados aos projetos",
    title: "Estudos de Caso",
    subtitle:
      "Aqui você pode ver alguns relatos de usuários das minhas plataformas.",
    challenge: "Desafio",
    solution: "Solução",
    result: "Resultado",
    back: "Voltar aos projetos",
    allCases: "Todos os casos",
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
  models: {
    eyebrow: "Modelos",
    title: "Sem ideia de site? Comece por um modelo",
    subtitle:
      "Modelos prontos para negócios locais. Dá para ver como cada um funciona, escolher o que mais combina com você e eu adapto com as suas cores, fotos e informações.",
    viewModel: "Ver modelo ao vivo",
    wantModel: "Quero um assim",
    sampleNote: "Modelos com dados de exemplo, nada aqui é de um cliente real.",
    ctaTitle: "Sem ideia de site? Pega algum desses modelos aqui como inspiração",
    ctaText:
      "Escolha o modelo mais próximo do seu negócio, conte o que você precisa e eu respondo com uma proposta.",
    ctaButton: "Escolher estilo e enviar",
    notFound: "Modelo não encontrado.",
    backToModels: "Voltar aos modelos",
    deviceLabel: "Tipo de tela",
    desktop: "Computador",
    mobile: "Celular",
    fullscreen: "Abrir em tela cheia",
    items: {
      barbearia: {
        name: "Barbearia e Salão",
        niche: "Beleza",
        pitch: "O cartão de horário vira o agendamento: serviço, barbeiro e hora direto no WhatsApp.",
        features: ["Cartão de horário", "Tabela da casa", "Equipe"],
      },
      assistencia: {
        name: "Assistência Técnica",
        niche: "Celulares e eletrônicos",
        pitch: "Uma bancada de tiles com orçamento na hora e o conserto acompanhado passo a passo.",
        features: ["Orçamento na hora", "Status do conserto", "Garantia"],
      },
      odonto: {
        name: "Clínica Odonto e Estética",
        niche: "Saúde e estética",
        pitch: "A escala de cores dos dentes vira um simulador de clareamento e de plano de tratamento.",
        features: ["Simulador de tom", "Antes e depois", "Tratamentos"],
      },
      oficina: {
        name: "Oficina Mecânica",
        niche: "Automotivo",
        pitch: "O laudo de inspeção vira a página: toque no carro e veja o que é conferido em cada ponto.",
        features: ["Carro interativo", "Laudo de 24 itens", "Preço claro"],
      },
      veterinaria: {
        name: "Clínica Veterinária",
        niche: "Pets",
        pitch: "Capítulos de cor e a carteirinha do pet feita na hora, com plantão e leva e traz.",
        features: ["Carteirinha do pet", "Plantão", "Leva e traz"],
      },
      viagens: {
        name: "Agência de Viagens",
        niche: "Turismo",
        pitch: "Destinos em pôsteres que trocam ao rolar e a passagem montada na hora, do sonho ao embarque.",
        features: ["Destinos", "Monte sua passagem", "Roteiro sob medida"],
      },
    },
  },
  form: {
    name: "Nome",
    email: "E-mail",
    idea: "Sua ideia",
    ideaPlaceholder: "Conte o que você faz e o que precisa: site, landing page, sistema…",
    model: "Modelo de interesse",
    modelNone: "Ainda não sei / outro",
    consentPre: "Li e concordo com a",
    consentLink: "Política de Privacidade",
    consentPost: "e autorizo o contato sobre este pedido.",
    consentError: "Marque a caixa de concordância para enviar.",
    submit: "Enviar mensagem",
    submitting: "Enviando…",
    success: "Mensagem enviada. Em breve entro em contato.",
    error: "Não foi possível enviar. Tente de novo ou use o e-mail direto.",
    rateLimit: "Muitas tentativas. Aguarde um pouco e tente novamente.",
    modelPrefix: "Modelo de interesse",
    noticePre: "Ao enviar, você concorda com a",
    noticePost: "e com o contato sobre este pedido.",
  },
  contactPage: {
    eyebrow: "Contato",
    title: "Vamos tirar o seu site do papel",
    subtitle:
      "Preencha o formulário e eu respondo por e-mail. Quanto mais você contar sobre o seu negócio, mais certeira é a proposta.",
    formTitle: "Peça seu orçamento",
    formSubtitle: "Leva menos de um minuto. Sem compromisso.",
    directTitle: "Prefere falar direto?",
    whyTitle: "Por que ter um site",
    whySubtitle:
      "Rede social ajuda, mas não substitui um endereço seu na internet. Estes são os motivos mais comuns.",
    reasons: [
      {
        title: "Ser encontrado no Google",
        text: "Quem procura o seu serviço na sua cidade acha você, e não só quem já te segue.",
      },
      {
        title: "Passar confiança",
        text: "Um site mostra que o negócio é sério e dá ao cliente um lugar para conferir serviços, fotos e avaliações.",
      },
      {
        title: "Menos perguntas repetidas",
        text: "Preços, horários, endereço e como funciona ficam à vista, e o WhatsApp só recebe quem já decidiu.",
      },
      {
        title: "Vender e agendar sozinho",
        text: "Botão direto para pedido, agendamento ou orçamento, funcionando 24 horas por dia.",
      },
      {
        title: "Um canal que é seu",
        text: "Perfil de rede social pode mudar, cair ou perder alcance. O seu site fica no seu nome e sob o seu controle.",
      },
      {
        title: "Informação sempre atualizada",
        text: "Mudou o preço ou o horário? Troca em um lugar só, em vez de refazer arte e postagem.",
      },
    ],
    projectsTitle: "Projetos no ar",
    projectsSubtitle: "Alguns trabalhos publicados, para você ver como ficam na prática.",
    visit: "Visitar",
    modelsLink: "Ver os modelos",
    skinTitle: "Estilo da página",
    skinDefault: "Padrão",
  },
  legal: {
    terms: "Termos de Uso",
    privacy: "Política de Privacidade",
  },
};

export default pt;
