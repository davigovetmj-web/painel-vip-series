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

        <div className="mb-8 flex items-start justify-between gap-4">
  <div>
    <h1 className="text-3xl font-bold">
      Painel Vip Séries
    </h1>

    <p className="mt-2 text-zinc-400">
      Visão geral da sua comunidade
    </p>
  </div>

  <LogoutButton />
</div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">
              Clientes cadastrados
            </p>
            <p className="mt-2 text-4xl font-bold">
              {total}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">
              Clientes ativos
            </p>
            <p className="mt-2 text-4xl font-bold">
              {ativos}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">
              Clientes vencidos
            </p>
            <p className="mt-2 text-4xl font-bold">
              {vencidos}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">
              Reembolsados
            </p>
            <p className="mt-2 text-4xl font-bold">
              {reembolsados}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">
              Outros status
            </p>
            <p className="mt-2 text-4xl font-bold">
              {outros}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">
              ⏰ Vencem hoje
            </p>
            <p className="mt-2 text-4xl font-bold">
              {vencemHoje}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">
              ⚠️ Vencem nos próximos 3 dias
            </p>
            <p className="mt-2 text-4xl font-bold">
              {vencem3Dias}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">
              📅 Vencem entre 4 e 7 dias
            </p>
            <p className="mt-2 text-4xl font-bold">
              {vencem7Dias}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold">
            💰 Pagamentos
          </h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-sm text-zinc-400">
                Pagamentos aprovados este mês
              </p>

              <p className="mt-2 text-4xl font-bold">
                {pagamentosMes.length}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-sm text-zinc-400">
                Receita aprovada este mês
              </p>

              <p className="mt-2 text-4xl font-bold">
                {receitaMes.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-sm text-zinc-400">
                🔄 Renovações este mês
              </p>

              <p className="mt-2 text-4xl font-bold">
                {renovacoesMes.length}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-sm text-zinc-400">
                💰 Receita de renovações
              </p>

              <p className="mt-2 text-4xl font-bold">
                {receitaRenovacoesMes.toLocaleString(
                  "pt-BR",
                  {
                    style: "currency",
                    currency: "BRL",
                  }
                )}
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