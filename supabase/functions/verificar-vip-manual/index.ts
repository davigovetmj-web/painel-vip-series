import { createClient } from "npm:@supabase/supabase-js@2";


// ========================================
// VARIÁVEIS
// ========================================

const TELEGRAM_MANUAL_BOT_TOKEN =
  Deno.env.get(
    "TELEGRAM_MANUAL_BOT_TOKEN"
  )?.trim() ?? "";


const TELEGRAM_MANUAL_GROUP_ID =
  Deno.env.get(
    "TELEGRAM_MANUAL_GROUP_ID"
  )?.trim() ?? "";


const VIP_MANUAL_CRON_SECRET =
  Deno.env.get(
    "VIP_MANUAL_CRON_SECRET"
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
// SUPABASE
// ========================================

const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );


// ========================================
// DATA DE HOJE EM SÃO PAULO
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
// CONVERTER DATA PARA UTC
// ========================================

function dataParaUTC(
  dataISO: string
) {

  const [
    ano,
    mes,
    dia
  ] =
    dataISO
      .slice(0, 10)
      .split("-")
      .map(Number);


  return new Date(
    Date.UTC(
      ano,
      mes - 1,
      dia
    )
  );
}


// ========================================
// DIFERENÇA ENTRE DATAS
// ========================================

function diferencaDias(
  inicioISO: string,
  fimISO: string
) {

  const inicio =
    dataParaUTC(
      inicioISO
    );


  const fim =
    dataParaUTC(
      fimISO
    );


  const diferenca =
    fim.getTime() -
    inicio.getTime();


  return Math.round(
    diferenca /
    (
      1000 *
      60 *
      60 *
      24
    )
  );
}


// ========================================
// SOMAR DIAS
// ========================================

