"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { naoCadastrarVipManual } from "@/app/vip-manual/actions";

export default function NaoCadastrarManualButton({
  telegramId, nome,
}: { telegramId: number; nome: string }) {
  const router = useRouter();
  const executando = useRef(false);
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState("");

  async function descartar() {
    if (executando.current) return;
    if (!window.confirm(`Não cadastrar ${nome}?\n\nEssa pessoa sairá da lista de cadastro e não receberá acesso VIP.`)) return;
    executando.current = true;
    setPending(true);
    setErro("");
    try {
      const resultado = await naoCadastrarVipManual(telegramId);
      if (!resultado.ok) setErro(resultado.error);
      router.refresh();
    } catch {
      setErro("Não foi possível concluir. Atualize o painel e tente novamente.");
    } finally {
      executando.current = false;
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={descartar} disabled={pending}
        className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? "Retirando..." : "✕ Não cadastrar"}
      </button>
      {erro && <p role="alert" className="mt-2 text-xs text-red-400">{erro}</p>}
    </div>
  );
}
