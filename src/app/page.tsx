import { supabaseAdmin } from "@/lib/supabase-admin";
import ClientesTable from "@/components/clientes-table";
import AutoRefresh from "@/components/auto-refresh";
import LogoutButton from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PayloadPagamento = {
  sale_amount?: number | string;

  customer?: {
    name?: string;
    email?: string;
  };

  product?: {
    name?: string;
    price?: number | string;
  };
};
  
export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("nome, email, plano, status, data_vencimento")
    .order("data_vencimento", { ascending: true });

  const {
    data: pagamentos,
    error: erroPagamentos,
  } = await supabaseAdmin
    .from("webhook_events")
    .select(
      "id, created_at, event, external_id, payload, processed, tipo_pagamento"
    )
    .eq("gateway", "lowify")
    .eq("event", "sale.paid")
    .eq("processed", true)
    .order("created_at", { ascending: false });

  const erro = error || erroPagamentos;

  if (erro) {
    return (
      <main className="min-h-screen bg-black p-8 text-white">
        <h1 className="text-3xl font-bold">
          Painel Vip Séries
        </h1>

        <p className="mt-6 text-red-400">
          Erro ao carregar os dados:
        </p>

        <p className="mt-2">
          {erro.message}
        </p>
      </main>
    );
  }

  const clientes = data ?? [];
  const pagamentosAprovados = pagamentos ?? [];

  const agora = new Date();

  const inicioMes = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    1
  );

  const pagamentosMes = pagamentosAprovados.filter(
    (pagamento) =>
      new Date(pagamento.created_at) >= inicioMes
  );

  function pegarValor(payloadOriginal: unknown) {
    const payload = payloadOriginal as PayloadPagamento | null;

    return (
      Number(payload?.sale_amount) ||
      Number(payload?.product?.price) ||
      0
    );
  }

  const receitaMes = pagamentosMes.reduce(
    (total, pagamento) =>
      total + pegarValor(pagamento.payload),
    0
  );


  const partesDataSaoPaulo =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(new Date());


  const anoAtual =
    Number(
      partesDataSaoPaulo.find(
        (parte) => parte.type === "year"
      )?.value ?? 0
    );


  const mesAtual =
    Number(
      partesDataSaoPaulo.find(
        (parte) => parte.type === "month"
      )?.value ?? 0
    );


  const diaAtualMes =
    Math.max(
      1,
      Number(
        partesDataSaoPaulo.find(
          (parte) => parte.type === "day"
        )?.value ?? 1
      )
    );


  const diasNoMes =
    new Date(
      Date.UTC(
        anoAtual,
        mesAtual,
        0
      )
    ).getUTCDate();


  const receitaEstimadaMes =
    receitaMes > 0
      ? (
          receitaMes /
          diaAtualMes
        ) *
        diasNoMes
      : 0;

  const renovacoesMes = pagamentosMes.filter(
    (pagamento) =>
      pagamento.tipo_pagamento === "renovacao"
  );

  const receitaRenovacoesMes = renovacoesMes.reduce(
    (total, pagamento) =>
      total + pegarValor(pagamento.payload),
    0
  );
const ultimasVendas = pagamentosAprovados.slice(0, 10);

