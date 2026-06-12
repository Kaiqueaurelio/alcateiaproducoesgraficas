/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import JSZip from "jszip";
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  FileUp,
  Link2,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { BRIEFING_ACCEPT, isAllowedBriefingFile, safeFileName } from "@/lib/briefing";

export function BriefingCenter({ order, onChanged }: { order: any; onChanged: () => void }) {
  const db = supabase as any;
  const [link, setLink] = useState<any>(null);
  const [briefing, setBriefing] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [artFile, setArtFile] = useState<File | null>(null);
  const [artNotes, setArtNotes] = useState("");

  async function load() {
    const { data: linkData } = await db
      .from("briefing_links")
      .select("*")
      .eq("order_id", order.id)
      .eq("active", true)
      .maybeSingle();
    setLink(linkData || null);
    if (!linkData) {
      setBriefing(null);
      setFiles([]);
      setVersions([]);
      return;
    }
    const [{ data: brief }, { data: fileRows }, { data: versionRows }] = await Promise.all([
      db.from("client_briefings").select("*").eq("link_id", linkData.id).maybeSingle(),
      db
        .from("briefing_files")
        .select("*")
        .eq("link_id", linkData.id)
        .order("created_at", { ascending: false }),
      db
        .from("art_versions")
        .select("*, art_comments(*)")
        .eq("link_id", linkData.id)
        .order("version_number", { ascending: false }),
    ]);
    setBriefing(brief || null);
    setFiles(fileRows || []);
    setVersions(versionRows || []);
  }
  useEffect(() => {
    load();
  }, [order.id]);

  const publicUrl = link ? `${window.location.origin}/briefing/${link.token}` : "";

  async function createLink() {
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await db
      .from("briefing_links")
      .insert({ order_id: order.id, created_by: auth.user?.id })
      .select("*")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setLink(data);
    toast.success("Link de briefing criado.");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado para enviar ao cliente.");
  }

  async function uploadInternal(selected: FileList | null) {
    if (!link || !selected?.length) return;
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    for (const file of Array.from(selected)) {
      if (!isAllowedBriefingFile(file)) {
        setBusy(false);
        return toast.error(`${file.name} não é permitido ou excede 50 MB.`);
      }
      const path = `${link.token}/interno/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from("briefing-files").upload(path, file);
      if (error) {
        setBusy(false);
        return toast.error(error.message);
      }
      await db.from("briefing_files").insert({
        link_id: link.id,
        briefing_id: briefing?.id || null,
        order_id: order.id,
        category: "interno",
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_by: auth.user?.id,
        uploaded_by_client: false,
      });
    }
    setBusy(false);
    toast.success("Arquivos adicionados.");
    load();
  }

  async function downloadFile(file: any) {
    const { data, error } = await supabase.storage
      .from("briefing-files")
      .download(file.storage_path);
    if (error || !data) return toast.error(error?.message || "Arquivo indisponível");
    saveBlob(data, file.file_name);
  }

  async function openFile(file: any) {
    const { data, error } = await supabase.storage
      .from("briefing-files")
      .createSignedUrl(file.storage_path, 900);
    if (error || !data?.signedUrl) return toast.error(error?.message || "Arquivo indisponível");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function downloadZip() {
    if (!files.length) return toast.error("Não há arquivos para baixar.");
    setBusy(true);
    const zip = new JSZip();
    for (const file of files) {
      const { data } = await supabase.storage.from("briefing-files").download(file.storage_path);
      if (data) zip.file(file.file_name, data);
    }
    saveBlob(await zip.generateAsync({ type: "blob" }), `briefing-os-${order.number}.zip`);
    setBusy(false);
  }

  async function removeFile(file: any) {
    if (!confirm(`Excluir ${file.file_name}?`)) return;
    await supabase.storage.from("briefing-files").remove([file.storage_path]);
    const { error } = await db.from("briefing_files").delete().eq("id", file.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function sendArt() {
    if (!link) return toast.error("Crie o link do cliente primeiro.");
    if (!artFile) return toast.error("Selecione a prévia da arte.");
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const version = Math.max(0, ...versions.map((item) => Number(item.version_number))) + 1;
    const path = `${link.token}/artes/v${version}-${crypto.randomUUID()}-${safeFileName(artFile.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("briefing-files")
      .upload(path, artFile);
    if (uploadError) {
      setBusy(false);
      return toast.error(uploadError.message);
    }
    const { error } = await db.from("art_versions").insert({
      order_id: order.id,
      link_id: link.id,
      version_number: version,
      title: `Arte V${version}`,
      storage_path: path,
      file_name: artFile.name,
      mime_type: artFile.type,
      size_bytes: artFile.size,
      notes: artNotes || null,
      status: "aguardando_aprovacao",
      created_by: auth.user?.id,
    });
    if (!error)
      await supabase
        .from("orders")
        .update({
          production_status: "aguardando_aprovacao",
          current_activity: `Arte V${version} enviada para aprovação`,
          last_progress_at: new Date().toISOString(),
        })
        .eq("id", order.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setArtFile(null);
    setArtNotes("");
    toast.success(`Arte V${version} enviada para aprovação.`);
    load();
    onChanged();
  }

  return (
    <div className="space-y-5">
      <Card className="border-gold/40 bg-gradient-to-br from-primary/5 to-gold/10 p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-primary">
              <Link2 className="h-4 w-4" />
              Link do cliente
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Briefing, arquivos e aprovação sem login.
            </p>
          </div>
          {!link ? (
            <Button onClick={createLink} disabled={busy}>
              Criar link seguro
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir
                </a>
              </Button>
              {(briefing?.whatsapp || order.clients?.whatsapp) && (
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={`https://wa.me/55${String(briefing?.whatsapp || order.clients?.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Preencha o briefing e acompanhe a aprovação da sua arte: ${publicUrl}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Reenviar no WhatsApp
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
        {link && <Input readOnly value={publicUrl} className="mt-3 bg-background" />}
      </Card>

      {briefing ? (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-primary">Briefing do cliente</h3>
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Recebido</Badge>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Cliente" value={briefing.client_name} />
            <Info label="WhatsApp" value={briefing.whatsapp} />
            <Info label="Produto" value={briefing.product_type} />
            <Info label="Quantidade" value={briefing.quantity} />
            <Info
              label="Prazo desejado"
              value={
                briefing.desired_deadline
                  ? new Date(`${briefing.desired_deadline}T12:00:00`).toLocaleDateString("pt-BR")
                  : "Não informado"
              }
            />
            <Info
              label="Enviado em"
              value={new Date(briefing.submitted_at).toLocaleString("pt-BR")}
            />
          </div>
          {Object.keys(briefing.answers || {}).length > 0 && (
            <div className="mt-4 grid gap-2 rounded-xl bg-muted/40 p-3 sm:grid-cols-2">
              {Object.entries(briefing.answers).map(([key, value]) => (
                <Info key={key} label={key.replaceAll("_", " ")} value={String(value)} />
              ))}
            </div>
          )}
          {briefing.observations && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">Observações</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{briefing.observations}</p>
            </div>
          )}
        </Card>
      ) : (
        link && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Aguardando o cliente preencher o briefing.
          </Card>
        )
      )}

      {link && (
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-primary">Arquivos do pedido</h3>
              <p className="text-xs text-muted-foreground">
                Referências do cliente e arquivos internos.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={downloadZip}
                disabled={busy || !files.length}
              >
                <FileArchive className="mr-2 h-4 w-4" />
                Baixar ZIP
              </Button>
              <label>
                <Button size="sm" asChild>
                  <span>
                    <FileUp className="mr-2 h-4 w-4" />
                    Adicionar
                  </span>
                </Button>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept={BRIEFING_ACCEPT}
                  onChange={(e) => uploadInternal(e.target.files)}
                />
              </label>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between gap-2 rounded-xl border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {file.uploaded_by_client ? "Enviado pelo cliente" : "Adicionado pela equipe"}
                  </p>
                </div>
                <div className="flex">
                  <Button size="icon" variant="ghost" onClick={() => downloadFile(file)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openFile(file)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => removeFile(file)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {!files.length && (
              <p className="text-sm text-muted-foreground">Nenhum arquivo enviado.</p>
            )}
          </div>
        </Card>
      )}

      {link && (
        <Card className="p-4">
          <h3 className="font-semibold text-primary">Enviar arte para aprovação</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Cada envio cria uma nova versão automaticamente.
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <Label>Arquivo da arte</Label>
              <Input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.pdf,.svg"
                onChange={(e) => setArtFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label>Mensagem para o cliente</Label>
              <Textarea
                className="min-h-10"
                value={artNotes}
                onChange={(e) => setArtNotes(e.target.value)}
              />
            </div>
            <Button onClick={sendArt} disabled={busy}>
              <Send className="mr-2 h-4 w-4" />
              Enviar
            </Button>
          </div>
          <div className="mt-5 space-y-3">
            {versions.map((version) => (
              <VersionCard
                key={version.id}
                version={version}
                onDownload={() => downloadFile(version)}
              />
            ))}
            {!versions.length && (
              <p className="text-sm text-muted-foreground">Nenhuma versão criada.</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function VersionCard({ version, onDownload }: { version: any; onDownload: () => void }) {
  const status =
    version.status === "aprovado"
      ? "Aprovada"
      : version.status === "alteracao_solicitada"
        ? "Alteração solicitada"
        : "Aguardando aprovação";
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Arte V{version.version_number}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(version.created_at).toLocaleString("pt-BR")} · {version.file_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={version.status === "aprovado" ? "default" : "outline"}>
            {version.status === "aprovado" && <CheckCircle2 className="mr-1 h-3 w-3" />}
            {status}
          </Badge>
          <Button size="icon" variant="ghost" onClick={onDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {version.notes && <p className="mt-2 text-sm">{version.notes}</p>}
      {version.client_comment && (
        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Cliente:</strong> {version.client_comment}
        </div>
      )}
      {version.art_comments
        ?.filter((item: any) => item.author_type === "cliente")
        .map((comment: any) => (
          <p key={comment.id} className="mt-2 text-xs text-muted-foreground">
            Comentário: {comment.comment}
          </p>
        ))}
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium capitalize">{value || "Não informado"}</p>
    </div>
  );
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