function adicionarDias(
  dataISO: string,
  dias: number
) {

  const data =
    dataParaUTC(
      dataISO
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
// FORMATAR DATA BR
// ========================================

function formatarData(
  dataISO: string
) {

  const [
    ano,
    mes,
    dia
  ] =
    dataISO
      .slice(0, 10)
      .split("-");


  return `${dia}/${mes}/${ano}`;
}


// ========================================
// FORMATAR DINHEIRO
// ========================================

function formatarValor(
  valor: number
) {

  return Number(
    valor
  ).toLocaleString(
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
// ENVIAR MENSAGEM
// ========================================

async function sendMessage(
  telegramId: number,
  texto: string
) {

  const response =
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_MANUAL_BOT_TOKEN}/sendMessage`,
      {

        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({

            chat_id:
              telegramId,

            text:
              texto

          })

      }
    );


  const resultado =
    await response.json();


  if (
    !resultado?.ok
  ) {

    console.error(
      "Erro enviando mensagem Telegram:",
      resultado
    );


    throw new Error(
      "Telegram não conseguiu enviar a mensagem."
    );
  }


  return resultado;
}


// ========================================
// REMOVER CLIENTE DO VIP
// ========================================

async function removerDoVip(
  telegramId: number
) {

  if (
    !TELEGRAM_MANUAL_GROUP_ID
  ) {

    throw new Error(
      "TELEGRAM_MANUAL_GROUP_ID não configurado."
    );
  }


  // BAN temporário para expulsar
  const banResponse =
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_MANUAL_BOT_TOKEN}/banChatMember`,
      {

        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({

            chat_id:
              TELEGRAM_MANUAL_GROUP_ID,

            user_id:
              telegramId,

            revoke_messages:
              false

          })

      }
    );


  const banResultado =
    await banResponse.json();


  if (
    !banResultado?.ok
  ) {

    console.error(
      "Erro removendo cliente:",
      banResultado
    );


    throw new Error(
      "Não foi possível remover o cliente do VIP."
    );
  }


  // Desbanir logo depois.
  // Assim ele continua removido,
  // mas poderá entrar novamente
  // quando pagar e receber novo link.
  const unbanResponse =
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_MANUAL_BOT_TOKEN}/unbanChatMember`,
      {

        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({

            chat_id:
              TELEGRAM_MANUAL_GROUP_ID,

            user_id:
              telegramId,

            only_if_banned:
              true

          })

      }
    );


  const unbanResultado =
    await unbanResponse.json();


  if (
    !unbanResultado?.ok
  ) {

    console.error(
      "Erro liberando futuro reingresso:",
      unbanResultado
    );
  }


  return true;
}


// ========================================
// EDGE FUNCTION
// ========================================

Deno.serve(
  async (req) => {


    // ======================================
    // TESTE DE VIDA
    // ======================================

    if (
      req.method ===
      "GET"
    ) {

      return Response.json({
        ok: true,
        function:
          "verificar-vip-manual",
        status:
          "online"
      });
    }


    // ======================================
    // SOMENTE POST PARA EXECUTAR
    // ======================================

    if (
      req.method !==
      "POST"
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
    // SEGURANÇA
    // ======================================

    const cronSecret =
      req.headers
        .get(
          "x-cron-secret"
        )
        ?.trim() ??
      "";


    if (
      !VIP_MANUAL_CRON_SECRET ||
      cronSecret !==
        VIP_MANUAL_CRON_SECRET
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


      const hoje =
        dataHojeSaoPaulo();


      // ======================================
      // BUSCAR CLIENTES
      // ======================================

      const {
        data:
          clientes,

        error:
          clientesError
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
              "data_vencimento",
              "status",
              "dias_graca",
              "aviso_3_dias_enviado_em",
              "aviso_1_dia_enviado_em",
              "aviso_vencimento_enviado_em",
              "removido_telegram_em"
            ].join(",")
          )
          .eq(
            "status",
            "ativo"
          );


      if (
        clientesError
      ) {

        throw clientesError;
      }


      const lista =
        clientes ??
        [];


      let avisos3Dias =
        0;

      let avisos1Dia =
        0;

      let avisosVencimento =
        0;

      let removidos =
        0;

      let erros =
        0;


      // ======================================
      // PROCESSAR CLIENTES
      // ======================================

      for (
        const cliente
        of lista
      ) {

        try {


          const telegramId =
            Number(
              cliente.telegram_id
            );


          if (
            !telegramId ||
            !cliente.data_vencimento
          ) {

            continue;
          }


          const vencimento =
            String(
              cliente.data_vencimento
            )
              .slice(
                0,
                10
              );


          const diasRestantes =
            diferencaDias(
              hoje,
              vencimento
            );


          const plano =
            String(
              cliente.plano ??
              "-"
            );


          const valor =
            Number(
              cliente.valor ??
              0
            );


          const valorBR =
            formatarValor(
              valor
            );


          const vencimentoBR =
            formatarData(
              vencimento
            );


          const nome =
            String(
              cliente.nome ??
              "Cliente"
            );


          const diasGraca =
            Math.max(
              0,

              Number(
                cliente.dias_graca ??
                0
              ) ||
              0
            );


          // ==================================
          // AVISO - 3 DIAS
          // ==================================

          if (
            diasRestantes ===
              3 &&
            !cliente
              .aviso_3_dias_enviado_em
          ) {

            await sendMessage(

              telegramId,

              `⏰ Olá, ${nome}!\n\n` +
              "Sua assinatura VIP vence em 3 dias.\n\n" +
              `📦 Plano: ${plano}\n` +
              `📅 Vencimento: ${vencimentoBR}\n\n` +
              "💬 Para renovar, fale com Davi."

            );


            const {
              error
            } =
              await supabase
                .from(
                  "vip_manual_clientes"
                )
                .update({

                  aviso_3_dias_enviado_em:
                    new Date()
                      .toISOString()

                })
                .eq(
                  "id",
                  cliente.id
                );


            if (
              error
            ) {

              throw error;
            }


            avisos3Dias++;
          }


          // ==================================
          // AVISO - 1 DIA
          // ==================================

          if (
            diasRestantes ===
              1 &&
            !cliente
              .aviso_1_dia_enviado_em
          ) {

            await sendMessage(

              telegramId,

              `⚠️ Olá, ${nome}!\n\n` +
              "Sua assinatura VIP vence amanhã.\n\n" +
              `📦 Plano: ${plano}\n` +
              `📅 Vencimento: ${vencimentoBR}\n\n` +
              "💬 Fale com Davi para renovar e manter seu acesso."

            );


            const {
              error
            } =
              await supabase
                .from(
                  "vip_manual_clientes"
                )
                .update({

                  aviso_1_dia_enviado_em:
                    new Date()
                      .toISOString()

                })
                .eq(
                  "id",
                  cliente.id
                );


            if (
              error
            ) {

              throw error;
            }


            avisos1Dia++;
          }


          // ==================================
          // AVISO - VENCIMENTO
          // ==================================

          if (
            diasRestantes ===
              0 &&
            !cliente
              .aviso_vencimento_enviado_em
          ) {


            let textoTolerancia =
              "";


            if (
              diasGraca >
              0
            ) {

              textoTolerancia =
                `\n\n⏳ Você possui ${diasGraca} dia(s) de tolerância antes da remoção do VIP.`;

            } else {

              textoTolerancia =
                "\n\n⚠️ Não há dias de tolerância cadastrados. O acesso será removido após o vencimento.";

            }


            await sendMessage(

              telegramId,

              `📅 Olá, ${nome}!\n\n` +
              "Sua assinatura VIP vence hoje.\n\n" +
              `📦 Plano: ${plano}\n` +
              `📅 Vencimento: ${vencimentoBR}` +
              textoTolerancia +
              "\n\n💬 Fale com Davi para confirmar sua renovação."

            );


            const {
              error
            } =
              await supabase
                .from(
                  "vip_manual_clientes"
                )
                .update({

                  aviso_vencimento_enviado_em:
                    new Date()
                      .toISOString()

                })
                .eq(
                  "id",
                  cliente.id
                );


            if (
              error
            ) {

              throw error;
            }


            avisosVencimento++;
          }


          // ==================================
          // DATA DE REMOÇÃO
          // ==================================

          const dataRemocao =
            adicionarDias(

              vencimento,

              diasGraca +
              1

            );


          // ==================================
          // REMOVER APÓS TOLERÂNCIA
          // ==================================

          if (
            hoje >=
              dataRemocao &&
            !cliente
              .removido_telegram_em
          ) {


            await removerDoVip(
              telegramId
            );


            const agora =
              new Date()
                .toISOString();


            const {
              error
            } =
              await supabase
                .from(
                  "vip_manual_clientes"
                )
                .update({

                  status:
                    "vencido",

                  removido_telegram_em:
                    agora,

                  updated_at:
                    agora

                })
                .eq(
                  "id",
                  cliente.id
                );


            if (
              error
            ) {

              throw error;
            }


            await sendMessage(

              telegramId,

              `❌ Olá, ${nome}.\n\n` +
              "Seu acesso ao VIP foi encerrado porque a assinatura não foi renovada.\n\n" +
              `📦 Plano: ${plano}\n` +
              `📅 Vencimento: ${vencimentoBR}\n\n` +
              "💬 Para voltar ao VIP, fale com Davi. Após a confirmação do pagamento você receberá um novo acesso."

            );


            removidos++;
          }


        } catch (
          clienteError
        ) {


          erros++;


          console.error(
            "Erro processando cliente:",
            cliente?.id,
            clienteError
          );

        }

      }


      // ======================================
      // RESULTADO
      // ======================================

      return Response.json({

        ok:
          true,

        data:
          hoje,

        clientes_verificados:
          lista.length,

        avisos_3_dias:
          avisos3Dias,

        avisos_1_dia:
          avisos1Dia,

        avisos_vencimento:
          avisosVencimento,

        removidos,

        erros

      });


    } catch (
      error
    ) {


      console.error(
        "Erro geral:",
        error
      );


      return Response.json(
        {

          ok:
            false,

          error:
            "Erro ao verificar assinaturas do VIP Manual."

        },
        {
          status:
            500
        }
      );

    }

  }
);