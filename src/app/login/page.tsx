"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErro("");
    setCarregando(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
    setErro(error.message);
      setCarregando(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">
            Painel Vip Séries
          </h1>

          <p className="mt-2 text-zinc-400">
            Acesso administrativo
          </p>
        </div>

        <form
          onSubmit={entrar}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <div>
            <label className="mb-2 block text-sm text-zinc-300">
              E-mail
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seuemail@email.com"
              required
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-zinc-500"
            />
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm text-zinc-300">
              Senha
            </label>

            <input
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="Sua senha"
              required
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-zinc-500"
            />
          </div>

          {erro && (
            <p className="mt-4 text-sm text-red-400">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="mt-6 w-full rounded-xl bg-white px-4 py-3 font-semibold text-black disabled:opacity-50"
          >
            {carregando ? "Entrando..." : "Entrar no painel"}
          </button>
        </form>
      </div>
    </main>
  );
}