"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";


// ========================================
// TIPOS
// ========================================

type AcaoBotManual = {
  action:
    | "ativar_cliente"
    | "pagamento_confirmado";

  telegram_id: number;
  plano: string;
  valor: number;
  data_vencimento: string;

  gerar_link?: boolean;
};


// ========================================
// DATA DE HOJE - SÃO PAULO
// ========================================

function dataHojeSaoPaulo() {
  const partes =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Sao_Paulo",

        year: "numeric",
        month: "2-digit",
        day: "2-digit"
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


// ========================================
// SOMAR DIAS
// ========================================

function adicionarDias(
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


// ========================================
// CHAMAR DAVI VIP
// ========================================

async function chamarBotManual(
  payload: AcaoBotManual
) {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL
      ?.trim();

  const internalSecret =
    process.env
      .VIP_MANUAL_INTERNAL_SECRET
      ?.trim();


  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL não configurada."
    );
  }


  if (!internalSecret) {
    throw new Error(
      "VIP_MANUAL_INTERNAL_SECRET não configurado."
    );
  }


  const response =
    await fetch(
      `${supabaseUrl}/functions/v1/telegram-manual-webhook`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-vip-manual-internal-secret":
            internalSecret
        },

        body:
          JSON.stringify(
            payload
          ),

        cache: "no-store"
      }
    );


  const texto =
    await response.text();


  let resultado:
    Record<string, unknown> = {};


  if (texto) {
    try {
      resultado =
        JSON.parse(texto);
    } catch {
      resultado = {};
    }
  }


  if (
    !response.ok ||
    resultado?.ok !== true
  ) {
    console.error(
      "Erro Davi VIP:",
      texto
    );

    throw new Error(
      "O Davi VIP não conseguiu processar a solicitação."
    );
  }


  return resultado;
}


// ========================================
// CADASTRAR NOVO CLIENTE
// ========================================

export async function cadastrarVipManual(
  formData: FormData
) {
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


  const telegramId =
    Number(
      formData.get(
        "telegram_id"
      )
    );


  const telegramUsername =
    String(
      formData.get(
        "telegram_username"
      ) ?? ""
    ).trim() || null;


  const nome =
    String(
      formData.get(
        "nome"
      ) ?? ""
    ).trim() || null;


  const planoId =
    Number(
      formData.get(
        "plano_id"
      )
    );


  const valorTexto =
    String(
      formData.get(
        "valor"
      ) ?? ""
    )
      .trim()
      .replace(",", ".");


  const valor =
    Number(
      valorTexto
    );


  const diasGraca =
    Math.max(
      0,
      Number(
        formData.get(
          "dias_graca"
        ) ?? 0
      ) || 0
    );


  if (!telegramId) {
    throw new Error(
      "Telegram ID inválido."
    );
  }


  if (!planoId) {
    throw new Error(
      "Plano não informado."
    );
  }


  if (
    !Number.isFinite(valor) ||
    valor < 0
  ) {
    throw new Error(
      "Valor inválido."
    );
  }


  // Busca duração do plano
  const {
    data: plano,
    error: planoError
  } =
    await supabaseAdmin
      .from(
        "vip_manual_planos"
      )
      .select(
        "id, nome, duracao_dias, ativo"
      )
      .eq(
        "id",
        planoId
      )
      .eq(
        "ativo",
        true
      )
      .single();


  if (
    planoError ||
    !plano
  ) {
    throw new Error(
      "Plano não encontrado ou inativo."
    );
  }


  const hoje =
    dataHojeSaoPaulo();


  const vencimento =
    adicionarDias(
      hoje,
      Number(
        plano.duracao_dias
      )
    );


  const agora =
    new Date()
      .toISOString();


  // Cadastra cliente
  const {
    data: cliente,
    error: clienteError
  } =
    await supabaseAdmin
      .from(
        "vip_manual_clientes"
      )
      .insert({
        nome,

        telegram_id:
          telegramId,

        telegram_username:
          telegramUsername,

        plano:
          plano.nome,

        valor,

        data_inicio:
          hoje,

        data_vencimento:
          vencimento,

        status:
          "ativo",

        dias_graca:
          diasGraca,

        ultimo_pagamento_em:
          agora,

        updated_at:
          agora
      })
      .select(
        "id, telegram_id, plano, valor, data_vencimento"
      )
      .single();


  if (
    clienteError ||
    !cliente
  ) {
    console.error(
      "Erro cadastrando VIP Manual:",
      clienteError
    );

    throw new Error(
      "Não foi possível cadastrar o cliente."
    );
  }


  // ======================================
  // AVISA CLIENTE NO DAVI VIP
  // ======================================

  try {

    await chamarBotManual({
      action:
        "ativar_cliente",

      telegram_id:
        Number(
          cliente.telegram_id
        ),

      plano:
        String(
          cliente.plano
        ),

      valor:
        Number(
          cliente.valor
        ),

      data_vencimento:
        String(
          cliente.data_vencimento
        )
    });

  } catch (error) {

    // O cliente continua cadastrado mesmo
    // se o Telegram estiver temporariamente fora.
    console.error(
      "Cliente cadastrado, mas houve erro enviando ativação:",
      error
    );
  }


  revalidatePath(
    "/vip-manual"
  );
}


