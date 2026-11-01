import { createClient } from "npm:@supabase/supabase-js@2";


// ========================================

// VARIÁVEIS
// ========================================

const TELEGRAM_MANUAL_BOT_TOKEN =
  Deno.env.get(
    "TELEGRAM_MANUAL_BOT_TOKEN"
  )?.trim() ?? "";


const TELEGRAM_MANUAL_WEBHOOK_SECRET =
  Deno.env.get(
    "TELEGRAM_MANUAL_WEBHOOK_SECRET"
  )?.trim() ?? "";


const TELEGRAM_MANUAL_GROUP_ID =
  Deno.env.get(
    "TELEGRAM_MANUAL_GROUP_ID"
  )?.trim() ?? "";


const VIP_MANUAL_INTERNAL_SECRET =
  Deno.env.get(
    "VIP_MANUAL_INTERNAL_SECRET"
  )?.trim() ?? "";


const SUPABASE_URL =
  Deno.env.get(
    "SUPABASE_URL"
  )?.trim() ?? "";


const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get(
    "SUPABASE_SERVICE_ROLE_KEY"
  )?.trim() ?? "";


// ========================================
// LINK DE ATENDIMENTO
// ========================================

const LINK_FALAR_COM_DAVI =
  "https://t.me/m/UPWs3OQWZGMx";


// ========================================
// SUPABASE
// ========================================

const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );


// ========================================
// TELEGRAM API
// ========================================

async function telegramApi(
  metodo: string,
  body: Record<string, unknown>
) {

  const response =
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_MANUAL_BOT_TOKEN}/${metodo}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(body)
      }
    );


  return await response.json();
}


// ========================================
// ENVIAR MENSAGEM
// ========================================

async function sendMessage(
  chatId: number,
  text: string
) {

  return await telegramApi(
    "sendMessage",
    {
      chat_id:
        chatId,

      text
    }
  );
}


// ========================================
// ENVIAR MENSAGEM COM BOTÃO
// ========================================

async function sendMessageComBotao(
  chatId: number,
  text: string,
  botaoTexto: string,
  botaoUrl: string
) {

  return await telegramApi(
    "sendMessage",
    {
      chat_id:
        chatId,

      text,

      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                botaoTexto,

              url:
                botaoUrl
            }
          ]
        ]
      }
    }
  );
}


// ========================================
// ENVIAR MENU PRINCIPAL
// ========================================

async function enviarMenuPrincipal(
  chatId: number
) {

  return await telegramApi(
    "sendMessage",
    {
      chat_id:
        chatId,

      text:
        "👋 Bem-vindo ao Davi VIP!\n\n" +
        "Escolha uma opção abaixo para gerenciar sua assinatura:",

      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "👤 Minha assinatura",

              callback_data:
                "menu_assinatura"
            }
          ],

          [
            {
              text:
                "💳 Quero renovar",

              callback_data:
                "menu_renovar"
            }
          ],

          [
            {
              text:
                "💬 Falar com Davi",

              url:
                LINK_FALAR_COM_DAVI
            }
          ],

          [
            {
              text:
                "📚 Como funciona",

              callback_data:
                "menu_como_funciona"
            }
          ]
        ]
      }
    }
  );
}


// ========================================
// BOTÃO VOLTAR AO MENU
// ========================================

async function enviarMensagemComVoltar(
  chatId: number,
  text: string
) {

  return await telegramApi(
    "sendMessage",
    {
      chat_id:
        chatId,

      text,

      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "⬅️ Voltar ao menu",

              callback_data:
                "menu_principal"
            }
          ]
        ]
      }
    }
  );
}


// ========================================
// DATA ATUAL EM SÃO PAULO
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
    )
      .formatToParts(
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
      "Não foi possível calcular a data atual."
    );
  }


  return `${ano}-${mes}-${dia}`;
}


// ========================================
// FORMATAR DATA
// ========================================

function formatarDataBR(
  valor: string
) {

  const data =
    String(
      valor ?? ""
    )
      .slice(
        0,
        10
      );


  const [
    ano,
    mes,
    dia
  ] =
    data.split("-");


  if (
    !ano ||
    !mes ||
    !dia
  ) {

    return valor;
  }


  return `${dia}/${mes}/${ano}`;
}


