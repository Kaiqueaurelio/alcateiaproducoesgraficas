import { useState, useRef, useEffect } from "react";
import { Send, Loader2, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function EllaChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Olá! Sou a Ella Ribeiro, sua assistente operacional. Posso ajudar você com: 📋 Criar/atualizar orçamentos, 📦 Gerenciar produtos e preços, 📝 Criar ordens de serviço, 💰 Controlar pagamentos. Como posso ajudar?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Chamada para a função de IA no servidor
      const response = await fetch("/api/ella-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) throw new Error("Erro ao comunicar com Ella");

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Se houver ações a executar, executar
      if (data.actions && data.actions.length > 0) {
        for (const action of data.actions) {
          await executeAction(action);
        }
      }
    } catch (error) {
      toast.error("Erro ao processar comando");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (action: any) => {
    try {
      const response = await fetch("/api/ella-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });

      if (!response.ok) throw new Error("Erro ao executar ação");

      const result = await response.json();
      toast.success(result.message || "Ação executada com sucesso");

      // Adicionar confirmação ao chat
      const confirmMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: `✅ ${result.message || "Ação concluída com sucesso"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMessage]);
    } catch (error) {
      toast.error("Erro ao executar ação");
      console.error(error);
    }
  };

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 z-50 rounded-full shadow-lg transition-all",
          open
            ? "h-12 w-12 bg-red-500 hover:bg-red-600"
            : "h-14 w-14 bg-gradient-to-br from-brand-yellow to-brand-orange hover:shadow-xl",
        )}
        aria-label="Assistente Ella"
      >
        {open ? (
          <X className="h-6 w-6 text-white mx-auto" />
        ) : (
          <MessageCircle className="h-7 w-7 text-brand-blue mx-auto" />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl flex flex-col h-[600px] border border-border">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-yellow to-brand-orange text-brand-blue p-4 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center font-bold">
                E
              </div>
              <div>
                <h3 className="font-bold text-sm">Ella Ribeiro</h3>
                <p className="text-xs opacity-90">Assistente Operacional</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2",
                  msg.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-xs px-4 py-2 rounded-lg text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-brand-yellow text-brand-blue rounded-br-none font-medium"
                      : "bg-white border border-border text-foreground rounded-bl-none",
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="bg-white border border-border text-foreground rounded-lg rounded-bl-none px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 bg-white rounded-b-2xl">
            <div className="flex gap-2">
              <Input
                placeholder="Peça algo para Ella..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={loading}
                className="text-sm"
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={loading || !input.trim()}
                className="bg-brand-yellow hover:bg-brand-yellow/90 text-brand-blue"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
