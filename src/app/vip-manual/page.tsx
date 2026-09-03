import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import Link from "next/link";

import {
  cadastrarVipManual,
} from "./actions";

import ConfirmarPagamentoManualButton from "@/components/confirmar-pagamento-manual-button";
import ReenviarAcessoManualButton from "@/components/reenviar-acesso-manual-button";


export const dynamic = "force-dynamic";


function formatarData(
  data: string | null
) {
  if (!data) {
    return "-";
  }

  const [
    ano,
    mes,
    dia,
  ] =
    data
      .slice(0, 10)
      .split("-");

  return `${dia}/${mes}/${ano}`;
}


function dataHojeSaoPaulo() {
  const partes =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Sao_Paulo",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit"
      }
    ).formatToParts(
      new Date()
    );

  const ano =
    partes.find(
      (parte) =>
        parte.type === "year"
    )?.value;

  const mes =
    partes.find(
      (parte) =>
        parte.type === "month"
    )?.value;

  const dia =
    partes.find(
      (parte) =>
        parte.type === "day"
    )?.value;

  if (
    !ano ||
    !mes ||
    !dia
  ) {
    throw new Error(
      "Não foi possível obter a data atual."
    );
  }

  return `${ano}-${mes}-${dia}`;
}


function adicionarDiasISO(
  dataISO: string,
  dias: number
) {
  const [
    ano,
    mes,
    dia
  ] =
    dataISO
      .split("-")
      .map(Number);

  const data =
    new Date(
      Date.UTC(
        ano,
        mes - 1,
        dia
      )
    );

  data.setUTCDate(
    data.getUTCDate() +
    dias
  );

  return data
    .toISOString()
    .slice(0, 10);
}


type VipManualPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    plano?: string;
    vencimento?: string;
  }>;
};


