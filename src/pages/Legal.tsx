import type { ReactNode } from "react";
import { Link } from "react-router";
import resumeData from "../data/resume.json";
import type { Resume } from "../types/resume";

const resume = resumeData as Resume;
const UPDATED = "30 de outubro de 2026";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed opacity-80 sm:text-base">
        {children}
      </div>
    </section>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 md:px-8">
      <p className="text-sm font-medium uppercase tracking-widest opacity-60">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-xs opacity-60">Última atualização: {UPDATED}</p>
      <p className="mt-4 text-base leading-relaxed opacity-80">{intro}</p>
      {children}
      <nav
        aria-label="Documentos legais"
        className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-neutral-200 pt-6 text-sm dark:border-neutral-800"
      >
        <Link to="/termos-de-uso" className="underline underline-offset-4">
          Termos de Uso
        </Link>
        <Link to="/politica-de-privacidade" className="underline underline-offset-4">
          Política de Privacidade
        </Link>
        <Link to="/contato" className="underline underline-offset-4">
          Contato
        </Link>
      </nav>
    </article>
  );
}

const mail = (
  <a href={`mailto:${resume.email}`} className="underline underline-offset-4">
    {resume.email}
  </a>
);

export function PrivacyPage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      intro="Esta política explica quais dados pessoais são coletados neste site, por que, com quem são compartilhados e como você pode exercer os seus direitos, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD)."
    >
      <Section title="1. Quem é o responsável">
        <p>
          O controlador dos dados é <strong>Pedro Bossle Sandi</strong> (.dev Bossle), com atuação
          em Caxias do Sul/RS. Para qualquer assunto de privacidade, escreva para {mail}.
        </p>
      </Section>

      <Section title="2. Quais dados coletamos">
        <p>
          <strong>Quando você envia o formulário de contato:</strong>
        </p>
        <Bullets
          items={[
            "nome e e-mail;",
            "a descrição da sua ideia e, se escolhido, o modelo de site de interesse;",
            "endereço IP e data e hora do envio, usados para segurança e para limitar envios em excesso.",
          ]}
        />
        <p>
          <strong>Se você se tornar cliente:</strong> dados necessários para elaborar propostas e
          contratos, como razão social ou nome, documento (CPF/CNPJ), endereço, telefone e e-mail.
        </p>
        <p>
          <strong>Automaticamente:</strong> a hospedagem registra dados técnicos de acesso (IP,
          navegador, páginas e horário) em logs de servidor. O site guarda no seu navegador apenas a
          preferência de idioma. Não usamos cookies de publicidade nem ferramentas de rastreamento
          de comportamento.
        </p>
      </Section>

      <Section title="3. Para que usamos">
        <Bullets
          items={[
            "responder ao seu contato e enviar a proposta ou orçamento solicitado;",
            "elaborar, formalizar e executar o contrato do serviço, se houver contratação;",
            "proteger o site contra abuso, spam e fraude;",
            "cumprir obrigações legais e exercer direitos em eventual disputa.",
          ]}
        />
        <p>
          As bases legais são o seu <strong>consentimento</strong> ao enviar o formulário, a
          realização de <strong>procedimentos preliminares e a execução de contrato</strong> a seu
          pedido, o <strong>legítimo interesse</strong> na segurança do site e o{" "}
          <strong>cumprimento de obrigação legal</strong>, conforme o caso (art. 7º da LGPD).
        </p>
      </Section>

      <Section title="4. Contato comercial a empresas">
        <p>
          Podemos entrar em contato com negócios locais usando dados empresariais publicamente
          disponíveis, como nome do negócio, telefone comercial, perfil comercial em redes sociais e
          endereço, para oferecer sites e serviços relacionados. Esse contato é limitado a um
          primeiro contato e, se houver follow-up, a no máximo um. Se você não quiser ser
          contatado, basta responder pedindo para parar ou escrever para {mail}: seus dados serão
          marcados como &quot;não contatar&quot; e não receberão novas mensagens.
        </p>
      </Section>

      <Section title="5. Com quem compartilhamos">
        <p>
          Não vendemos dados. Usamos prestadores que tratam dados em nosso nome, apenas para
          operar o serviço:
        </p>
        <Bullets
          items={[
            "Vercel: hospedagem do site e das funções de servidor;",
            "Neon: banco de dados onde os contatos e propostas ficam armazenados;",
            "Resend: envio dos e-mails de confirmação e de notificação.",
          ]}
        />
        <p>
          Esses prestadores podem processar dados fora do Brasil. Nesses casos, adotamos
          prestadores que oferecem salvaguardas contratuais adequadas, conforme a LGPD. Também
          podemos compartilhar dados quando a lei ou uma ordem de autoridade exigir.
        </p>
      </Section>

      <Section title="6. Por quanto tempo guardamos">
        <p>
          Contatos que não viram contratação são mantidos por até <strong>12 meses</strong> e depois
          excluídos ou anonimizados. Dados de clientes são mantidos durante o contrato e pelo prazo
          exigido por obrigações legais, fiscais e de defesa em eventual disputa. Logs técnicos são
          mantidos pelo período definido pelo provedor de hospedagem.
        </p>
      </Section>

      <Section title="7. Seus direitos">
        <p>Você pode, a qualquer momento e mediante solicitação a {mail}:</p>
        <Bullets
          items={[
            "confirmar se tratamos seus dados e acessá-los;",
            "corrigir dados incompletos, inexatos ou desatualizados;",
            "pedir anonimização, bloqueio ou eliminação de dados desnecessários;",
            "pedir a portabilidade dos dados;",
            "revogar o consentimento e pedir a eliminação dos dados tratados com base nele;",
            "saber com quem compartilhamos os dados e se pode deixar de consentir.",
          ]}
        />
        <p>
          Respondemos em prazo razoável. Você também pode reclamar à Autoridade Nacional de
          Proteção de Dados (ANPD).
        </p>
      </Section>

      <Section title="8. Segurança">
        <p>
          Adotamos medidas técnicas razoáveis para proteger os dados, como conexão criptografada
          (HTTPS), acesso restrito por autenticação ao painel interno e limitação de tentativas de
          envio. Nenhum sistema é totalmente imune a falhas, e em caso de incidente relevante
          avisaremos os afetados e a ANPD, quando exigido.
        </p>
      </Section>

      <Section title="9. Crianças e adolescentes">
        <p>Este site é voltado a empresas e profissionais e não coleta dados de menores de forma intencional.</p>
      </Section>

      <Section title="10. Alterações">
        <p>
          Podemos atualizar esta política. A data da última atualização fica no topo desta página e
          mudanças relevantes serão destacadas aqui.
        </p>
      </Section>
    </LegalPage>
  );
}