// ========================================
// CONFIRMAR PAGAMENTO
// ========================================

export async function confirmarPagamentoVipManual(
  formData: FormData
) {
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


  const clienteId =
    Number(
      formData.get(
        "cliente_id"
      )
    );


  if (!clienteId) {
    throw new Error(
      "Cliente não informado."
    );
  }


  // ======================================
  // DADOS ANTES DA RENOVAÇÃO
  // ======================================

  const {
    data: clienteAntes,
    error: clienteAntesError
  } =
    await supabaseAdmin
      .from(
        "vip_manual_clientes"
      )
      .select(
  "id, telegram_id, plano, valor, data_vencimento, status, removido_telegram_em"
)
      
      .eq(
        "id",
        clienteId
      )
      .single();


  if (
    clienteAntesError ||
    !clienteAntes
  ) {
    throw new Error(
      "Cliente não encontrado."
    );
  }


  // Se já tinha sido removido,
  // depois do pagamento precisará
  // receber um novo link.
  const precisaNovoLink =
    Boolean(
      clienteAntes
        .removido_telegram_em
    );


  // ======================================
  // RENOVA + REGISTRA HISTÓRICO
  // ======================================

  const {
    error: pagamentoError
  } =
    await supabaseAdmin.rpc(
      "confirmar_pagamento_vip_manual",
      {
        p_cliente_id:
          clienteId
      }
    );


  if (pagamentoError) {
    console.error(
      "Erro confirmando pagamento:",
      pagamentoError
    );

    throw pagamentoError;
  }


  // ======================================
  // BUSCA NOVA VALIDADE
  // ======================================

  const {
    data: clienteDepois,
    error: clienteDepoisError
  } =
    await supabaseAdmin
      .from(
        "vip_manual_clientes"
      )
      .select(
        "telegram_id, plano, valor, data_vencimento, status"
      )
      .eq(
        "id",
        clienteId
      )
      .single();


  if (
    clienteDepoisError ||
    !clienteDepois
  ) {
    throw new Error(
      "Pagamento confirmado, mas não foi possível consultar a nova validade."
    );
  }


  // ======================================
  // AVISA CLIENTE NO DAVI VIP
  // ======================================

  try {

    await chamarBotManual({
      action:
        "pagamento_confirmado",

      telegram_id:
        Number(
          clienteDepois
            .telegram_id
        ),

      plano:
        String(
          clienteDepois
            .plano
        ),

      valor:
        Number(
          clienteDepois
            .valor
        ),

      data_vencimento:
        String(
          clienteDepois
            .data_vencimento
        ),

      gerar_link:
        precisaNovoLink
    });

  } catch (error) {

    // O pagamento continua confirmado.
    // Falha no Telegram não desfaz
    // uma renovação financeira.
    console.error(
      "Pagamento confirmado, mas houve erro enviando mensagem:",
      error
    );
  }


  revalidatePath(
    "/vip-manual"
  );
}