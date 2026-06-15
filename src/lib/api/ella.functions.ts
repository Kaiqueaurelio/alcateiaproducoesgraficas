import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const EllaChatInputSchema = z.object({
  message: z.string().min(1),
  conversationHistory: z.array(MessageSchema).optional(),
});

const EllaExecuteSchema = z.object({
  type: z.enum([
    "update_service_price",
    "create_service",
    "create_quote",
    "create_order",
    "update_quote_status",
  ]),
  data: z.record(z.any()),
});

/**
 * Processa mensagens do usuário e gera respostas da Ella usando LLM
 */
export const ellaChat = createServerFn({ method: "POST" })
  .inputValidator(EllaChatInputSchema)
  .handler(async ({ data }) => {
    const { message, conversationHistory = [] } = data;

    try {
      // Construir o contexto para o LLM
      const systemPrompt = `Você é Ella Ribeiro, uma assistente operacional inteligente para a Alcateia's Produções Gráficas.

Sua responsabilidade é ajudar o administrador a:
1. Gerenciar produtos e serviços (criar, atualizar preços, ativar/desativar)
2. Criar e atualizar orçamentos
3. Criar ordens de serviço
4. Processar pagamentos e cobranças
5. Consultar dados de clientes e pedidos

Quando o usuário pedir para fazer algo, você deve:
1. Entender o comando em linguagem natural
2. Extrair os parâmetros necessários
3. Sugerir a ação a ser executada
4. Retornar uma resposta clara e amigável

IMPORTANTE: Sempre responda em português brasileiro, de forma profissional mas amigável.
Quando precisar executar uma ação, inclua um JSON com a estrutura da ação no final da sua resposta.`;

      // Preparar histórico de conversas para o LLM
      const conversationMessages = conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Chamar a API do OpenAI (ou LLM configurado)
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            ...conversationMessages,
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.statusText}`);
      }

      const result = await response.json();
      const assistantResponse = result.choices[0].message.content;

      // Tentar extrair ações JSON da resposta
      const actionMatch = assistantResponse.match(/```json\n([\s\S]*?)\n```/);
      const actions = actionMatch ? JSON.parse(actionMatch[1]) : null;

      return {
        response: assistantResponse.replace(/```json\n[\s\S]*?\n```/g, "").trim(),
        actions: actions ? (Array.isArray(actions) ? actions : [actions]) : [],
      };
    } catch (error) {
      console.error("Ella chat error:", error);
      return {
        response:
          "Desculpe, ocorreu um erro ao processar seu comando. Tente novamente.",
        actions: [],
      };
    }
  });

/**
 * Executa ações solicitadas pela Ella no banco de dados
 */
export const ellaExecute = createServerFn({ method: "POST" })
  .inputValidator(EllaExecuteSchema)
  .handler(async ({ data }) => {
    const { type, data: actionData } = data;

    try {
      // Aqui você implementaria a lógica para cada tipo de ação
      // Por enquanto, retornaremos um placeholder

      switch (type) {
        case "update_service_price":
          return {
            success: true,
            message: `Preço do serviço "${actionData.serviceName}" atualizado para R$ ${actionData.newPrice}`,
          };

        case "create_service":
          return {
            success: true,
            message: `Serviço "${actionData.name}" criado com sucesso`,
          };

        case "create_quote":
          return {
            success: true,
            message: `Orçamento #${actionData.quoteNumber} criado para ${actionData.clientName}`,
          };

        case "create_order":
          return {
            success: true,
            message: `Ordem de Serviço #${actionData.orderNumber} criada com sucesso`,
          };

        case "update_quote_status":
          return {
            success: true,
            message: `Status do orçamento atualizado para "${actionData.status}"`,
          };

        default:
          return {
            success: false,
            message: "Tipo de ação não reconhecido",
          };
      }
    } catch (error) {
      console.error("Ella execute error:", error);
      return {
        success: false,
        message: "Erro ao executar a ação",
      };
    }
  });