export default async function VipManualPage({
  searchParams
}: VipManualPageProps) {

  const params =
    (await searchParams) ??
    {};


  const busca =
    String(
      params.q ??
      ""
    )
      .trim()
      .toLowerCase();


  const filtroStatus =
    String(
      params.status ??
      ""
    )
      .trim();


  const filtroPlano =
    String(
      params.plano ??
      ""
    )
      .trim();


  const filtroVencimento =
    String(
      params.vencimento ??
      ""
    )
      .trim();


  const supabase =
    await createClient();


  const {
    data: {
      user
    }
  } =
    await supabase.auth
      .getUser();


  if (!user) {
    redirect("/login");
  }


  const [
    {
      data: usuarios,
      error: usuariosError
    },

    {
      data: clientes,
      error: clientesError
    },

    {
      data: planos,
      error: planosError
    }

  ] =
    await Promise.all([

      supabaseAdmin
        .from(
          "telegram_manual_usuarios"
        )
        .select(
          "telegram_id, telegram_username, nome, primeiro_contato_em, ultimo_contato_em, confirmado_em"
        )
        .not(
          "confirmado_em",
          "is",
          null
        )
        .order(
          "ultimo_contato_em",
          {
            ascending: false
          }
        ),


      supabaseAdmin
        .from(
          "vip_manual_clientes"
        )
        .select(
          "id, nome, telegram_id, telegram_username, plano, valor, data_vencimento, status, dias_graca"
        )
        .order(
          "data_vencimento",
          {
            ascending: true
          }
        ),


      supabaseAdmin
        .from(
          "vip_manual_planos"
        )
        .select(
          "id, nome, valor, duracao_dias, ativo"
        )
        .eq(
          "ativo",
          true
        )
        .order(
          "duracao_dias",
          {
            ascending: true
          }
        )

    ]);


  const erro =
    usuariosError ||
    clientesError ||
    planosError;


  if (erro) {

    return (
      <main className="min-h-screen bg-black p-8 text-white">

        <h1 className="text-2xl font-bold">
          VIP Manual
        </h1>

        <p className="mt-4 text-red-400">
          Erro ao carregar: {erro.message}
        </p>

      </main>
    );
  }


  const listaUsuarios =
    usuarios ?? [];

  const listaPlanos =
    planos ?? [];

  const listaClientes =
    clientes ?? [];


  const telegramIdsCadastrados =
    new Set(
      listaClientes.map(
        (cliente) =>
          String(
            cliente.telegram_id
          )
      )
    );


  const usuariosDisponiveis =
    listaUsuarios.filter(
      (usuario) =>
        !telegramIdsCadastrados.has(
          String(
            usuario.telegram_id
          )
        )
    );


  const hoje =
    dataHojeSaoPaulo();


  const limite3Dias =
    adicionarDiasISO(
      hoje,
      3
    );


  const clientesAtivos =
    listaClientes.filter(
      (cliente) =>
        cliente.status ===
        "ativo"
    );


  const ativos =
    clientesAtivos.length;


  const vencendoHoje =
    clientesAtivos.filter(
      (cliente) =>
        String(
          cliente.data_vencimento ??
          ""
        )
          .slice(0, 10) ===
        hoje
    ).length;


  const vencendo3Dias =
    clientesAtivos.filter(
      (cliente) => {
        const vencimento =
          String(
            cliente.data_vencimento ??
            ""
          )
            .slice(0, 10);

        return (
          vencimento >
            hoje &&
          vencimento <=
            limite3Dias
        );
      }
    ).length;


  const vencidos =
    listaClientes.filter(
      (cliente) =>
        cliente.status ===
        "vencido"
    ).length;


  const receitaMensalEstimada =
    clientesAtivos.reduce(
      (
        total,
        cliente
      ) => {
        const plano =
          listaPlanos.find(
            (item) =>
              item.nome ===
              cliente.plano
          );

        const duracaoDias =
          Math.max(
            1,
            Number(
              plano?.duracao_dias ??
              30
            )
          );

        const valor =
          Number(
            cliente.valor ??
            0
          );

        return (
          total +
          valor *
            (
              30 /
              duracaoDias
            )
        );
      },
      0
    );



  const limite7Dias =
    adicionarDiasISO(
      hoje,
      7
    );


  const clientesFiltrados =
    listaClientes.filter(
      (cliente) => {

        const nome =
          String(
            cliente.nome ??
            ""
          )
            .toLowerCase();


        const username =
          String(
            cliente.telegram_username ??
            ""
          )
            .toLowerCase();


        const telegramId =
          String(
            cliente.telegram_id ??
            ""
          )
            .toLowerCase();


        const planoCliente =
          String(
            cliente.plano ??
            ""
          );


        const statusCliente =
          String(
            cliente.status ??
            ""
          );


        const vencimentoCliente =
          String(
            cliente.data_vencimento ??
            ""
          )
            .slice(
              0,
              10
            );


        const correspondeBusca =
          !busca ||
          nome.includes(
            busca
          ) ||
          username.includes(
            busca.replace(
              "@",
              ""
            )
          ) ||
          telegramId.includes(
            busca
          );


        const correspondeStatus =
          !filtroStatus ||
          statusCliente ===
            filtroStatus;


        const correspondePlano =
          !filtroPlano ||
          planoCliente ===
            filtroPlano;


        let correspondeVencimento =
          true;


        if (
          filtroVencimento ===
          "hoje"
        ) {

          correspondeVencimento =
            vencimentoCliente ===
            hoje;

        } else if (
          filtroVencimento ===
          "3dias"
        ) {

          correspondeVencimento =
            vencimentoCliente >
              hoje &&
            vencimentoCliente <=
              limite3Dias;

        } else if (
          filtroVencimento ===
          "7dias"
        ) {

          correspondeVencimento =
            vencimentoCliente >
              hoje &&
            vencimentoCliente <=
              limite7Dias;

        } else if (
          filtroVencimento ===
          "vencidos"
        ) {

          correspondeVencimento =
            vencimentoCliente <
              hoje ||
            statusCliente ===
              "vencido";
        }


        return (
          correspondeBusca &&
          correspondeStatus &&
          correspondePlano &&
          correspondeVencimento
        );
      }
    );


  return (

    <main className="min-h-screen bg-black p-6 text-white md:p-8">

      <div className="mx-auto max-w-7xl">


        {/* =====================================
            CABEÇALHO
        ====================================== */}

        <div className="mb-8 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-sm font-medium text-amber-400">
                DAVI VIP
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                👤 VIP Manual
              </h1>

              <p className="mt-2 text-sm text-zinc-400">
                Clientes, cobranças e vencimentos do VIP manual
              </p>

            </div>


            <Link
              href="/"
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm transition hover:bg-zinc-800"
            >
              ← Voltar ao painel
            </Link>

          </div>

        </div>



        {/* =====================================
            RESUMO
        ====================================== */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">


          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-zinc-900 to-emerald-950/20 p-5">

            <p className="text-sm text-zinc-400">
              ✅ Ativos
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {ativos}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              de {listaClientes.length} clientes
            </p>

          </div>



          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-zinc-900 to-amber-950/20 p-5">

            <p className="text-sm text-zinc-400">
              ⏰ Vencendo hoje
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-400">
              {vencendoHoje}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              precisam de atenção
            </p>

          </div>



          <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-zinc-900 to-orange-950/20 p-5">

            <p className="text-sm text-zinc-400">
              📅 Próx. 3 dias
            </p>

            <p className="mt-2 text-3xl font-bold text-orange-400">
              {vencendo3Dias}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              vencimentos próximos
            </p>

          </div>



          <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-zinc-900 to-red-950/20 p-5">

            <p className="text-sm text-zinc-400">
              ❌ Vencidos
            </p>

            <p className="mt-2 text-3xl font-bold text-red-400">
              {vencidos}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              fora da validade
            </p>

          </div>



          <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-zinc-900 to-purple-950/20 p-5">

            <p className="text-sm text-zinc-400">
              💰 Receita mensal est.
            </p>

            <p className="mt-2 text-2xl font-bold text-purple-400">
              {
                receitaMensalEstimada
                  .toLocaleString(
                    "pt-BR",
                    {
                      style:
                        "currency",

                      currency:
                        "BRL"
                    }
                  )
              }
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              equivalente dos ativos
            </p>

          </div>



          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-zinc-900 to-blue-950/20 p-5">

            <p className="text-sm text-zinc-400">
              🤖 Aguardando cadastro
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-400">
              {usuariosDisponiveis.length}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              confirmaram o Telegram
            </p>

          </div>

        </div>




        {/* =====================================
            USUÁRIOS DO DAVI VIP
        ====================================== */}

        <div className="mt-10">

          <div className="mb-4">

            <h2 className="text-xl font-bold">
              🤖 Usuários do Davi VIP
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Pessoas que confirmaram o Telegram e estão prontas para cadastro
            </p>

          </div>


          <div className="grid gap-4">

            {usuariosDisponiveis.map(
              (usuario) => (

                <div
                  key={
                    String(
                      usuario.telegram_id
                    )
                  }
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
                >

                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <p className="font-semibold">
                        {
                          usuario.nome ||
                          "Sem nome"
                        }
                      </p>


                      <p className="mt-1 text-sm text-zinc-400">

                        {
                          usuario.telegram_username
                            ? `@${usuario.telegram_username}`
                            : "Sem username"
                        }

                        {" • "}

                        ID {
                          String(
                            usuario.telegram_id
                          )
                        }

                      </p>

                    </div>


                    <span className="w-fit rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">

                      ✅ Pronto para cadastrar

                    </span>

                  </div>



                  <form
                    action={
                      cadastrarVipManual
                    }
                    className="grid gap-3 md:grid-cols-4"
                  >


                    <input
                      type="hidden"
                      name="telegram_id"
                      value={
                        String(
                          usuario.telegram_id
                        )
                      }
                    />


                    <input
                      type="hidden"
                      name="nome"
                      value={
                        usuario.nome ||
                        "Cliente"
                      }
                    />


                    <input
                      type="hidden"
                      name="telegram_username"
                      value={
                        usuario.telegram_username ??
                        ""
                      }
                    />



                    <div>

                      <label className="mb-1 block text-xs text-zinc-400">
                        Plano
                      </label>


                      <select
                        name="plano_id"
                        required
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none"
                      >

                        <option value="">
                          Selecione
                        </option>


                        {listaPlanos.map(
                          (plano) => (

                            <option
                              key={
                                plano.id
                              }
                              value={
                                plano.id
                              }
                            >

                              {plano.nome}
                              {" — "}
                              {plano.duracao_dias}
                              {" dias"}

                            </option>

                          )
                        )}

                      </select>

                    </div>



                    <div>

                      <label className="mb-1 block text-xs text-zinc-400">
                        Valor
                      </label>


                      <input
                        type="number"
                        name="valor"
                        defaultValue="10"
                        min="0"
                        step="0.01"
                        required
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none"
                      />

                    </div>



                    <div>

                      <label className="mb-1 block text-xs text-zinc-400">
                        Dias de tolerância
                      </label>


                      <input
                        type="number"
                        name="dias_graca"
                        defaultValue="0"
                        min="0"
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none"
                      />

                    </div>



                    <div className="flex items-end">

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-emerald-400"
                      >
                        ✅ Cadastrar
                      </button>

                    </div>

                  </form>

                </div>

              )
            )}


            {
              usuariosDisponiveis.length ===
              0 && (

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-500">

                  Nenhum usuário aguardando cadastro.

                </div>

              )
            }

          </div>

        </div>



        {/* =====================================
            CLIENTES VIP MANUAL
        ====================================== */}

        <div className="mt-10">

          <div className="mb-4">

            <h2 className="text-xl font-bold">
              👥 Clientes VIP Manual
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Assinaturas cadastradas manualmente
            </p>

          </div>


          {/* =====================================
              BUSCA E FILTROS
          ====================================== */}

          <form
            method="GET"
            className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
          >

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">


              <div className="xl:col-span-2">

                <label className="mb-1 block text-xs text-zinc-400">
                  🔎 Buscar cliente
                </label>

                <input
                  type="text"
                  name="q"
                  defaultValue={
                    String(
                      params.q ??
                      ""
                    )
                  }
                  placeholder="Nome, @usuário ou Telegram ID"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none transition focus:border-zinc-500"
                />

              </div>


              <div>

                <label className="mb-1 block text-xs text-zinc-400">
                  Status
                </label>

                <select
                  name="status"
                  defaultValue={
                    filtroStatus
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="">
                    Todos
                  </option>

                  <option value="ativo">
                    Ativos
                  </option>

                  <option value="vencido">
                    Vencidos
                  </option>
                </select>

              </div>


              <div>

                <label className="mb-1 block text-xs text-zinc-400">
                  Plano
                </label>

                <select
                  name="plano"
                  defaultValue={
                    filtroPlano
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="">
                    Todos
                  </option>

                  {
                    listaPlanos.map(
                      (plano) => (

                        <option
                          key={
                            plano.id
                          }
                          value={
                            plano.nome
                          }
                        >
                          {
                            plano.nome
                          }
                        </option>

                      )
                    )
                  }
                </select>

              </div>


              <div>

                <label className="mb-1 block text-xs text-zinc-400">
                  Vencimento
                </label>

                <select
                  name="vencimento"
                  defaultValue={
                    filtroVencimento
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="">
                    Todos
                  </option>

                  <option value="hoje">
                    Hoje
                  </option>

                  <option value="3dias">
                    Próximos 3 dias
                  </option>

                  <option value="7dias">
                    Próximos 7 dias
                  </option>

                  <option value="vencidos">
                    Já vencidos
                  </option>
                </select>

              </div>

            </div>


            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-sm text-zinc-500">
                Mostrando{" "}
                <span className="font-semibold text-white">
                  {
                    clientesFiltrados.length
                  }
                </span>
                {" "}de{" "}
                <span className="font-semibold text-white">
                  {
                    listaClientes.length
                  }
                </span>
                {" "}clientes
              </p>


              <div className="flex gap-2">

                <Link
                  href="/vip-manual"
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900"
                >
                  Limpar
                </Link>

                <button
                  type="submit"
                  className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-400"
                >
                  🔎 Filtrar
                </button>

              </div>

            </div>

          </form>


          <div className="overflow-x-auto rounded-2xl border border-zinc-800">

            <table className="min-w-[900px] w-full text-left">


              <thead className="bg-zinc-900 text-sm text-zinc-400">

                <tr>

                  <th className="p-4">
                    Cliente
                  </th>

                  <th className="p-4">
                    Plano
                  </th>

                  <th className="p-4">
                    Valor
                  </th>

                  <th className="p-4">
                    Vencimento
                  </th>

                  <th className="p-4">
                    Status
                  </th>

                  <th className="p-4">
                    Ações
                  </th>

                </tr>

              </thead>



              <tbody>

                {
                  clientesFiltrados.map(
                    (cliente) => (

                      <tr
                        key={
                          cliente.id
                        }
                        className="border-t border-zinc-800 bg-zinc-950 transition hover:bg-zinc-900"
                      >


                        <td className="p-4">

                          {
                            cliente.nome ||
                            "Cliente"
                          }

                        </td>



                        <td className="p-4">

                          {
                            cliente.plano
                          }

                        </td>



                        <td className="p-4 font-semibold">

                          {
                            Number(
                              cliente.valor
                            ).toLocaleString(
                              "pt-BR",
                              {
                                style:
                                  "currency",

                                currency:
                                  "BRL"
                              }
                            )
                          }

                        </td>



                        <td className="p-4">

                          {
                            formatarData(
                              cliente.data_vencimento
                            )
                          }

                        </td>



                        <td className="p-4">

                          <span
                            className={
                              cliente.status ===
                              "ativo"

                                ? "rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400"

                                : "rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400"
                            }
                          >

                            {
                              cliente.status
                            }

                          </span>

                        </td>



                        <td className="p-4">

  <div className="flex flex-col gap-2">

    <ConfirmarPagamentoManualButton
      clienteId={
        Number(
          cliente.id
        )
      }
      clienteNome={
        cliente.nome ||
        "Cliente"
      }
    />


    <ReenviarAcessoManualButton
  clienteId={
    Number(
      cliente.id
    )
  }
  clienteNome={
    cliente.nome ||
    "Cliente"
  }
/>

  </div>

</td>


                      </tr>

                    )
                  )
                }



                {
                  clientesFiltrados.length ===
                  0 && (

                    <tr>

                      <td
                        colSpan={6}
                        className="p-8 text-center text-zinc-500"
                      >

                        {
                          listaClientes.length ===
                          0
                            ? "Nenhum cliente manual cadastrado ainda."
                            : "Nenhum cliente encontrado com esses filtros."
                        }

                      </td>

                    </tr>

                  )
                }

              </tbody>

            </table>

          </div>

        </div>


      </div>

    </main>
  );
}