// ========================================
// FORMATAR VALOR
// ========================================

function formatarValorBR(
  valor: number
) {

  return Number(
    valor ?? 0
  )
    .toLocaleString(
      "pt-BR",
      {
        style:
          "currency",

        currency:
          "BRL"
      }
    );
}


// ========================================
// FORMATAR STATUS
// ========================================

function formatarStatus(
  status: string
) {

  if (
    status === "ativo"
  ) {

    return "✅ Ativo";
  }


  if (
    status === "vencido"
  ) {

    return "❌ Vencido";
  }


  if (
    status === "pendente"
  ) {

    return "⏳ Pendente";
  }


  return status || "Não informado";
}


// ========================================
// BUSCAR CLIENTE
// ========================================

async function buscarCliente(
  telegramId: number
) {

  const {
    data:
      cliente,

    error
  } =
    await supabase
      .from(
        "vip_manual_clientes"
      )
      .select(
        [
          "id",
          "nome",
          "telegram_id",
          "plano",
          "valor",
          "data_inicio",
          "data_vencimento",
          "status",
          "dias_graca",
          "removido_telegram_em"
        ].join(",")
      )
      .eq(
        "telegram_id",
        telegramId
      )
      .maybeSingle();


  if (
    error
  ) {

    throw error;
  }


  return cliente;
}


// ========================================
// VERIFICAR CLIENTE ATIVO
// ========================================

