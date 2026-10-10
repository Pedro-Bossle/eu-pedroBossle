import type { ReactNode } from "react";
import type { ContractPayload } from "../../lib/orcamentos/contractData";

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div
      data-pdf-atom
      className="grid grid-cols-[140px_1fr] gap-2 border-b border-[#d0d8d3] py-1.5 text-[11px] leading-relaxed"
    >
      <div className="font-bold text-[#4a5650]">{label}</div>
      <div className="break-words text-[#0a0f0c]">{value}</div>
    </div>
  );
}

function Clause({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section data-pdf-block className="mt-4">
      <h2
        data-pdf-atom
        className="mb-1.5 text-[12.5px] font-extrabold text-[#007a55]"
      >
        {title}
      </h2>
      <div className="space-y-1.5 text-[11px] leading-relaxed text-[#0a0f0c]">
        {children}
      </div>
    </section>
  );
}

function ContractDocument({ data }: { data: ContractPayload }) {
  return (
    <div
      className="contract-pdf bg-white text-[#0a0f0c]"
      style={{
        fontFamily: "Calibri, Arial, Helvetica, sans-serif",
        width: 680,
        maxWidth: 680,
        boxSizing: "border-box",
        padding: "16px 28px",
        overflow: "hidden",
        wordBreak: "break-word",
      }}
    >
      <header
        data-pdf-block
        className="mb-4 bg-[#007a55] px-4 py-3.5 text-center text-white"
      >
        <div className="text-[15px] font-extrabold tracking-wide">
          CONTRATO DE PRESTAÇÃO DE SERVIÇOS
        </div>
        <div className="mt-1 text-[11px] font-semibold opacity-95">
          {data.titleKind}
        </div>
      </header>

      <section data-pdf-block>
        <h2
          data-pdf-atom
          className="mb-2 text-[12.5px] font-extrabold text-[#007a55]"
        >
          IDENTIFICAÇÃO DAS PARTES
        </h2>
        <p data-pdf-atom className="mb-2 text-[11px] font-bold">
          Prestador de Serviços
        </p>
        <Row label="Nome" value={data.prestador.name} />
        <Row label="CPF" value={data.prestador.document} />
        <Row label="Endereço" value={data.prestador.address} />
        <Row label="E-mail" value={data.prestador.email} />
        <Row label="Telefone" value={data.prestador.phone} />
        <Row label="Atividade" value={data.prestador.activity} />

        <p data-pdf-atom className="mb-2 mt-4 text-[11px] font-bold">
          Contratante
        </p>
        <Row label="Nome / Razão social" value={data.contratante.name} />
        {data.contratante.contactName &&
        data.contratante.contactName !== data.contratante.name ? (
          <Row label="Contato" value={data.contratante.contactName} />
        ) : null}
        <Row
          label={data.contratante.documentLabel}
          value={data.contratante.document}
        />
        <Row label="Endereço" value={data.contratante.address} />
        <Row label="E-mail" value={data.contratante.email} />
        <Row label="Telefone" value={data.contratante.phone} />
      </section>

      <p data-pdf-atom className="mt-3 text-[11px] leading-relaxed">
        Denominados conjuntamente como “Partes”, têm entre si justo e contratado
        o seguinte:
      </p>

      <Clause title="Cláusula 1ª — OBJETO DO CONTRATO">
        <p data-pdf-atom>
          O prestador obriga-se a executar os seguintes serviços de
          desenvolvimento web para o contratante, referentes ao projeto{" "}
          <b>{data.projectName}</b>:
        </p>
        <p data-pdf-atom>{data.objectBody}</p>
        {data.scopeLines.length ? (
          <ul className="my-1 list-disc pl-5">
            {data.scopeLines.map((item) => (
              <li key={item} data-pdf-atom className="my-0.5">
                {item}
              </li>
            ))}
          </ul>
        ) : null}
        <p data-pdf-atom>
          Quaisquer funcionalidades não descritas acima serão consideradas
          alterações de escopo e deverão ser formalizadas em aditivo escrito,
          com novo prazo e valor.
        </p>
      </Clause>

      <Clause title="Cláusula 2ª — PRAZO DE EXECUÇÃO">
        <p data-pdf-atom>
          O prazo de execução é de <b>{data.deadlineLabel}</b>, contados a
          partir da assinatura do contrato e do recebimento do material pelo
          contratante.
        </p>
        {data.timelineLines.length ? (
          <>
            <p data-pdf-atom>Cronograma previsto (Anexo I / proposta):</p>
            <ul className="my-1 list-disc pl-5">
              {data.timelineLines.map((item) => (
                <li key={item} data-pdf-atom className="my-0.5">
                  {item}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p data-pdf-atom>
          O prazo somente terá início após o recebimento integral dos materiais
          solicitados ao contratante. Atrasos na entrega de materiais prorrogam
          automaticamente o prazo na mesma proporção.
        </p>
        <p data-pdf-atom>
          São previstas 2 (duas) rodadas de revisão por fase entregue, no prazo
          de 5 (cinco) dias úteis após cada entrega. Pedidos de alteração que
          representem mudança de escopo ou após esgotadas as rodadas previstas
          serão cobrados à parte.
        </p>
      </Clause>

      <Clause title="Cláusula 3ª — VALOR E FORMA DE PAGAMENTO">
        <p data-pdf-atom>
          O valor total dos serviços é de <b>{data.totalLabel}</b>, a ser pago
          da seguinte forma:
        </p>
        <p data-pdf-atom>{data.payment}</p>
        {data.items.length ? (
          <ul className="my-1 list-disc pl-5">
            {data.items.map((item, i) => (
              <li key={`${item.name}-${i}`} data-pdf-atom className="my-0.5">
                {item.name}
                {item.desc ? ` — ${item.desc}` : ""}
                {Number(item.value)
                  ? ` · ${moneyBrlInline(item.value)}`
                  : ""}
              </li>
            ))}
          </ul>
        ) : null}
        <p data-pdf-atom>
          O não pagamento na data acordada ensejará multa moratória de 2% (dois
          por cento) sobre o valor vencido, acrescida de juros de 1% (um por
          cento) ao mês, pro rata die.
        </p>
        <p data-pdf-atom>
          Os serviços só são entregues ou publicados após a confirmação integral
          dos pagamentos devidos em cada fase.
        </p>
      </Clause>

      <Clause title="Cláusula 4ª — OBRIGAÇÕES DO PRESTADOR">
        <ul className="list-disc pl-5">
          {[
            "Executar os serviços conforme o escopo definido na Cláusula 1ª, com qualidade e dentro do prazo.",
            "Manter sigilo sobre informações confidenciais do contratante, exceto quando exigido por lei ou ordem judicial.",
            "Comunicar ao contratante qualquer dificuldade técnica relevante que possa impactar o prazo, com a maior brevidade possível.",
            "Entregar os arquivos-fonte e credenciais ao contratante após a quitação integral do contrato.",
            "Corrigir, sem custo adicional, defeitos funcionais identificados em até 30 (trinta) dias após a entrega final.",
          ].map((t) => (
            <li key={t} data-pdf-atom className="my-0.5">
              {t}
            </li>
          ))}
        </ul>
      </Clause>

      <Clause title="Cláusula 5ª — OBRIGAÇÕES DO CONTRATANTE">
        <ul className="list-disc pl-5">
          {[
            "Fornecer todos os materiais necessários (textos, imagens, logotipos, acessos) no prazo combinado.",
            ...(data.needsLines.length
              ? data.needsLines.map((n) => n)
              : [
                  "Participar das reuniões e realizar as aprovações dentro dos prazos estabelecidos.",
                ]),
            "Efetuar os pagamentos nas datas acordadas.",
            "Informar ao prestador qualquer alteração de requisito com a maior antecedência possível.",
            "Manter ativos o domínio, a hospedagem e demais serviços de terceiros necessários à operação do produto entregue.",
          ].map((t) => (
            <li key={t} data-pdf-atom className="my-0.5">
              {t}
            </li>
          ))}
        </ul>
      </Clause>

      <Clause title="Cláusula 6ª — PROPRIEDADE INTELECTUAL">
        <p data-pdf-atom>
          A propriedade do produto final (design, código e demais entregáveis)
          será transferida integralmente ao contratante após a quitação total do
          valor contratado.
        </p>
        <p data-pdf-atom>
          Até a quitação, todos os artefatos permanecem de propriedade do
          prestador e não poderão ser utilizados, publicados ou cedidos a
          terceiros.
        </p>
        <p data-pdf-atom>
          O prestador poderá incluir referência ao projeto em seu portfólio,
          salvo oposição expressa e por escrito do contratante feita até 30
          (trinta) dias após a entrega final.
        </p>
        <p data-pdf-atom>
          Ferramentas, bibliotecas e componentes de terceiros utilizados no
          projeto permanecem sujeitos às suas licenças originais, das quais o
          contratante é informado.
        </p>
      </Clause>

      <Clause title="Cláusula 7ª — SERVIÇOS NÃO INCLUÍDOS">
        <p data-pdf-atom>
          Salvo cláusula em contrário, não fazem parte do escopo:
        </p>
        <ul className="list-disc pl-5">
          {(data.notesLines.length
            ? data.notesLines
            : [
                "Registro de domínio e contratação ou renovação de hospedagem.",
                "Criação de identidade visual, logotipo ou material gráfico para impressão.",
                "Produção ou curadoria de textos, imagens e vídeos.",
                "Integração com sistemas de terceiros não especificados no escopo.",
                "Treinamento presencial, suporte técnico contínuo ou manutenção mensal.",
                "Emissão de nota fiscal (o prestador atua como pessoa física autônoma; retenções de ISS e/ou INSS, quando aplicáveis, são de responsabilidade do contratante, conforme legislação vigente).",
              ]
          ).map((t) => (
            <li key={t} data-pdf-atom className="my-0.5">
              {t}
            </li>
          ))}
        </ul>
      </Clause>

      <Clause title="Cláusula 8ª — RESCISÃO">
        <p data-pdf-atom>
          Este contrato poderá ser rescindido por qualquer das Partes mediante
          notificação escrita com antecedência mínima de 15 (quinze) dias, nos
          casos de inadimplemento não sanado em até 10 (dez) dias após
          notificação, acordo mútuo ou caso fortuito/força maior.
        </p>
        <p data-pdf-atom>
          Na hipótese de rescisão pelo contratante sem justa causa, serão
          devidos ao prestador os valores proporcionais aos serviços já
          executados, acrescidos de multa rescisória de 20% (vinte por cento)
          sobre o valor restante. Na hipótese de rescisão pelo prestador sem
          justa causa, o prestador restituirá os valores recebidos pelos
          serviços ainda não executados.
        </p>
      </Clause>

      <Clause title="Cláusula 9ª — CONFIDENCIALIDADE">
        <p data-pdf-atom>
          As Partes comprometem-se a guardar sigilo sobre todas as informações
          trocadas em razão deste contrato, pelo prazo de 2 (dois) anos após o
          encerramento, salvo informações de domínio público ou divulgação
          exigida por lei, ordem judicial ou autoridade competente.
        </p>
      </Clause>

      <Clause title="Cláusula 10ª — DISPOSIÇÕES GERAIS">
        <p data-pdf-atom>
          Este instrumento constitui o acordo integral entre as Partes sobre o
          objeto, substituindo entendimentos anteriores. Qualquer alteração
          deverá ser formalizada por escrito (incluindo e-mail ou aplicativo de
          mensagens com registro de data e identidade das Partes).
        </p>
        <p data-pdf-atom>
          O prestador <b>não é empregado do contratante</b> e não haverá relação
          trabalhista, previdenciária ou de subordinação entre as Partes em
          razão deste contrato, caracterizando prestação de serviço autônomo.
        </p>
        <p data-pdf-atom className="text-[10px] text-[#4a5650]">
          Referência da proposta: {data.proposalRef}.
        </p>
      </Clause>

      <Clause title="Cláusula 11ª — FORO">
        <p data-pdf-atom>
          As Partes elegem o foro da comarca de {data.city} para dirimir
          quaisquer litígios decorrentes deste contrato, renunciando a qualquer
          outro, por mais privilegiado que seja.
        </p>
      </Clause>

      <section data-pdf-block className="mt-6">
        <h2
          data-pdf-atom
          className="mb-2 text-[12.5px] font-extrabold text-[#007a55]"
        >
          ASSINATURAS
        </h2>
        <p data-pdf-atom className="mb-6 text-[11px]">
          {data.city}, {data.dateLabel}.
        </p>
        <div className="grid grid-cols-2 gap-8">
          <div data-pdf-atom>
            <div className="mb-8 border-b border-[#d0d8d3]" />
            <div className="text-[11px] font-bold">Prestador de Serviços</div>
            <div className="text-[10px] text-[#4a5650]">
              {data.prestador.name}
            </div>
          </div>
          <div data-pdf-atom>
            <div className="mb-8 border-b border-[#d0d8d3]" />
            <div className="text-[11px] font-bold">Contratante</div>
            <div className="text-[10px] text-[#4a5650]">
              {data.contratante.name}
            </div>
          </div>
        </div>
        <p data-pdf-atom className="mt-6 text-[10px] text-[#4a5650]">
          Testemunhas (opcional):
        </p>
        <div className="mt-3 grid grid-cols-2 gap-8">
          <div data-pdf-atom>
            <div className="mb-8 border-b border-[#d0d8d3]" />
            <div className="text-[11px] font-bold">Testemunha 1</div>
          </div>
          <div data-pdf-atom>
            <div className="mb-8 border-b border-[#d0d8d3]" />
            <div className="text-[11px] font-bold">Testemunha 2</div>
          </div>
        </div>
      </section>
    </div>
  );
}

function moneyBrlInline(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default ContractDocument;