function formatarDataHora(data: string) {
  return new Date(data).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pegarDetalhesPagamento(payloadOriginal: unknown) {
  const payload =
    payloadOriginal as PayloadPagamento | null;

  const nome =
    payload?.customer?.name || "Cliente";

  const produto =
    payload?.product?.name || "Plano não identificado";

  let plano = produto;

  const produtoMinusculo = produto.toLowerCase();

  if (produtoMinusculo.includes("mensal")) {
    plano = "Mensal";
  } else if (produtoMinusculo.includes("trimestral")) {
    plano = "Trimestral";
  } else if (produtoMinusculo.includes("anual")) {
    plano = "Anual";
  }

  return {
    nome,
    plano,
    valor: pegarValor(payloadOriginal),
  };
}
  const total = clientes.length;

  const ativos = clientes.filter(
    (cliente) => cliente.status === "ativo"
  ).length;

  const vencidos = clientes.filter(
    (cliente) => cliente.status === "vencido"
  ).length;

  const reembolsados = clientes.filter(
    (cliente) => cliente.status === "reembolsado"
  ).length;

  const outros =
    total - ativos - vencidos - reembolsados;
const mensal = clientes.filter(
  (cliente) =>
    cliente.status === "ativo" &&
    cliente.plano?.toLowerCase() === "mensal"
).length;

const trimestral = clientes.filter(
  (cliente) =>
    cliente.status === "ativo" &&
    cliente.plano?.toLowerCase() === "trimestral"
).length;

const anual = clientes.filter(
  (cliente) =>
    cliente.status === "ativo" &&
    cliente.plano?.toLowerCase() === "anual"
).length;
  const hojeTexto = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const hoje = new Date(`${hojeTexto}T00:00:00`);

  function diferencaEmDias(
    dataVencimento: string | null
  ) {
    if (!dataVencimento) return null;

    const vencimentoTexto =
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(dataVencimento));

    const vencimento = new Date(
      `${vencimentoTexto}T00:00:00`
    );

    return Math.round(
      (vencimento.getTime() - hoje.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  }

  const vencemHoje = clientes.filter((cliente) => {
    return (
      cliente.status === "ativo" &&
      diferencaEmDias(cliente.data_vencimento) === 0
    );
  }).length;

  const vencem3Dias = clientes.filter((cliente) => {
    const dias = diferencaEmDias(
      cliente.data_vencimento
    );

    return (
      cliente.status === "ativo" &&
      dias !== null &&
      dias >= 1 &&
      dias <= 3
    );
  }).length;

  const vencem7Dias = clientes.filter((cliente) => {
    const dias = diferencaEmDias(
      cliente.data_vencimento
    );

    return (
      cliente.status === "ativo" &&
      dias !== null &&
      dias >= 4 &&
      dias <= 7
    );
  }).length;

  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <AutoRefresh />

        <div className="mb-8 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 shadow-2xl">
  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-700 text-lg font-black shadow-lg">
        VIP
      </div>

      <div>
        <p className="text-sm font-medium text-fuchsia-400">
          DRAMAS PRIME
        </p>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Painel Vip Séries
        </h1>

        <p className="mt-1 text-sm text-zinc-400">
          Clientes, assinaturas e pagamentos em um só lugar
        </p>
      </div>
    </div>

    <LogoutButton />
  </div>
</div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

  {/* Clientes cadastrados */}
  <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-zinc-900 to-purple-950/20 p-5 transition duration-200 hover:-translate-y-1 hover:border-purple-500/50">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-xl">
        👥
      </div>

      <span className="text-xs font-medium text-purple-400">
        TOTAL
      </span>
    </div>

    <p className="text-sm text-zinc-400">
      Clientes cadastrados
    </p>

    <p className="mt-2 text-3xl font-bold">
      {total}
    </p>
  </div>


  {/* Clientes ativos */}
  <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-zinc-900 to-emerald-950/20 p-5 transition duration-200 hover:-translate-y-1 hover:border-emerald-500/50">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-xl">
        ✅
      </div>

      <span className="text-xs font-medium text-emerald-400">
        ATIVOS
      </span>
    </div>

    <p className="text-sm text-zinc-400">
      Clientes ativos
    </p>

    <p className="mt-2 text-3xl font-bold text-emerald-400">
      {ativos}
    </p>
  </div>


  {/* Clientes vencidos */}
  <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-zinc-900 to-red-950/20 p-5 transition duration-200 hover:-translate-y-1 hover:border-red-500/50">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-xl">
        ⛔
      </div>

      <span className="text-xs font-medium text-red-400">
        VENCIDOS
      </span>
    </div>

    <p className="text-sm text-zinc-400">
      Clientes vencidos
    </p>

    <p className="mt-2 text-3xl font-bold text-red-400">
      {vencidos}
    </p>
  </div>


  {/* Reembolsados */}
  <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-zinc-900 to-orange-950/20 p-5 transition duration-200 hover:-translate-y-1 hover:border-orange-500/50">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-xl">
        ↩️
      </div>

      <span className="text-xs font-medium text-orange-400">
        REEMBOLSO
      </span>
    </div>

    <p className="text-sm text-zinc-400">
      Reembolsados
    </p>

    <p className="mt-2 text-3xl font-bold text-orange-400">
      {reembolsados}
    </p>
  </div>


  {/* Outros status */}
  <div className="rounded-2xl border border-zinc-700 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 transition duration-200 hover:-translate-y-1 hover:border-zinc-500">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-xl">
        •••
      </div>

      <span className="text-xs font-medium text-zinc-400">
        OUTROS
      </span>
    </div>

    <p className="text-sm text-zinc-400">
      Outros status
    </p>

    <p className="mt-2 text-3xl font-bold">
      {outros}
    </p>
  </div>

</div>

       <div className="mt-8 grid gap-4 md:grid-cols-3">

  {/* Vencem hoje */}
  <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-zinc-900 to-red-950/20 p-5 transition duration-200 hover:-translate-y-1 hover:border-red-500/50">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-xl">
        ⏰
      </div>

      <span className="text-xs font-medium text-red-400">
        URGENTE
      </span>
    </div>

    <p className="text-sm text-zinc-400">
      Vencem hoje
    </p>

    <p className="mt-2 text-3xl font-bold text-red-400">
      {vencemHoje}
    </p>
  </div>


  {/* Próximos 3 dias */}
  <div className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-zinc-900 to-yellow-950/20 p-5 transition duration-200 hover:-translate-y-1 hover:border-yellow-500/50">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 text-xl">
        ⚠️
      </div>

      <span className="text-xs font-medium text-yellow-400">
        ATENÇÃO
      </span>
    </div>

    <p className="text-sm text-zinc-400">
      Vencem nos próximos 3 dias
    </p>

    <p className="mt-2 text-3xl font-bold text-yellow-400">
      {vencem3Dias}
    </p>
  </div>


  {/* Entre 4 e 7 dias */}
  <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-zinc-900 to-blue-950/20 p-5 transition duration-200 hover:-translate-y-1 hover:border-blue-500/50">
    <div className="mb-4 flex items-center justify-between">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-xl">
        📅
      </div>

      <span className="text-xs font-medium text-blue-400">
        EM BREVE
      </span>
    </div>

    <p className="text-sm text-zinc-400">
      Vencem entre 4 e 7 dias
    </p>

    <p className="mt-2 text-3xl font-bold text-blue-400">
      {vencem7Dias}
    </p>
  </div>

</div>

 {/* PAGAMENTOS */}
<div className="mt-10">
  <div className="mb-4">
    <h2 className="text-xl font-bold">
      💰 Pagamentos
    </h2>

    <p className="mt-1 text-sm text-zinc-400">
      Resumo financeiro do mês atual
    </p>
  </div>

  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

    {/* Pagamentos aprovados */}
    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-zinc-900 to-purple-950/20 p-5 transition duration-200 hover:-translate-y-1 hover:border-purple-500/50">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-xl">
          💳
        </div>

        <span className="text-xs font-medium text-purple-400">
          VENDAS
        </span>
      </div>

      <p className="text-sm text-zinc-400">
        Pagamentos aprovados este mês
      </p>

      <p className="mt-2 text-3xl font-bold">
        {pagamentosMes.length}
      </p>
    </div>


    {/* Receita aprovada */}
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-zinc-900 to-emerald-950/30 p-5 shadow-lg shadow-emerald-950/20 transition duration-200 hover:-translate-y-1 hover:border-emerald-500/60">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-xl">
          💰
        </div>

        <span className="text-xs font-medium text-emerald-400">
          RECEITA
        </span>
      </div>

      <p className="text-sm text-zinc-400">
        Receita aprovada este mês
      </p>

      <p className="mt-2 text-3xl font-bold text-emerald-400">
        {receitaMes.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </p>
    </div>


    {/* Receita estimada */}
    <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-zinc-900 to-fuchsia-950/20 p-5 transition duration-200 hover:-translate-y-1 hover:border-fuchsia-500/50">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/10 text-xl">
          📈
        </div>

        <span className="text-xs font-medium text-fuchsia-400">
          PROJEÇÃO
        </span>
      </div>

      <p className="text-sm text-zinc-400">
        Receita estimada para este mês
      </p>

      <p className="mt-2 text-3xl font-bold text-fuchsia-400">
        {receitaEstimadaMes.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </p>

      <p className="mt-2 text-xs text-zinc-500">
        Mantendo o ritmo atual de vendas
      </p>
    </div>


    {/* Renovações */}
    <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-zinc-900 to-blue-950/20 p-5 transition duration-200 hover:-translate-y-1 hover:border-blue-500/50">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-xl">
          🔄
        </div>

        <span className="text-xs font-medium text-blue-400">
          RENOVAÇÕES
        </span>
      </div>

      <p className="text-sm text-zinc-400">
        Renovações este mês
      </p>

      <p className="mt-2 text-3xl font-bold text-blue-400">
        {renovacoesMes.length}
      </p>
    </div>


    {/* Receita de renovações */}
    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-zinc-900 to-amber-950/20 p-5 transition duration-200 hover:-translate-y-1 hover:border-amber-500/50">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-xl">
          🪙
        </div>

        <span className="text-xs font-medium text-amber-400">
          RENOVAÇÃO
        </span>
      </div>

      <p className="text-sm text-zinc-400">
        Receita de renovações
      </p>

      <p className="mt-2 text-3xl font-bold text-amber-400">
        {receitaRenovacoesMes.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </p>
    </div>

  </div>
</div>       

<div className="mt-10">
  <div className="mb-4">
    <h2 className="text-xl font-bold">
      🧾 Últimas vendas
    </h2>

    <p className="mt-1 text-sm text-zinc-400">
      Os 10 pagamentos aprovados mais recentes
    </p>
  </div>

  <div className="overflow-x-auto rounded-2xl border border-zinc-800">
    <table className="w-full text-left">

      <thead className="bg-zinc-900 text-sm text-zinc-400">
        <tr>
          <th className="p-4">Cliente</th>
          <th className="p-4">Plano</th>
          <th className="p-4">Valor</th>
          <th className="p-4">Tipo</th>
          <th className="p-4">Data</th>
        </tr>
      </thead>

      <tbody>
        {ultimasVendas.map((pagamento) => {
          const detalhes =
            pegarDetalhesPagamento(pagamento.payload);

          const renovacao =
            pagamento.tipo_pagamento === "renovacao";

          return (
            <tr
              key={pagamento.id}
              className="border-t border-zinc-800 bg-zinc-950"
            >
              <td className="p-4">
                {detalhes.nome}
              </td>

              <td className="p-4">
                {detalhes.plano}
              </td>

              <td className="p-4 font-semibold">
                {detalhes.valor.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </td>

              <td className="p-4">
                <span
                  className={
                    renovacao
                      ? "rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400"
                      : "rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400"
                  }
                >
                  {renovacao ? "Renovação" : "Venda"}
                </span>
              </td>

              <td className="p-4 text-zinc-300">
                {formatarDataHora(
                  pagamento.created_at
                )}
              </td>
            </tr>
          );
        })}
      </tbody>

    </table>
  </div>
</div>

        <ClientesTable clientes={clientes} />
      </div>
    </main>
  );
}