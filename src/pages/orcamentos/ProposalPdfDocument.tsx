import type { ReactNode } from "react";
import { maskPhoneBr } from "../../lib/phoneMask";
import type {
  OrcamentoClient,
  OrcamentoProfile,
  OrcamentoProposal,
} from "../../types/orcamentos";
import { money } from "./money";

const LINK_TYPE: Record<string, string> = {
  pagina_teste: "Página teste",
  apresentacao: "Apresentação",
  proposta: "Proposta",
  email: "E-mail",
};

function lines(text: string) {
  return String(text || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

type Props = {
  proposal: OrcamentoProposal;
  client?: OrcamentoClient | null;
  profile: OrcamentoProfile;
};

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section data-pdf-block className="pdf-block mt-[18px]">
      <h2
        data-pdf-atom
        className="mb-1.5 border-b border-[#dfe5e0] pb-1 text-[13.5px] font-extrabold text-[#007a55]"
      >
        {number}. {title}
      </h2>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="my-1 list-disc pl-5 text-[11.5px] leading-relaxed">
      {items.map((item) => (
        <li
          key={item}
          data-pdf-atom
          className="my-0.5 break-words [overflow-wrap:anywhere]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function ProposalPdfDocument({ proposal, client, profile }: Props) {
  const created = proposal.created
    ? new Date(proposal.created)
    : new Date();
  const validity = new Date(created);
  validity.setDate(validity.getDate() + Number(proposal.validity || 7));

  const items = (proposal.items || []).filter(
    (x) => x.name || x.desc || Number(x.value),
  );
  const publicLinks = (proposal.links || []).filter((l) => l.public && l.url);
  const scope = lines(proposal.scope);
  const timeline = lines(proposal.timeline);
  const needs = lines(proposal.needs);
  const notes = lines(
    proposal.notes ||
      "Alterações fora do escopo serão avaliadas e orçadas separadamente.",
  );

  let section = 0;
  const next = () => {
    section += 1;
    return section;
  };

  return (
    <div
      className="proposal-pdf bg-white text-[#121212]"
      style={{
        fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
        width: 680,
        maxWidth: 680,
        boxSizing: "border-box",
        padding: "16px 28px",
        overflow: "hidden",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
      }}
    >
      <header
        data-pdf-block
        className="pdf-block mb-3.5 flex items-start justify-between gap-4 border-b-[3px] border-[#007a55] pb-3.5"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}email/icon-devbossle.png`}
            alt=""
            width={46}
            height={46}
            className="size-[46px] shrink-0 rounded-[11px] object-cover"
          />
          <div className="min-w-0">
            <div className="text-xl font-extrabold tracking-[1.5px]">
              PROPOSTA DE PROJETO
            </div>
            <div className="mt-0.5 break-words text-[12.5px] font-semibold text-[#444]">
              {proposal.company || "Projeto de desenvolvimento"}
            </div>
          </div>
        </div>
        <div className="max-w-[200px] shrink-0 text-right text-[10.5px] leading-relaxed break-words text-[#5b6962]">
          Preparado por {profile.name || ""}
          <br />
          {created.toLocaleDateString("pt-BR")} · Versão{" "}
          {proposal.version || "1"}
          <br />
          Validade: {validity.toLocaleDateString("pt-BR")}
        </div>
      </header>

      {client?.name ? (
        <div
          data-pdf-block
          data-pdf-atom
          className="pdf-block mb-1.5 rounded-r-lg border-l-4 border-[#007a55] bg-[#f4f6f3] px-3 py-2 text-[11.5px] break-words"
        >
          <b>Para:</b> {client.name}
          {client.company ? ` · ${client.company}` : ""}
        </div>
      ) : null}

      <Section number={next()} title="A ideia em resumo">
        <p
          data-pdf-atom
          className="mb-1.5 text-[11.5px] leading-relaxed break-words [overflow-wrap:anywhere]"
        >
          {proposal.idea || "Projeto de desenvolvimento web sob medida."}
        </p>
      </Section>

      <Section number={next()} title="Escopo do projeto">
        {scope.length ? (
          <BulletList items={scope} />
        ) : (
          <p
            data-pdf-atom
            className="mb-1.5 text-[11.5px] leading-relaxed break-words"
          >
            Escopo definido conforme alinhamento com o cliente.
          </p>
        )}
      </Section>

      <Section number={next()} title="Etapas e prazos">
        {timeline.length ? (
          <BulletList items={timeline} />
        ) : (
          <p
            data-pdf-atom
            className="mb-1.5 text-[11.5px] leading-relaxed break-words"
          >
            Prazo a definir após aprovação e recebimento dos materiais.
          </p>
        )}
      </Section>

      <Section number={next()} title="Investimento">
        <div data-pdf-atom className="w-full max-w-full overflow-hidden">
          <table className="w-full table-fixed border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#121212] text-left text-white">
                <th className="w-[28%] px-2 py-1.5 font-semibold">
                  Etapa / item
                </th>
                <th className="w-[50%] px-2 py-1.5 font-semibold">
                  Descrição
                </th>
                <th className="w-[22%] px-2 py-1.5 text-right font-semibold">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item, i) => (
                  <tr
                    key={`${item.name}-${i}`}
                    className="border-b border-[#dfe5e0]"
                  >
                    <td className="px-2 py-1.5 align-top break-words">
                      {item.name}
                    </td>
                    <td className="px-2 py-1.5 align-top break-words">
                      {item.desc}
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold align-top break-words">
                      {money(item.value)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-[#dfe5e0]">
                  <td className="px-2 py-1.5 break-words">Desenvolvimento</td>
                  <td className="px-2 py-1.5 break-words">
                    Projeto conforme escopo descrito
                  </td>
                  <td className="px-2 py-1.5 text-right font-bold">
                    {money(proposal.total)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mt-2 text-right text-sm font-extrabold">
            TOTAL {money(proposal.total)}
          </div>
        </div>
      </Section>

      <Section number={next()} title="Forma de pagamento">
        <p
          data-pdf-atom
          className="mb-1.5 text-[11.5px] leading-relaxed break-words [overflow-wrap:anywhere]"
        >
          {proposal.payment || "A combinar."}
        </p>
      </Section>

      <Section number={next()} title="O que preciso do cliente">
        {needs.length ? (
          <BulletList items={needs} />
        ) : (
          <p
            data-pdf-atom
            className="mb-1.5 text-[11.5px] leading-relaxed break-words"
          >
            Materiais, textos, imagens, identidade visual e acessos necessários
            ao projeto.
          </p>
        )}
      </Section>

      {publicLinks.length ? (
        <Section number={next()} title="Páginas teste e apresentações">
          <ul className="my-1 list-disc pl-5 text-[11.5px] leading-relaxed">
            {publicLinks.map((link) => (
              <li
                key={`${link.label}-${link.url}`}
                data-pdf-atom
                className="my-1 break-words [overflow-wrap:anywhere]"
              >
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#5b6962]">
                  {LINK_TYPE[link.type] || "Link"}
                </span>
                {" · "}
                <b>{link.label}</b>
                <br />
                <a
                  href={link.url || undefined}
                  className="cursor-pointer break-all text-[#007a55]"
                >
                  {link.url}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section number={next()} title="Observações">
        <BulletList items={notes} />
      </Section>

      <footer
        data-pdf-block
        data-pdf-atom
        className="pdf-block mt-[22px] flex justify-between gap-2.5 border-t border-[#ccd3ce] pt-2 text-[10px] text-[#5b6962]"
      >
        <div className="min-w-0 flex-1 break-words">
          <b className="text-[#121212]">{profile.name || ""}</b>
          <br />
          {profile.title || ""}
          {profile.phone ? ` · ${maskPhoneBr(profile.phone)}` : ""}
          {profile.email ? ` · ${profile.email}` : ""}
        </div>
        <div className="min-w-0 max-w-[45%] text-right break-words">
          {profile.linkedin || ""}
          <br />
          {profile.portfolio || ""}
        </div>
      </footer>
    </div>
  );
}

export default ProposalPdfDocument;
