"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";


// ========================================
// TIPOS
// ========================================

type AcaoBotManual = {

  action:
    | "ativar_cliente"
    | "pagamento_confirmado";

  telegram_id:
    number;

  plano:
    string;

  valor:
    number;

  data_vencimento:
    string;

  gerar_link?:
    boolean;
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
        parte.type ===
        "year"
    )?.value;


  const mes =
    partes.find(
      (parte) =>
        parte.type ===
        "month"
    )?.value;


  const dia =
    partes.find(
      (parte) =>
        parte.type ===
        "day"
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
      .map(
        Number
      );


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
    .slice(
      0,
      10
    );
}


// ========================================
// CHAMAR DAVI VIP
// ========================================

async function chamarBotManual(
  payload:
    AcaoBotManual
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

        method:
          "POST",

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

        cache:
          "no-store"

      }
    );


  const texto =
    await response.text();


  let resultado:
    Record<
      string,
      unknown
    > = {};


  if (texto) {

    try {

      resultado =
        JSON.parse(
          texto
        );

    } catch {

      resultado = {};

    }
  }


  if (
    !response.ok ||
    resultado.ok !==
      true
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
  formData:
    FormData
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
    redirect(
      "/login"
    );
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
    ).trim() ||
    null;


  const nome =
    String(
      formData.get(
        "nome"
      ) ?? ""
    ).trim() ||
    null;


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
      .replace(
        ",",
        "."
      );


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
    !Number.isFinite(
      valor
    ) ||
    valor < 0
  ) {

    throw new Error(
      "Valor inválido."
    );
  }


  // ======================================
  // PLANO
  // ======================================

  const {
    data:
      plano,

    error:
      planoError
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


  // ======================================
  // CADASTRA
  // ======================================

  const {
    data:
      cliente,

    error:
      clienteError
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
  // AVISA DAVI VIP
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
  formData:
    FormData
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

    redirect(
      "/login"
    );
  }


  const clienteId =
    Number(
      formData.get(
        "cliente_id"
      )
    );


  const confirmacaoId =
    String(
      formData.get(
        "confirmacao_id"
      ) ?? ""
    ).trim();


  if (!clienteId) {

    throw new Error(
      "Cliente não informado."
    );
  }


  if (
    !confirmacaoId
  ) {

    throw new Error(
      "ID da confirmação não informado."
    );
  }


  const uuidValido =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(
        confirmacaoId
      );


  if (!uuidValido) {

    throw new Error(
      "ID da confirmação inválido."
    );
  }


  // ======================================
  // CLIENTE ANTES DA RENOVAÇÃO
  // ======================================

  const {
    data:
      clienteAntes,

    error:
      clienteAntesError
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


  const precisaNovoLink =
    Boolean(
      clienteAntes
        .removido_telegram_em
    );


  // ======================================
  // RENOVAÇÃO IDEMPOTENTE
  // ======================================

  const {
    data:
      pagamentoResultado,

    error:
      pagamentoError
  } =
    await supabaseAdmin.rpc(
      "confirmar_pagamento_vip_manual",
      {

        p_cliente_id:
          clienteId,

        p_confirmacao_id:
          confirmacaoId

      }
    );


  if (
    pagamentoError
  ) {

    console.error(
      "Erro confirmando pagamento:",
      pagamentoError
    );


    throw pagamentoError;
  }


  const resultado =
    pagamentoResultado as
      | {
          ok?:
            boolean;

          ja_processado?:
            boolean;

          data_vencimento?:
            string;
        }
      | null;


  // A mesma confirmação já foi executada.
  // Não renova e não envia outra mensagem.
  if (
    resultado
      ?.ja_processado ===
    true
  ) {

    console.log(
      "Pagamento já processado. Renovação duplicada ignorada."
    );


    revalidatePath(
      "/vip-manual"
    );


    return;
  }


  // ======================================
  // BUSCA NOVA VALIDADE
  // ======================================

  const {
    data:
      clienteDepois,

    error:
      clienteDepoisError
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

    console.error(
      "Pagamento confirmado, mas houve erro enviando mensagem:",
      error
    );
  }


  revalidatePath(
    "/vip-manual"
  );
}


// ========================================
// REENVIAR ACESSO VIP MANUAL
// ========================================

export async function reenviarAcessoVipManual(
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

    redirect(
      "/login"
    );
  }


  const clienteId =
    Number(
      formData.get(
        "cliente_id"
      )
    );


  if (
    !Number.isInteger(
      clienteId
    ) ||
    clienteId <= 0
  ) {

    throw new Error(
      "Cliente inválido."
    );
  }


  const {
    data:
      cliente,

    error:
      clienteError
  } =
    await supabaseAdmin
      .from(
        "vip_manual_clientes"
      )
      .select(
        "id, telegram_id, plano, valor, data_vencimento, status"
      )
      .eq(
        "id",
        clienteId
      )
      .single();


  if (
    clienteError ||
    !cliente
  ) {

    console.error(
      "Erro buscando cliente para reenviar acesso:",
      clienteError
    );


    throw new Error(
      "Cliente não encontrado."
    );
  }


  const hoje =
    dataHojeSaoPaulo();


  const vencimento =
    String(
      cliente.data_vencimento ??
      ""
    )
      .slice(
        0,
        10
      );


  if (
    cliente.status !==
      "ativo" ||
    !vencimento ||
    vencimento <
      hoje
  ) {

    throw new Error(
      "Só é possível reenviar o acesso para uma assinatura ativa."
    );
  }


  await chamarBotManual({

    action:
      "ativar_cliente",

    telegram_id:
      Number(
        cliente.telegram_id
      ),

    plano:
      String(
        cliente.plano ??
        ""
      ),

    valor:
      Number(
        cliente.valor ??
        0
      ),

    data_vencimento:
      String(
        cliente.data_vencimento ??
        ""
      )

  });


  revalidatePath(
    "/vip-manual"
  );


  return {
    ok:
      true
  };
}


// ========================================
// MARCAR / DESMARCAR CONTA DE TESTE
// ========================================

export async function alterarVipManualTeste(
  clienteId: number,
  isTest: boolean
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

    redirect(
      "/login"
    );
  }


  if (
    !Number.isInteger(
      clienteId
    ) ||
    clienteId <= 0
  ) {

    throw new Error(
      "Cliente inválido."
    );
  }


  const {
    error
  } =
    await supabaseAdmin
      .from(
        "vip_manual_clientes"
      )
      .update({
        is_test:
          Boolean(
            isTest
          )
      })
      .eq(
        "id",
        clienteId
      );


  if (error) {

    console.error(
      "Erro alterando conta de teste do VIP Manual:",
      error
    );


    throw new Error(
      "Não foi possível alterar a conta de teste."
    );
  }


  revalidatePath(
    "/vip-manual"
  );
}
