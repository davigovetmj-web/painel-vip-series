"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { removerVipManual } from "@/app/vip-manual/actions";

export default function RemoverVipManualButton({
  clienteId, clienteNome,
}: { clienteId: number; clienteNome: string }) {
  const router = useRouter();
  const executando = useRef(false);
  const [pending, setPending] = useState(false);
  const [mensagem, setMensagem] = useState("");

  async function remover() {
    if (executando.current) return;
    if (!window.confirm(
      `Remover ${clienteNome} do VIP?\n\nO acesso ficará vencido e a pessoa será retirada do canal. O cadastro e o histórico de pagamentos serão mantidos.`
    )) return;
    executando.current = true;
    setPending(true);
    setMensagem("");
    try {
      const resultado = await removerVipManual(clienteId);
      setMensagem(resultado.ok ? "Acesso removido." : resultado.error);
      router.refresh();
    } catch {
      setMensagem("Não foi possível concluir. Atualize o painel e tente novamente.");
      router.refresh();
    } finally {
      executando.current = false;
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={remover} disabled={pending}
        className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? "Removendo..." : "🚫 Remover cliente"}
      </button>
      {mensagem && <p role="status" className="mt-2 max-w-xs text-xs text-zinc-300">{mensagem}</p>}
    </div>
  );
}