export function TermsPage() {
  return (
    <LegalPage
      title="Termos de Uso"
      intro="Ao usar este site, você concorda com estes termos. Se não concordar, por favor não utilize o site."
    >
      <Section title="1. O que é este site">
        <p>
          O site apresenta os serviços de criação de sites, landing pages e sistemas de{" "}
          <strong>Pedro Bossle Sandi</strong> (.dev Bossle), além de projetos publicados, modelos de
          exemplo e um formulário de contato.
        </p>
      </Section>

      <Section title="2. Modelos de exemplo">
        <p>
          Os modelos exibidos no catálogo usam <strong>dados e marcas fictícios</strong> e servem
          como inspiração. Eles não representam uma oferta com preço, prazo ou escopo fechados.
          Valores, entregas e prazos são definidos somente em proposta ou contrato assinado entre
          as partes.
        </p>
      </Section>

      <Section title="3. Uso do formulário de contato">
        <Bullets
          items={[
            "informe dados verdadeiros e que sejam seus ou que você tenha autorização para informar;",
            "não envie dados sensíveis, senhas, dados bancários ou documentos pelo formulário;",
            "é proibido enviar spam, conteúdo ilegal, ofensivo ou tentar sobrecarregar ou invadir o site;",
            "podemos limitar ou bloquear envios que pareçam abusivos.",
          ]}
        />
        <p>
          O envio do formulário não cria contrato nem obrigação de contratação para nenhuma das
          partes. O tratamento dos seus dados segue a{" "}
          <Link to="/politica-de-privacidade" className="underline underline-offset-4">
            Política de Privacidade
          </Link>
          .
        </p>
      </Section>

      <Section title="4. Propriedade intelectual">
        <p>
          O código, o layout, os textos, as imagens e a identidade do site e dos modelos pertencem
          a Pedro Bossle Sandi ou a seus licenciantes. Marcas e conteúdos de clientes pertencem aos
          respectivos titulares. É proibido copiar, redistribuir ou revender o conteúdo sem
          autorização por escrito. A cessão de direitos de um projeto contratado é regulada no
          contrato respectivo.
        </p>
      </Section>

      <Section title="5. Links e projetos de terceiros">
        <p>
          O site pode apontar para páginas de projetos publicados e serviços de terceiros. Não
          controlamos o conteúdo nem as políticas desses sites e não nos responsabilizamos por eles.
        </p>
      </Section>

      <Section title="6. Disponibilidade e responsabilidade">
        <p>
          Nos esforçamos para manter o site no ar e com informações corretas, mas ele é oferecido
          &quot;como está&quot;, sem garantia de funcionamento ininterrupto. Na extensão permitida
          pela lei, não respondemos por danos indiretos decorrentes do uso do site ou de sua
          indisponibilidade.
        </p>
      </Section>

      <Section title="7. Alterações">
        <p>
          Podemos atualizar estes termos a qualquer momento. A versão vigente é sempre a publicada
          nesta página, com a data da última atualização.
        </p>
      </Section>

      <Section title="8. Lei aplicável e foro">
        <p>
          Estes termos são regidos pelas leis do Brasil. Fica eleito o foro da comarca de Caxias do
          Sul/RS, ressalvado o foro do consumidor quando aplicável.
        </p>
      </Section>

      <Section title="9. Contato">
        <p>Dúvidas sobre estes termos: {mail}.</p>
      </Section>
    </LegalPage>
  );
}