async function buscarClienteAtivo(
  telegramId: number
) {

  const cliente =
    await buscarCliente(
      telegramId
    );


  if (
    !cliente
  ) {

    throw new Error(
      "Cliente VIP Manual não encontrado."
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


  const ativo =
    cliente.status ===
      "ativo" &&

    Boolean(
      vencimento
    ) &&

    vencimento >=
      hoje;


  if (
    !ativo
  ) {

    throw new Error(
      "Assinatura VIP Manual não está ativa."
    );
  }


  return cliente;
}


// ========================================
// VERIFICAR SE USUÁRIO ESTÁ NO CANAL VIP
// ========================================

async function usuarioEstaNoCanalVip(
  telegramId: number
) {

  if (
    !TELEGRAM_MANUAL_GROUP_ID
  ) {

    return false;
  }


  const resultado =
    await telegramApi(
      "getChatMember",
      {
        chat_id:
          TELEGRAM_MANUAL_GROUP_ID,

        user_id:
          telegramId
      }
    );


  if (
    !resultado?.ok
  ) {

    return false;
  }


  const status =
    String(
      resultado
        ?.result
        ?.status ??
      ""
    );


  if (
    status === "creator" ||
    status === "administrator" ||
    status === "member"
  ) {

    return true;
  }


  if (
    status === "restricted" &&
    resultado
      ?.result
      ?.is_member ===
        true
  ) {

    return true;
  }


  return false;
}


// ========================================
// MENSAGEM ANTES DE LIBERAR O MENU
// ========================================

async function enviarMensagemAntesDoMenu(
  telegramId: number
) {

  const cliente =
    await buscarCliente(
      telegramId
    );


  if (
    !cliente
  ) {

    return await sendMessage(
      telegramId,

      "✅ Telegram confirmado com sucesso!\n\n" +
      "⏳ Estamos terminando seu cadastro para liberar seu acesso ao canal VIP.\n\n" +
      "Assim que estiver tudo pronto, você receberá aqui o botão 📺 ABRIR CANAL VIP."
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


  const ativo =
    cliente.status ===
      "ativo" &&

    Boolean(
      vencimento
    ) &&

    vencimento >=
      hoje;


  if (
    ativo
  ) {

    return await sendMessage(
      telegramId,

      "✅ Seu cadastro já foi concluído!\n\n" +
      "📺 Seu acesso ao canal VIP já foi liberado.\n\n" +
      "Use a mensagem de acesso que você recebeu e clique em 📺 ABRIR CANAL VIP.\n\n" +
      "O menu do Davi VIP será liberado assim que você entrar no canal."
    );
  }


  return await sendMessage(
    telegramId,

    "✅ Seu Telegram já está confirmado.\n\n" +
    "⏳ No momento, o menu do Davi VIP fica disponível somente para clientes com acesso ativo dentro do canal VIP."
  );
}


// ========================================
// MOSTRAR MINHA ASSINATURA
// ========================================

async function mostrarMinhaAssinatura(
  telegramId: number
) {

  const cliente =
    await buscarCliente(
      telegramId
    );


  if (
    !cliente
  ) {

    return await enviarMensagemComVoltar(
      telegramId,

      "👤 MINHA ASSINATURA\n\n" +
      "Ainda não encontrei uma assinatura cadastrada para este Telegram.\n\n" +
      "Se você acabou de confirmar seu Telegram, aguarde o atendimento concluir seu cadastro."
    );
  }


  const plano =
    String(
      cliente.plano ??
      "Não informado"
    );


  const valor =
    formatarValorBR(
      Number(
        cliente.valor ??
        0
      )
    );


  const vencimento =
    formatarDataBR(
      String(
        cliente.data_vencimento ??
        ""
      )
    );


  const status =
    formatarStatus(
      String(
        cliente.status ??
        ""
      )
    );


  return await enviarMensagemComVoltar(
    telegramId,

    "👤 MINHA ASSINATURA\n\n" +

    `📦 Plano: ${plano}\n` +
    `💰 Valor: ${valor}\n` +
    `📅 Vencimento: ${vencimento}\n` +
    `📌 Status: ${status}`
  );
}


// ========================================
// MOSTRAR RENOVAÇÃO
// ========================================

async function mostrarRenovacao(
  telegramId: number
) {

  const cliente =
    await buscarCliente(
      telegramId
    );


  let informacoes =
    "";


  if (
    cliente
  ) {

    const plano =
      String(
        cliente.plano ??
        "Não informado"
      );


    const vencimento =
      formatarDataBR(
        String(
          cliente.data_vencimento ??
          ""
        )
      );


    informacoes =
      `📦 Seu plano atual: ${plano}\n` +
      `📅 Vencimento: ${vencimento}\n\n`;
  }


  return await telegramApi(
    "sendMessage",
    {
      chat_id:
        telegramId,

      text:
        "💳 RENOVAR ASSINATURA\n\n" +

        informacoes +

        "Para renovar sua assinatura, clique no botão abaixo e fale diretamente com o Davi.\n\n" +

        "Depois que o pagamento for confirmado, sua nova validade será atualizada automaticamente.",

      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "💬 FALAR COM DAVI",

              url:
                LINK_FALAR_COM_DAVI
            }
          ],

          [
            {
              text:
                "⬅️ Voltar ao menu",

              callback_data:
                "menu_principal"
            }
          ]
        ]
      }
    }
  );
}


// ========================================
// COMO FUNCIONA
// ========================================

async function mostrarComoFunciona(
  telegramId: number
) {

  return await enviarMensagemComVoltar(
    telegramId,

    "📚 COMO FUNCIONA\n\n" +

    "1️⃣ Você confirma seu Telegram com o Davi VIP.\n\n" +

    "2️⃣ Após seu cadastro e pagamento, o bot envia seu acesso ao canal VIP.\n\n" +

    "3️⃣ Clique em 📺 ABRIR CANAL VIP e depois clique em “ENTRAR NO CANAL” dentro do Telegram.\n\n" +

    "4️⃣ Antes do vencimento, você receberá avisos para renovar.\n\n" +

    "5️⃣ Caso a assinatura não seja renovada, o acesso ao canal poderá ser removido automaticamente.\n\n" +

    "6️⃣ Depois da renovação, seu acesso é liberado novamente."
  );
}


// ========================================
// CRIAR LINK DIRETO
// ========================================

