"use client";

import type {
  FormEvent,
} from "react";

import {
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  confirmarPagamentoVipManual,
} from "@/app/vip-manual/actions";


type Props = {
  clienteId: number;
  clienteNome: string;
};


export default function ConfirmarPagamentoManualButton({
  clienteId,
  clienteNome,
}: Props) {

  const router =
    useRouter();


  const [
    pending,
    setPending,
  ] =
    useState(false);


  const enviandoRef =
    useRef(false);


  async function confirmar(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    // Impede segundo clique
    // enquanto a primeira confirmação
    // ainda está sendo processada.
    if (
      enviandoRef.current
    ) {
      return;
    }


    const aceitou =
      window.confirm(
        `Confirmar pagamento de ${clienteNome}?\n\n` +
        "A validade será renovada e o cliente será avisado pelo Davi VIP."
      );


    if (!aceitou) {
      return;
    }


    enviandoRef.current =
      true;

    setPending(
      true
    );


    const formData =
      new FormData(
        event.currentTarget
      );


    // ID exclusivo desta confirmação.
    // Se a mesma requisição for repetida,
    // o banco reconhece e não renova novamente.
    formData.set(
      "confirmacao_id",
      crypto.randomUUID()
    );


    try {

      await confirmarPagamentoVipManual(
        formData
      );


      router.refresh();


    } catch (error) {

      console.error(
        "Erro confirmando pagamento:",
        error
      );


      window.alert(
        "Não foi possível confirmar o pagamento. Tente novamente."
      );


    } finally {

      enviandoRef.current =
        false;

      setPending(
        false
      );

    }
  }


  return (

    <form
      onSubmit={
        confirmar
      }
    >

      <input
        type="hidden"
        name="cliente_id"
        value={
          clienteId
        }
      />


      <button
        type="submit"
        disabled={
          pending
        }
        className="
          rounded-xl
          bg-emerald-500/10
          px-3
          py-2
          text-xs
          font-semibold
          text-emerald-400
          transition
          hover:bg-emerald-500/20
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
      >

        {
          pending
            ? "⏳ Confirmando..."
            : "✅ Confirmar pagamento"
        }

      </button>

    </form>

  );
}