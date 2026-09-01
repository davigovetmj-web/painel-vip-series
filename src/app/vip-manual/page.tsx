import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  cadastrarVipManual,
  confirmarPagamentoVipManual,
} from "./actions";
export const dynamic = "force-dynamic";

function formatarData(data: string | null) {
  if (!data) return "-";

  const [ano, mes, dia] = data.slice(0, 10).split("-");

  return `${dia}/${mes}/${ano}`;
}

export default async function VipManualPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
  { data: usuarios, error: usuariosError },
  { data: clientes, error: clientesError },
  { data: planos, error: planosError },
] = await Promise.all([
  supabaseAdmin
  .from("telegram_manual_usuarios")
  .select(
    "telegram_id, telegram_username, nome, primeiro_contato_em, ultimo_contato_em, confirmado_em"
  )
  .not("confirmado_em", "is", null)
  .order("ultimo_contato_em", { ascending: false }),
  supabaseAdmin
    .from("vip_manual_clientes")
    .select(
      "id, nome, telegram_id, telegram_username, plano, valor, data_vencimento, status, dias_graca"
    )
    .order("data_vencimento", { ascending: true }),

  supabaseAdmin
    .from("vip_manual_planos")
    .select("id, nome, valor, duracao_dias, ativo")
    .eq("ativo", true)
    .order("duracao_dias", { ascending: true }),
]);

 const erro =
  usuariosError ||
  clientesError ||
  planosError;

  if (erro) {
    return (
      <main className="min-h-screen bg-black p-8 text-white">
        <h1 className="text-2xl font-bold">VIP Manual</h1>

        <p className="mt-4 text-red-400">
          Erro ao carregar: {erro.message}
        </p>
      </main>
    );
  }

  const listaUsuarios = usuarios ?? [];
  const listaPlanos = planos ?? [];
  const listaClientes = clientes ?? [];

  const telegramIdsCadastrados = new Set(
    listaClientes.map((cliente) =>
      String(cliente.telegram_id)
    )
  );

  const usuariosDisponiveis = listaUsuarios.filter(
    (usuario) =>
      !telegramIdsCadastrados.has(
        String(usuario.telegram_id)
      )
  );

  const ativos = listaClientes.filter(
    (cliente) => cliente.status === "ativo"
  ).length;

  const vencidos = listaClientes.filter(
    (cliente) => cliente.status === "vencido"
  ).length;

  return (
    <main className="min-h-screen bg-black p-6 text-white md:p-8">
      <div className="mx-auto max-w-7xl">

        {/* CABEÇALHO */}
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


        {/* RESUMO */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-zinc-900 to-purple-950/20 p-5">
            <p className="text-sm text-zinc-400">
              Clientes manuais
            </p>

            <p className="mt-2 text-3xl font-bold text-purple-400">
              {listaClientes.length}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-zinc-900 to-emerald-950/20 p-5">
            <p className="text-sm text-zinc-400">
              Ativos
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {ativos}
            </p>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-zinc-900 to-red-950/20 p-5">
            <p className="text-sm text-zinc-400">
              Vencidos
            </p>

            <p className="mt-2 text-3xl font-bold text-red-400">
              {vencidos}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-zinc-900 to-blue-950/20 p-5">
            <p className="text-sm text-zinc-400">
              Aguardando cadastro
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-400">
              {usuariosDisponiveis.length}
            </p>
          </div>

        </div>


       {/* USUÁRIOS QUE ABRIRAM O BOT */}
<div className="mt-10">
  <div className="mb-4">
    <h2 className="text-xl font-bold">
      🤖 Usuários do Davi VIP
    </h2>

    <p className="mt-1 text-sm text-zinc-400">
      Pessoas que iniciaram o bot e estão prontas para cadastro
    </p>
  </div>

  <div className="grid gap-4">
    {usuariosDisponiveis.map((usuario) => (
      <div
        key={usuario.telegram_id}
        className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">
              {usuario.nome || "Sem nome"}
            </p>

            <p className="mt-1 text-sm text-zinc-400">
              {usuario.telegram_username
                ? `@${usuario.telegram_username}`
                : "Sem username"}
              {" • "}
              ID {usuario.telegram_id}
            </p>
          </div>

          <span className="w-fit rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
            Pronto para cadastrar
          </span>
        </div>

        <form
          action={cadastrarVipManual}
          className="grid gap-3 md:grid-cols-4"
        >
          <input
            type="hidden"
            name="telegram_id"
            value={String(usuario.telegram_id)}
          />

          <input
            type="hidden"
            name="nome"
            value={usuario.nome || "Cliente"}
          />

          <input
            type="hidden"
            name="telegram_username"
            value={usuario.telegram_username ?? ""}
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

  {listaPlanos.map((plano) => (
    <option
      key={plano.id}
      value={plano.id}
    >
      {plano.nome} — {plano.duracao_dias} dias
    </option>
  ))}
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
    ))}

    {usuariosDisponiveis.length === 0 && (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-500">
        Nenhum usuário aguardando cadastro.
      </div>
    )}
  </div>
</div>


        {/* CLIENTES MANUAIS */}
        <div className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-bold">
              👥 Clientes VIP Manual
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Assinaturas cadastradas manualmente
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-800">
            <table className="w-full text-left">
              <thead className="bg-zinc-900 text-sm text-zinc-400">
                <tr>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Plano</th>
                  <th className="p-4">Valor</th>
                  <th className="p-4">Vencimento</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Ações</th>
                </tr>
              </thead>

              <tbody>
                {listaClientes.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="border-t border-zinc-800 bg-zinc-950 transition hover:bg-zinc-900"
                  >
                    <td className="p-4">
                      {cliente.nome}
                    </td>

                    <td className="p-4">
                      {cliente.plano}
                    </td>

                    <td className="p-4 font-semibold">
                      {Number(cliente.valor).toLocaleString(
                        "pt-BR",
                        {
                          style: "currency",
                          currency: "BRL",
                        }
                      )}
                    </td>

                    <td className="p-4">
                      {formatarData(
                        cliente.data_vencimento
                      )}
                    </td>

                    <td className="p-4">
                      <span
                        className={
                          cliente.status === "ativo"
                            ? "rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400"
                            : "rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400"
                        }
                      >
                        {cliente.status}
                      </span>
                    </td>
                    <td className="p-4">
  <form action={confirmarPagamentoVipManual}>
    <input
      type="hidden"
      name="cliente_id"
      value={cliente.id}
    />

    <button
      type="submit"
      className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
    >
      ✅ Confirmar pagamento
    </button>
  </form>
</td>
                  </tr>
                ))}

                {listaClientes.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-zinc-500"
                    >
                      Nenhum cliente manual cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}