async function criarLinkVipManual(
  telegramId: number
) {

  if (
    !TELEGRAM_MANUAL_GROUP_ID
  ) {

    throw new Error(
      "TELEGRAM_MANUAL_GROUP_ID não configurado."
    );
  }


  const expiraEm =
    Math.floor(
      Date.now() / 1000
    ) +
    15 * 60;


  const resultado =
    await telegramApi(
      "createChatInviteLink",
      {
        chat_id:
          TELEGRAM_MANUAL_GROUP_ID,

        name:
          `vip-manual-${telegramId}`,

        expire_date:
          expiraEm,

        member_limit:
          1,

        creates_join_request:
          false
      }
    );


  if (
    !resultado?.ok ||
    !resultado?.result?.invite_link
  ) {

    console.error(
      "Erro criando link VIP Manual:",
      resultado
    );


    throw new Error(
      "Não foi possível gerar o link de acesso."
    );
  }


  return String(
    resultado.result.invite_link
  );
}


// ========================================
// REVOGAR LINK
// ========================================

async function revogarLink(
  inviteLink: string
) {

  if (
    !inviteLink
  ) {

    return;
  }


  const resultado =
    await telegramApi(
      "revokeChatInviteLink",
      {
        chat_id:
          TELEGRAM_MANUAL_GROUP_ID,

        invite_link:
          inviteLink
      }
    );


  if (
    !resultado?.ok
  ) {

    console.error(
      "Erro revogando link:",
      resultado
    );
  }
}


// ========================================
// REMOVER USUÁRIO NÃO AUTORIZADO
// ========================================

async function removerUsuario(
  telegramId: number
) {

  const ban =
    await telegramApi(
      "banChatMember",
      {
        chat_id:
          TELEGRAM_MANUAL_GROUP_ID,

        user_id:
          telegramId,

        revoke_messages:
          false
      }
    );


  if (
    !ban?.ok
  ) {

    console.error(
      "Erro removendo acesso indevido:",
      ban
    );


    return;
  }


  const unban =
    await telegramApi(
      "unbanChatMember",
      {
        chat_id:
          TELEGRAM_MANUAL_GROUP_ID,

        user_id:
          telegramId,

        only_if_banned:
          true
      }
    );


  if (
    !unban?.ok
  ) {

    console.error(
      "Erro liberando futuro reingresso:",
      unban
    );
  }
}


// ========================================
// BOTÃO CONFIRMAR TELEGRAM
// ========================================

async function enviarBotaoConfirmacao(
  chatId: number
) {

  return await telegramApi(
    "sendMessage",
    {
      chat_id:
        chatId,

      text:
        "👋 Olá! Bem-vindo ao Davi VIP.\n\n" +

        "Por aqui você poderá consultar sua assinatura, renovar e receber avisos importantes.\n\n" +

        "👇 Primeiro confirme que este é o seu Telegram:",

      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                "✅ CONFIRMAR MEU TELEGRAM",

              callback_data:
                "confirmar_telegram_manual"
            }
          ]
        ]
      }
    }
  );
}


// ========================================
// EDGE FUNCTION
// ========================================

