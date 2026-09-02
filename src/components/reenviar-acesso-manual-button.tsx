"use client";

import type {
  FormEvent,
} from "react";

import {
  useRef,
  useState,
} from "react";

import {
  reenviarAcessoVipManual,
} from "@/app/vip-manual/actions";


type Props = {
  clienteId: number;
  clienteNome: string;
};


export default function ReenviarAcessoManualButton({
  clienteId,
  clienteNome,
}: Props) {

  const [
    pending,
    setPending,
  ] =
    useState(false);


  const [
    enviado,
    setEnviado,
  ] =
    useState(false);


  const enviandoRef =
    useRef(false);


  async function reenviar(
    event:
      FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();


    if (
      enviandoRef.current ||
      pending ||
      enviado
    ) {
      return;
    }


    const confirmou =
      window.confirm(
        `Reenviar o acesso VIP para ${clienteNome}?`
      );


    if (!confirmou) {
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


    try {

      await reenviarAcessoVipManual(
        formData
      );


      setEnviado(
        true
      );


    } catch (error) {

      console.error(
        "Erro reenviando acesso:",
        error
      );


      window.alert(
        "Não foi possível reenviar o acesso. Verifique o Telegram e tente novamente."
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
        reenviar
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
          pending ||
          enviado
        }
        className="
          w-full
          rounded-xl
          bg-blue-500/10
          px-3
          py-2
          text-xs
          font-semibold
          text-blue-400
          transition
          hover:bg-blue-500/20
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
      >

        {
          enviado
            ? "✅ Acesso enviado"
            : pending
              ? "⏳ Enviando..."
              : "🔄 Reenviar acesso"
        }

      </button>

    </form>

  );
}