import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PRODUCTION_STATUS_LABEL } from "@/lib/format";
import { toast } from "sonner";

interface ProductionUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any | null;
  onSaved: () => void;
}

const STATUSES = Object.keys(PRODUCTION_STATUS_LABEL).filter(
  (status) => !["orcamento", "cancelado"].includes(status),
);

export function ProductionUpdateDialog({
  open,
  onOpenChange,
  order,
  onSaved,
}: ProductionUpdateDialogProps) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("arte_em_criacao");
  const [activity, setActivity] = useState("");
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open || !order) return;
    setStatus(order.production_status || "arte_em_criacao");
    setActivity(order.current_activity || order.title || "");
    setNote("");
    setProgress(Number(order.progress) || 0);
  }, [open, order]);

  async function save() {
    if (!order || !activity.trim()) return toast.error("Informe o que está sendo feito");
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSaving(false);
      return toast.error("Sessão expirada");
    }
    const { error } = await supabase.from("production_updates" as any).insert({
      order_id: order.id,
      author_id: auth.user.id,
      status,
      activity: activity.trim(),
      note: note.trim() || null,
      progress,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Atualização registrada");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Atualizar produção da OS #{order?.number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>O que está sendo feito agora?</Label>
            <Input
              value={activity}
              onChange={(event) => setActivity(event.target.value)}
              placeholder="Ex.: Criando a arte do post para Instagram"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Etapa</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {PRODUCTION_STATUS_LABEL[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Progresso (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(event) =>
                  setProgress(Math.min(100, Math.max(0, Number(event.target.value))))
                }
              />
            </div>
          </div>
          <div>
            <Label>Resumo da atualização</Label>
            <Textarea
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ex.: Primeira proposta concluída, aguardando revisão das cores."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Registrar atualização"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