Deno.serve(
  async (req) => {


    // ======================================
    // GET - CONFIGURAR WEBHOOK
    // ======================================

    if (
      req.method === "GET"
    ) {

      const webhookUrl =
        `${SUPABASE_URL}/functions/v1/telegram-manual-webhook`;


      const resultado =
        await telegramApi(
          "setWebhook",
          {
            url:
              webhookUrl,

            secret_token:
              TELEGRAM_MANUAL_WEBHOOK_SECRET,

            allowed_updates: [
              "message",
              "callback_query",
              "chat_member"
            ]
          }
        );


      return Response.json({
        ok:
          true,

        telegram:
          resultado
      });
    }


    // ======================================
    // SOMENTE POST
    // ======================================

    if (
      req.method !== "POST"
    ) {

      return new Response(
        "Método não permitido",
        {
          status:
            405
        }
      );
    }


    // ======================================
    // CHAMADA INTERNA DO PAINEL
    // ======================================

    const internalSecret =
      req.headers
        .get(
          "x-vip-manual-internal-secret"
        )
        ?.trim() ??
      "";


    if (
      internalSecret
    ) {

      if (
        !VIP_MANUAL_INTERNAL_SECRET ||
        internalSecret !==
          VIP_MANUAL_INTERNAL_SECRET
      ) {

        return new Response(
          "Não autorizado",
          {
            status:
              401
          }
        );
      }


      try {

        const body =
          await req.json();


        const action =
          String(
            body?.action ??
            ""
          );


        const telegramId =
          Number(
            body?.telegram_id
          );


        if (
          !telegramId
        ) {

          return Response.json(
            {
              ok:
                false,

              error:
                "Telegram ID ausente."
            },
            {
              status:
                400
            }
          );
        }


        if (action === "remover_cliente") {
          const clienteRemover = await buscarCliente(telegramId);
          if (!clienteRemover || clienteRemover.status !== "vencido") {
            return Response.json({ ok: false, error: "Bloqueie o acesso no painel antes de remover." }, { status: 409 });
          }
          if (!TELEGRAM_MANUAL_GROUP_ID) throw new Error("Grupo VIP não configurado.");
          const ban = await telegramApi("banChatMember", {
            chat_id: TELEGRAM_MANUAL_GROUP_ID, user_id: telegramId, revoke_messages: false
          });
          if (!ban?.ok) throw new Error("O Telegram não confirmou a remoção.");
          const unban = await telegramApi("unbanChatMember", {
            chat_id: TELEGRAM_MANUAL_GROUP_ID, user_id: telegramId, only_if_banned: true
          });
          if (!unban?.ok) throw new Error("Não foi possível liberar uma futura renovação.");
          const { error } = await supabase.from("vip_manual_clientes")
            .update({ removido_telegram_em: new Date().toISOString() })
            .eq("id", clienteRemover.id).eq("status", "vencido");
          if (error) throw error;
          return Response.json({ ok: true, action });
        }

        const cliente =
          await buscarClienteAtivo(
            telegramId
          );


        const plano =
          String(
            cliente.plano ??
            body?.plano ??
            ""
          );


        const valor =
          Number(
            cliente.valor ??
            body?.valor ??
            0
          );


        const vencimento =
          String(
            cliente.data_vencimento ??
            body?.data_vencimento ??
            ""
          );


        const valorBR =
          formatarValorBR(
            valor
          );


        const vencimentoBR =
          formatarDataBR(
            vencimento
          );


        // ==================================
        // ATIVAR / REENVIAR
        // ==================================

        if (
          action ===
          "ativar_cliente"
        ) {

          const link =
            await criarLinkVipManual(
              telegramId
            );


          const envio =
            await sendMessageComBotao(
              telegramId,

              "🎉 SUA ASSINATURA ESTÁ ATIVA!\n\n" +

              `📦 Plano: ${plano}\n` +
              `💰 Valor: ${valorBR}\n` +
              `📅 Validade: ${vencimentoBR}\n` +
              "✅ Status: Ativo\n\n" +

              "📲 COMO ENTRAR:\n\n" +

              "1️⃣ Clique no botão 📺 ABRIR CANAL VIP abaixo.\n\n" +

              "2️⃣ O canal será aberto no Telegram.\n\n" +

              "3️⃣ Quando o canal abrir, clique em “ENTRAR NO CANAL” na parte de baixo da tela.\n\n" +

              "✅ Pronto! Depois disso você estará dentro do canal VIP.\n\n" +

              "🔐 O link é individual, temporário e expira em 15 minutos.",

              "📺 ABRIR CANAL VIP",

              link
            );


          if (
            !envio?.ok
          ) {

            console.error(
              "Erro enviando acesso:",
              envio
            );


            throw new Error(
              "Não foi possível enviar o acesso."
            );
          }


          return Response.json({
            ok:
              true,

            action:
              "ativar_cliente"
          });
        }


        // ==================================
        // PAGAMENTO CONFIRMADO
        // ==================================

        if (
          action ===
          "pagamento_confirmado"
        ) {

          const gerarLink =
            body?.gerar_link ===
            true;


          const mensagem =
            "✅ PAGAMENTO CONFIRMADO!\n\n" +

            `📦 Plano: ${plano}\n` +
            `💰 Valor: ${valorBR}\n` +
            `📅 Nova validade: ${vencimentoBR}\n\n` +

            "Sua assinatura está ativa. Obrigado! 🎬";


          if (
            gerarLink
          ) {

            const link =
              await criarLinkVipManual(
                telegramId
              );


            const envio =
              await sendMessageComBotao(
                telegramId,

                mensagem +

                "\n\n📲 COMO VOLTAR AO CANAL:\n\n" +

                "1️⃣ Clique no botão 📺 ABRIR CANAL VIP abaixo.\n\n" +

                "2️⃣ Quando o canal abrir, clique em “ENTRAR NO CANAL” na parte de baixo da tela.\n\n" +

                "✅ Depois disso seu acesso estará liberado novamente.",

                "📺 ABRIR CANAL VIP",

                link
              );


            if (
              !envio?.ok
            ) {

              throw new Error(
                "Não foi possível enviar o novo acesso."
              );
            }


          } else {

            const envio =
              await sendMessage(
                telegramId,
                mensagem
              );


            if (
              !envio?.ok
            ) {

              throw new Error(
                "Não foi possível enviar a confirmação."
              );
            }
          }


          return Response.json({
            ok:
              true,

            action:
              "pagamento_confirmado"
          });
        }


        return Response.json(
          {
            ok:
              false,

            error:
              "Ação interna desconhecida."
          },
          {
            status:
              400
          }
        );


      } catch (
        error
      ) {

        console.error(
          "Erro interno VIP Manual:",
          error
        );


        return Response.json(
          {
            ok:
              false,

            error:
              "Erro processando ação interna."
          },
          {
            status:
              500
          }
        );
      }
    }


    // ======================================
    // SEGURANÇA TELEGRAM
    // ======================================

    const telegramSecret =
      req.headers
        .get(
          "x-telegram-bot-api-secret-token"
        )
        ?.trim() ??
      "";


    if (
      telegramSecret !==
      TELEGRAM_MANUAL_WEBHOOK_SECRET
    ) {

      return new Response(
        "Não autorizado",
        {
          status:
            401
        }
      );
    }


    try {

      const update =
        await req.json();


      // ====================================
      // USUÁRIO ENTROU NO CANAL
      // ====================================

      const chatMemberUpdate =
        update?.chat_member;


      if (
        chatMemberUpdate
      ) {

        const chatId =
          chatMemberUpdate
            ?.chat
            ?.id;


        if (
          String(
            chatId
          ) !==
          String(
            TELEGRAM_MANUAL_GROUP_ID
          )
        ) {

          return Response.json({
            ok:
              true
          });
        }


        const novoMembro =
          chatMemberUpdate
            ?.new_chat_member;


        const telegramId =
          Number(
            novoMembro
              ?.user
              ?.id
          );


        const status =
          String(
            novoMembro
              ?.status ??
            ""
          );


        const isMember =
          status ===
            "member" ||

          status ===
            "administrator" ||

          status ===
            "creator" ||

          (
            status ===
              "restricted" &&

            novoMembro
              ?.is_member ===
              true
          );


        if (
          !telegramId ||
          !isMember
        ) {

          return Response.json({
            ok:
              true
          });
        }


        const inviteLink =
          String(
            chatMemberUpdate
              ?.invite_link
              ?.invite_link ??
            ""
          );


        const inviteName =
          String(
            chatMemberUpdate
              ?.invite_link
              ?.name ??
            ""
          );


        if (
          !inviteName.startsWith(
            "vip-manual-"
          )
        ) {

          return Response.json({
            ok:
              true
          });
        }


        const telegramEsperado =
          Number(
            inviteName.replace(
              "vip-manual-",
              ""
            )
          );


        if (
          !telegramEsperado ||
          telegramId !==
            telegramEsperado
        ) {

          console.error(
            "LINK VIP MANUAL USADO POR OUTRA CONTA:",
            {
              telegram_id:
                telegramId,

              telegram_esperado:
                telegramEsperado
            }
          );


          if (
            inviteLink
          ) {

            await revogarLink(
              inviteLink
            );
          }


          await removerUsuario(
            telegramId
          );


          if (
            telegramEsperado
          ) {

            await sendMessage(
              telegramEsperado,

              "⚠️ Seu link foi utilizado por outra conta e foi bloqueado por segurança.\n\n" +
              "Solicite um novo acesso."
            );
          }


          return Response.json({
            ok:
              true
          });
        }


        if (
          inviteLink
        ) {

          await revogarLink(
            inviteLink
          );
        }


        // Um convite antigo não pode reativar uma assinatura removida.
        try {
          await buscarClienteAtivo(telegramId);
        } catch {
          await removerUsuario(telegramId);
          return Response.json({ ok: true });
        }

        await sendMessage(
          telegramId,

          "✅ ENTRADA CONCLUÍDA!\n\n" +
          "Você já está dentro do canal VIP. 🎬\n\n" +
          "Aproveite seu acesso!"
        );


        await enviarMenuPrincipal(
          telegramId
        );


        return Response.json({
          ok:
            true
        });
      }


      // ====================================
      // CALLBACKS DO MENU
      // ====================================

      const callbackQuery =
        update?.callback_query;


      if (
        callbackQuery
      ) {

        const telegramId =
          Number(
            callbackQuery
              ?.from
              ?.id
          );


        const callbackData =
          String(
            callbackQuery
              ?.data ??
            ""
          );


        if (
          !telegramId
        ) {

          return Response.json({
            ok:
              true
          });
        }


        // ==================================
        // CONFIRMAR TELEGRAM
        // ==================================

        if (
          callbackData ===
          "confirmar_telegram_manual"
        ) {

          const telegramUsername =
            callbackQuery
              ?.from
              ?.username ??
            null;


          const telegramNome = [
            callbackQuery
              ?.from
              ?.first_name,

            callbackQuery
              ?.from
              ?.last_name
          ]
            .filter(
              Boolean
            )
            .join(
              " "
            );


          const agora =
            new Date()
              .toISOString();


          const {
            error
          } =
            await supabase
              .from(
                "telegram_manual_usuarios"
              )
              .upsert(
                {
                  telegram_id:
                    telegramId,

                  telegram_username:
                    telegramUsername,

                  nome:
                    telegramNome ||
                    null,

                  ultimo_contato_em:
                    agora,

                  confirmado_em:
                    agora
                },
                {
                  onConflict:
                    "telegram_id"
                }
              );


          if (
            error
          ) {

            console.error(
              "Erro confirmando Telegram:",
              error
            );


            await sendMessage(
              telegramId,

              "❌ Não consegui confirmar seu Telegram agora."
            );


            return Response.json({
              ok:
                true
            });
          }


          await telegramApi(
            "answerCallbackQuery",
            {
              callback_query_id:
                callbackQuery.id,

              text:
                "Telegram confirmado ✅"
            }
          );


          await enviarMensagemAntesDoMenu(
            telegramId
          );


          return Response.json({
            ok:
              true
          });
        }


        // ==================================
        // BLOQUEAR MENU FORA DO CANAL VIP
        // ==================================

        if (
          callbackData.startsWith(
            "menu_"
          )
        ) {

          const estaNoCanal =
            await usuarioEstaNoCanalVip(
              telegramId
            );


          if (
            !estaNoCanal
          ) {

            await telegramApi(
              "answerCallbackQuery",
              {
                callback_query_id:
                  callbackQuery.id,

                text:
                  "Menu liberado após entrar no canal VIP."
              }
            );


            await enviarMensagemAntesDoMenu(
              telegramId
            );


            return Response.json({
              ok:
                true
            });
          }
        }


        // ==================================
        // MENU PRINCIPAL
        // ==================================

        if (
          callbackData ===
          "menu_principal"
        ) {

          await telegramApi(
            "answerCallbackQuery",
            {
              callback_query_id:
                callbackQuery.id
            }
          );


          await enviarMenuPrincipal(
            telegramId
          );


          return Response.json({
            ok:
              true
          });
        }


        // ==================================
        // MINHA ASSINATURA
        // ==================================

        if (
          callbackData ===
          "menu_assinatura"
        ) {

          await telegramApi(
            "answerCallbackQuery",
            {
              callback_query_id:
                callbackQuery.id
            }
          );


          await mostrarMinhaAssinatura(
            telegramId
          );


          return Response.json({
            ok:
              true
          });
        }


        // ==================================
        // RENOVAR
        // ==================================

        if (
          callbackData ===
          "menu_renovar"
        ) {

          await telegramApi(
            "answerCallbackQuery",
            {
              callback_query_id:
                callbackQuery.id
            }
          );


          await mostrarRenovacao(
            telegramId
          );


          return Response.json({
            ok:
              true
          });
        }


        // ==================================
        // COMO FUNCIONA
        // ==================================

        if (
          callbackData ===
          "menu_como_funciona"
        ) {

          await telegramApi(
            "answerCallbackQuery",
            {
              callback_query_id:
                callbackQuery.id
            }
          );


          await mostrarComoFunciona(
            telegramId
          );


          return Response.json({
            ok:
              true
          });
        }


        return Response.json({
          ok:
            true
        });
      }


      // ====================================
      // MENSAGENS PRIVADAS
      // ====================================

      const message =
        update?.message;


      if (
        !message?.from ||
        !message?.chat ||
        message.chat.type !==
          "private"
      ) {

        return Response.json({
          ok:
            true
          });
      }


      const telegramId =
        Number(
          message.from.id
        );


      const telegramUsername =
        message.from.username ??
        null;


      const telegramNome = [
        message.from.first_name,
        message.from.last_name
      ]
        .filter(
          Boolean
        )
        .join(
          " "
        );


      const agora =
        new Date()
          .toISOString();


      // ====================================
      // VER USUÁRIO EXISTENTE
      // ====================================

      const {
        data:
          usuarioExistente
      } =
        await supabase
          .from(
            "telegram_manual_usuarios"
          )
          .select(
            "telegram_id, confirmado_em"
          )
          .eq(
            "telegram_id",
            telegramId
          )
          .maybeSingle();


      // ====================================
      // ATUALIZAR USUÁRIO
      // ====================================

      const dadosUsuario: Record<
        string,
        unknown
      > = {

        telegram_id:
          telegramId,

        telegram_username:
          telegramUsername,

        nome:
          telegramNome ||
          null,

        ultimo_contato_em:
          agora
      };


      if (
        !usuarioExistente
      ) {

        dadosUsuario
          .primeiro_contato_em =
            agora;
      }


      const {
        error:
          usuarioError
      } =
        await supabase
          .from(
            "telegram_manual_usuarios"
          )
          .upsert(
            dadosUsuario,
            {
              onConflict:
                "telegram_id"
            }
          );


      if (
        usuarioError
      ) {

        console.error(
          "Erro salvando usuário:",
          usuarioError
        );
      }


      const texto =
        String(
          message.text ??
          ""
        )
          .trim();


      // ====================================
      // /START
      // ====================================

      if (
        texto.startsWith(
          "/start"
        )
      ) {

        const confirmado =
          Boolean(
            usuarioExistente
              ?.confirmado_em
          );


        if (
          confirmado
        ) {

          const estaNoCanal =
            await usuarioEstaNoCanalVip(
              telegramId
            );


          if (
            estaNoCanal
          ) {

            await enviarMenuPrincipal(
              telegramId
            );

          } else {

            await enviarMensagemAntesDoMenu(
              telegramId
            );
          }

        } else {

          await enviarBotaoConfirmacao(
            telegramId
          );
        }


        return Response.json({
          ok:
            true
        });
      }


      // ====================================
      // QUALQUER OUTRA MENSAGEM
      // ====================================

      const confirmado =
        Boolean(
          usuarioExistente
            ?.confirmado_em
        );


      if (
        !confirmado
      ) {

        await enviarBotaoConfirmacao(
          telegramId
        );

      } else {

        const estaNoCanal =
          await usuarioEstaNoCanalVip(
            telegramId
          );


        if (
          estaNoCanal
        ) {

          await enviarMenuPrincipal(
            telegramId
          );

        } else {

          await enviarMensagemAntesDoMenu(
            telegramId
          );
        }
      }


      return Response.json({
        ok:
          true
      });


    } catch (
      error
    ) {

      console.error(
        "Erro Telegram Manual:",
        error
      );


      return Response.json(
        {
          ok:
            false,

          error:
            "Erro interno"
        },
        {
          status:
            500
        }
      );
    }

  }
);
