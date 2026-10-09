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
  const H = (title: string) => {
    section += 1;
    return (
      <h2 className="mt-[18px] mb-1.5 border-b border-[#dfe5e0] pb-1 text-[13.5px] font-extrabold text-[#007a55]">
        {section}. {title}
      </h2>
    );
  };

  return (
    <div
      className="proposal-pdf bg-white text-[#121212]"
      style={{
        fontFamily: "Montserrat, Arial, Helvetica, sans-serif",
        width: 740,
        boxSizing: "border-box",
        padding: "8px 4px",
      }}
    >
      <header className="mb-3.5 flex items-center justify-between gap-4 border-b-[3px] border-[#007a55] pb-3.5">
        <div className="flex items-center gap-3">
          <img
            src={`${import.meta.env.BASE_URL}email/icon-devbossle.png`}
            alt=""
            width={46}
            height={46}
            className="size-[46px] rounded-[11px] object-cover"
          />
          <div>
            <div className="text-xl font-extrabold tracking-[1.5px]">
              PROPOSTA DE PROJETO
            </div>
            <div className="mt-0.5 text-[12.5px] font-semibold text-[#444]">
              {proposal.company || "Projeto de desenvolvimento"}
            </div>
          </div>
        </div>
        <div className="text-right text-[10.5px] leading-relaxed text-[#5b6962]">
          Preparado por {profile.name || ""}
          <br />
          {created.toLocaleDateString("pt-BR")} · Versão{" "}
          {proposal.version || "1"}
          <br />
          Validade: {validity.toLocaleDateString("pt-BR")}
        </div>
      </header>

      {client?.name ? (
        <div className="mb-1.5 rounded-r-lg border-l-4 border-[#007a55] bg-[#f4f6f3] px-3 py-2 text-[11.5px]">
          <b>Para:</b> {client.name}
          {client.company ? ` · ${client.company}` : ""}
        </div>
      ) : null}

      {H("A ideia em resumo")}
      <p className="mb-1.5 text-[11.5px] leading-relaxed">
        {proposal.idea || "Projeto de desenvolvimento web sob medida."}
      </p>

      {H("Escopo do projeto")}
      {scope.length ? (
        <ul className="my-1 list-disc pl-5 text-[11.5px] leading-relaxed">
          {scope.map((item) => (
            <li key={item} className="my-0.5">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-1.5 text-[11.5px] leading-relaxed">
          Escopo definido conforme alinhamento com o cliente.
        </p>
      )}

      {H("Etapas e prazos")}
      {timeline.length ? (
        <ul className="my-1 list-disc pl-5 text-[11.5px] leading-relaxed">
          {timeline.map((item) => (
            <li key={item} className="my-0.5">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-1.5 text-[11.5px] leading-relaxed">
          Prazo a definir após aprovação e recebimento dos materiais.
        </p>
      )}

      {H("Investimento")}
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[#121212] text-left text-white">
            <th className="px-2 py-1.5 font-semibold">Etapa / item</th>
            <th className="px-2 py-1.5 font-semibold">Descrição</th>
            <th className="px-2 py-1.5 text-right font-semibold">Valor</th>
          </tr>
        </thead>
        <tbody>
          {items.length ? (
            items.map((item, i) => (
              <tr key={`${item.name}-${i}`} className="border-b border-[#dfe5e0]">
                <td className="px-2 py-1.5 align-top">{item.name}</td>
                <td className="px-2 py-1.5 align-top">{item.desc}</td>
                <td className="px-2 py-1.5 text-right font-bold align-top">
                  {money(item.value)}
                </td>
              </tr>
            ))
          ) : (
            <tr className="border-b border-[#dfe5e0]">
              <td className="px-2 py-1.5">Desenvolvimento</td>
              <td className="px-2 py-1.5">Projeto conforme escopo descrito</td>
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

      {H("Forma de pagamento")}
      <p className="mb-1.5 text-[11.5px] leading-relaxed">
        {proposal.payment || "A combinar."}
      </p>

      {H("O que preciso do cliente")}
      {needs.length ? (
        <ul className="my-1 list-disc pl-5 text-[11.5px] leading-relaxed">
          {needs.map((item) => (
            <li key={item} className="my-0.5">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-1.5 text-[11.5px] leading-relaxed">
          Materiais, textos, imagens, identidade visual e acessos necessários ao
          projeto.
        </p>
      )}

      {publicLinks.length ? (
        <>
          {H("Páginas teste e apresentações")}
          <ul className="my-1 list-disc pl-5 text-[11.5px] leading-relaxed">
            {publicLinks.map((link) => (
              <li key={`${link.label}-${link.url}`} className="my-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#5b6962]">
                  {LINK_TYPE[link.type] || "Link"}
                </span>
                {" · "}
                <b>{link.label}</b>
                <br />
                <a
                  href={link.url || undefined}
                  className="break-all text-[#007a55]"
                >
                  {link.url}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {H("Observações")}
      <ul className="my-1 list-disc pl-5 text-[11.5px] leading-relaxed">
        {notes.map((item) => (
          <li key={item} className="my-0.5">
            {item}
          </li>
        ))}
      </ul>

      <footer className="mt-[22px] flex justify-between gap-2.5 border-t border-[#ccd3ce] pt-2 text-[10px] text-[#5b6962]">
        <div>
          <b className="text-[#121212]">{profile.name || ""}</b>
          <br />
          {profile.title || ""}
          {profile.phone ? ` · ${profile.phone}` : ""}
          {profile.email ? ` · ${profile.email}` : ""}
        </div>
        <div className="text-right">
          {profile.linkedin || ""}
          <br />
          {profile.portfolio || ""}
        </div>
      </footer>
    </div>
  );
}

export default ProposalPdfDocument;
