"use client";

import { useMemo, useState } from "react";

type Cliente = {
  nome: string | null;
  email: string | null;
  plano: string | null;
  status: string | null;
  data_vencimento: string | null;
};

type Props = {
  clientes: Cliente[];
};

export default function ClientesTable({ clientes }: Props) {
  const [busca, setBusca] = useState("");
  const [plano, setPlano] = useState("todos");
  const [status, setStatus] = useState("todos");

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((cliente) => {
      const textoBusca = busca.toLowerCase().trim();

      const correspondeBusca =
        !textoBusca ||
        cliente.nome?.toLowerCase().includes(textoBusca) ||
        cliente.email?.toLowerCase().includes(textoBusca);

      const correspondePlano =
        plano === "todos" ||
        cliente.plano?.toLowerCase() === plano.toLowerCase();

      const correspondeStatus =
        status === "todos" ||
        cliente.status?.toLowerCase() === status.toLowerCase();

      return (
        correspondeBusca &&
        correspondePlano &&
        correspondeStatus
      );
    });
  }, [clientes, busca, plano, status]);

  function formatarData(data: string | null) {
    if (!data) return "Sem vencimento";

    return new Date(data).toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
  }

  function corStatus(statusCliente: string | null) {
    if (statusCliente === "ativo") {
      return "bg-green-500/10 text-green-400";
    }

    if (statusCliente === "vencido") {
      return "bg-red-500/10 text-red-400";
    }

    if (statusCliente === "reembolsado") {
      return "bg-orange-500/10 text-orange-400";
    }

    return "bg-zinc-700 text-zinc-300";
  }

  return (
    <div className="mt-10">
      <div className="mb-5">
        <h2 className="text-2xl font-bold">
          Clientes
        </h2>

        <p className="mt-1 text-sm text-zinc-400">
          Busque e filtre seus assinantes
        </p>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">

        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none placeholder:text-zinc-500 focus:border-zinc-600"
        />

        <select
          value={plano}
          onChange={(e) => setPlano(e.target.value)}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none"
        >
          <option value="todos">
            Todos os planos
          </option>

          <option value="Mensal">
            Mensal
          </option>

          <option value="Trimestral">
            Trimestral
          </option>

          <option value="Anual">
            Anual
          </option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none"
        >
          <option value="todos">
            Todos os status
          </option>

          <option value="ativo">
            Ativos
          </option>

          <option value="vencido">
            Vencidos
          </option>

          <option value="reembolsado">
            Reembolsados
          </option>
        </select>

      </div>

      <div className="mb-3 text-sm text-zinc-400">
        {clientesFiltrados.length} cliente(s) encontrado(s)
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full text-left">

          <thead className="bg-zinc-900 text-sm text-zinc-400">
            <tr>
              <th className="p-4">Nome</th>
              <th className="p-4">E-mail</th>
              <th className="p-4">Plano</th>
              <th className="p-4">Status</th>
              <th className="p-4">Vencimento</th>
            </tr>
          </thead>

          <tbody>
            {clientesFiltrados.map((cliente, index) => (
              <tr
                key={`${cliente.email}-${index}`}
                className="border-t border-zinc-800 bg-zinc-950"
              >
                <td className="p-4">
                  {cliente.nome || "Sem nome"}
                </td>

                <td className="p-4 text-zinc-300">
                  {cliente.email || "Sem e-mail"}
                </td>

                <td className="p-4">
                  {cliente.plano || "-"}
                </td>

                <td className="p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${corStatus(
                      cliente.status
                    )}`}
                  >
                    {cliente.status || "Sem status"}
                  </span>
                </td>

                <td className="p-4">
                  {formatarData(cliente.data_vencimento)}
                </td>
              </tr>
            ))}

            {clientesFiltrados.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-zinc-500"
                >
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>

        </table>
      </div>
    </div>
  );
}