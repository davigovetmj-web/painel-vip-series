"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  confirmarPagamentoVipManual,
} from "@/app/vip-manual/actions";


type Plano = {
  id: number;
  nome: string;
  valor: number | string;
  duracao_dias: number;
};


type Props = {
  clienteId: number;
  clienteNome: string;
  planoAtual: string | null;
  planos: Plano[];
};


export default function ConfirmarPagamentoManualButton({
  clienteId,
  clienteNome,
  planoAtual,
  planos,
}: Props) {

  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();


  const planoAtualEncontrado =
    planos.find(
      (plano) =>
        plano.nome ===
        planoAtual
    );


  const [
    planoId,
    setPlanoId,
  ] =
    useState(
      String(
        planoAtualEncontrado?.id ??
        planos[0]?.id ??
        ""
      )
    );


  const [
    erro,
    setErro,
  ] =
    useState("");


  const planoSelecionado =
    planos.find(
      (plano) =>
        String(
          plano.id
        ) ===
        planoId
    );


  function confirmar() {

    setErro("");


    if (!planoId) {

      setErro(
        "Selecione um plano."
      );

      return;
    }


    const nomePlano =
      planoSelecionado?.nome ??
      "plano selecionado";


    const confirmou =
      window.confirm(
        `Confirmar pagamento de ${clienteNome} no plano ${nomePlano}?`
      );


    if (!confirmou) {
      return;
    }


    const formData =
      new FormData();


    formData.set(
      "cliente_id",
      String(
        clienteId
      )
    );


    formData.set(
      "plano_id",
      planoId
    );


    formData.set(
      "confirmacao_id",
      crypto.randomUUID()
    );


    startTransition(
      async () => {

        try {

          await confirmarPagamentoVipManual(
            formData
          );


          router.refresh();


        } catch (error) {

          console.error(
            error
          );


          setErro(
            "Não foi possível confirmar o pagamento."
          );

        }

      }
    );

  }


  return (

    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3">

      <p className="mb-1 text-[11px] text-zinc-500">
        Plano atual
      </p>

      <p className="mb-3 text-xs font-semibold text-zinc-300">
        {planoAtual || "-"}
      </p>


      <label className="mb-1 block text-[11px] text-zinc-500">
        Novo plano
      </label>


      <select
        value={
          planoId
        }
        onChange={
          (event) =>
            setPlanoId(
              event.target.value
            )
        }
        disabled={
          isPending
        }
        className="mb-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs text-white outline-none"
      >

        {
          planos.map(
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
                {
                  Number(
                    plano.valor
                  ).toLocaleString(
                    "pt-BR",
                    {
                      style:
                        "currency",

                      currency:
                        "BRL",
                    }
                  )
                }

              </option>

            )
          )
        }

      </select>


      <button
        type="button"
        onClick={
          confirmar
        }
        disabled={
          isPending ||
          !planoId
        }
        className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >

        {
          isPending
            ? "Confirmando..."
            : "✅ Confirmar pagamento"
        }

      </button>


      {
        planoSelecionado && (

          <p className="mt-2 text-[10px] text-zinc-500">

            {planoSelecionado.duracao_dias} dias

          </p>

        )
      }


      {
        erro && (

          <p className="mt-2 text-[10px] text-red-400">
            {erro}
          </p>

        )
      }

    </div>

  );
}