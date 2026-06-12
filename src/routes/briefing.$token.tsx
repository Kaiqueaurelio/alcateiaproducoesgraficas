/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Download, FileUp, MessageSquare, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  BRIEFING_ACCEPT,
  BRIEFING_PRODUCTS,
  isAllowedBriefingFile,
  isPreviewable,
  PRODUCT_FIELDS,
  safeFileName,
} from "@/lib/briefing";

export const Route = createFileRoute("/briefing/$token")({ component: PublicBriefing });

function PublicBriefing() {
  const { token } = Route.useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState<any>({
    client_name: "",
    whatsapp: "",
    product_type: "Caneca",
    quantity: "",
    desired_deadline: "",
    observations: "",
    answers: {},
  });

  async function load() {
    setLoading(true);
    const { data: result, error } = await (supabase as any).rpc("get_public_briefing", {
      _token: token,
    });
    setLoading(false);
    if (error) return toast.error("Este link não está disponível.");
    setData(result);
    if (result?.briefing)
      setForm({ ...form, ...result.briefing, answers: result.briefing.answers || {} });
  }

  useEffect(() => {
    load();
  }, [token]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.client_name || !form.whatsapp || !form.product_type)
      return toast.error("Preencha nome, WhatsApp e produto.");
    setSending(true);
    const uploaded: any[] = [];
    for (const file of files) {
      if (!isAllowedBriefingFile(file)) {
        setSending(false);
        return toast.error(`${file.name} não é permitido ou excede 50 MB.`);
      }
      const path = `${token}/briefing/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage
        .from("briefing-files")
        .upload(path, file, { upsert: false });
      if (error) {
        setSending(false);
        return toast.error(`Falha no arquivo ${file.name}: ${error.message}`);
      }
      uploaded.push({
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        category: "referencia",
      });
    }
    const { error } = await (supabase as any).rpc("submit_public_briefing", {
      _token: token,
      _payload: form,
      _files: uploaded,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    setFiles([]);
    toast.success("Briefing enviado para a equipe!");
    load();
  }

  if (loading)
    return (
      <PublicShell>
        <p className="text-center text-muted-foreground">Carregando briefing...</p>
      </PublicShell>
    );
  if (!data)
    return (
      <PublicShell>
        <Card className="p-8 text-center">
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 text-xl font-bold">Link indisponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">Solicite um novo link à Alcateia's.</p>
        </Card>
      </PublicShell>
    );

  const versions = data.versions || [];
  return (
    <PublicShell>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-primary">Central de Briefing e Aprovação</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.order ? `OS #${data.order.number}` : `Orçamento #${data.quote?.number}`} ·{" "}
          {data.order?.client_name || data.quote?.client_name}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="p-5 md:p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-primary">Briefing do pedido</h2>
            <p className="text-xs text-muted-foreground">
              Conte tudo que a equipe precisa para criar sua arte.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                />
              </div>
              <div>
                <Label>WhatsApp *</Label>
                <Input
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </div>
              <div>
                <Label>Produto *</Label>
                <Select
                  value={form.product_type}
                  onValueChange={(value) => setForm({ ...form, product_type: value, answers: {} })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BRIEFING_PRODUCTS.map((product) => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  value={form.quantity ?? ""}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Prazo desejado</Label>
                <Input
                  type="date"
                  value={form.desired_deadline ?? ""}
                  onChange={(e) => setForm({ ...form, desired_deadline: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(PRODUCT_FIELDS[form.product_type] || []).map((field) => (
                <div key={field.key} className={field.key === "detalhes" ? "sm:col-span-2" : ""}>
                  <Label>{field.label}</Label>
                  <Input
                    value={form.answers?.[field.key] || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        answers: { ...form.answers, [field.key]: e.target.value },
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                rows={4}
                value={form.observations ?? ""}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
              />
            </div>
            <div>
              <Label>Referências, logos, fotos e arquivos</Label>
              <label className="mt-1 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed p-6 text-center hover:border-gold">
                <FileUp className="mb-2 h-7 w-7 text-primary" />
                <span className="text-sm font-medium">Selecionar arquivos</span>
                <span className="text-xs text-muted-foreground">
                  PNG, JPG, PDF, SVG, WEBP, CDR, AI ou PSD
                </span>
                <input
                  className="hidden"
                  type="file"
                  multiple
                  accept={BRIEFING_ACCEPT}
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
              </label>
              {files.length > 0 && (
                <div className="mt-2 space-y-1 text-xs">
                  {files.map((file) => (
                    <p key={file.name}>
                      {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  ))}
                </div>
              )}
            </div>
            <Button className="w-full" disabled={sending}>
              {sending ? "Enviando..." : data.briefing ? "Atualizar briefing" : "Enviar briefing"}
            </Button>
          </form>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-emerald-600" />
              <div>
                <h2 className="font-semibold">Seus arquivos estão protegidos</h2>
                <p className="text-xs text-muted-foreground">
                  Este link dá acesso somente ao seu pedido.
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold text-primary">Artes para aprovação</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Confira cada versão e envie sua decisão.
            </p>
            <div className="space-y-4">
              {versions.map((version: any) => (
                <ArtReview key={version.id} token={token} version={version} onReviewed={load} />
              ))}
              {!versions.length && (
                <p className="rounded-xl bg-muted/50 p-5 text-center text-sm text-muted-foreground">
                  A equipe ainda não enviou uma prévia.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </PublicShell>
  );
}

function ArtReview({
  token,
  version,
  onReviewed,
}: {
  token: string;
  version: any;
  onReviewed: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [marker, setMarker] = useState<{ x: number; y: number } | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    supabase.storage
      .from("briefing-files")
      .createSignedUrl(version.storage_path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl || null));
  }, [version.storage_path]);
  async function review(decision: "aprovado" | "alteracao_solicitada") {
    if (decision === "alteracao_solicitada" && !comment.trim())
      return toast.error("Explique o que precisa ser alterado.");
    const { error } = await (supabase as any).rpc("review_public_art", {
      _token: token,
      _version_id: version.id,
      _decision: decision,
      _comment: comment || null,
      _marker_x: marker?.x || null,
      _marker_y: marker?.y || null,
    });
    if (error) return toast.error(error.message);
    toast.success(decision === "aprovado" ? "Arte aprovada!" : "Alteração enviada à equipe.");
    onReviewed();
  }
  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="flex items-center justify-between bg-muted/50 px-4 py-3">
        <strong>Arte V{version.version_number}</strong>
        <span className="text-xs text-muted-foreground">{version.status.replaceAll("_", " ")}</span>
      </div>
      {url && isPreviewable(version.mime_type, version.file_name) ? (
        <div
          ref={imageRef}
          className="relative cursor-crosshair bg-slate-100"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setMarker({
              x: ((event.clientX - rect.left) / rect.width) * 100,
              y: ((event.clientY - rect.top) / rect.height) * 100,
            });
          }}
        >
          <img
            src={url}
            alt={`Arte V${version.version_number}`}
            className="max-h-96 w-full object-contain"
          />
          {marker && (
            <span
              className="absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-destructive text-xs font-bold text-white shadow"
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            >
              1
            </span>
          )}
        </div>
      ) : (
        url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 p-8 text-sm text-primary"
          >
            <Download className="h-4 w-4" />
            Abrir arquivo
          </a>
        )
      )}
      <div className="space-y-3 p-4">
        {version.notes && <p className="text-sm text-muted-foreground">{version.notes}</p>}
        <Textarea
          placeholder="Comentário ou alteração desejada"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <p className="text-[10px] text-muted-foreground">
          Em imagens, clique no ponto que deseja marcar antes de comentar.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => review("alteracao_solicitada")}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Alterar
          </Button>
          <Button onClick={() => review("aprovado")}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Aprovar
          </Button>
        </div>
      </div>
    </div>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef4f1] via-white to-[#f7efcf] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex justify-center">
          <img
            src="/brand/alcateia-logo.png"
            alt="Alcateia's"
            className="h-28 w-auto object-contain"
          />
        </div>
        {children}
      </div>
    </div>
  );
}
