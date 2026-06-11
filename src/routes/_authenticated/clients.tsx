import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clients")({ component: ClientsPage });

type ClientRow = { id: string; name: string; document: string | null; whatsapp: string | null; email: string | null; address: string | null; district: string | null; city: string | null; notes: string | null; created_at: string };

function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<ClientRow> | null>(null);
  const [open, setOpen] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ["clients", search],
    queryFn: async () => {
      let q = supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as ClientRow[];
    },
  });

  async function save() {
    if (!editing?.name) return toast.error("Nome obrigatório");
    const payload = {
      name: editing.name,
      document: editing.document || null,
      whatsapp: editing.whatsapp || null,
      email: editing.email || null,
      address: editing.address || null,
      district: editing.district || null,
      city: editing.city || null,
      notes: editing.notes || null,
    };
    const res = editing.id
      ? await supabase.from("clients").update(payload).eq("id", editing.id)
      : await supabase.from("clients").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Cliente salvo");
    setOpen(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["clients"] });
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Excluir cliente "${name}"?`)) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return toast.error(error.message + " (clientes com OS vinculadas não podem ser excluídos)");
    toast.success("Excluído");
    qc.invalidateQueries({ queryKey: ["clients"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar cliente" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({})} className="bg-primary"><Plus className="w-4 h-4 mr-1" /> Novo cliente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing?.id ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><Label>Nome / Empresa *</Label><Input value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>CPF / CNPJ</Label><Input value={editing?.document ?? ""} onChange={(e) => setEditing({ ...editing, document: e.target.value })} /></div>
              <div><Label>WhatsApp</Label><Input value={editing?.whatsapp ?? ""} onChange={(e) => setEditing({ ...editing, whatsapp: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>E-mail</Label><Input value={editing?.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Endereço</Label><Input value={editing?.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
              <div><Label>Bairro</Label><Input value={editing?.district ?? ""} onChange={(e) => setEditing({ ...editing, district: e.target.value })} /></div>
              <div><Label>Cidade</Label><Input value={editing?.city ?? ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Observações</Label><Textarea value={editing?.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="text-left p-3">Nome</th>
                <th className="text-left p-3 hidden md:table-cell">WhatsApp</th>
                <th className="text-left p-3 hidden md:table-cell">Cidade</th>
                <th className="text-left p-3 hidden lg:table-cell">Cadastro</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {(clients ?? []).map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.name}<div className="text-xs text-muted-foreground md:hidden">{c.whatsapp}</div></td>
                  <td className="p-3 hidden md:table-cell">{c.whatsapp ?? "—"}</td>
                  <td className="p-3 hidden md:table-cell">{c.city ?? "—"}</td>
                  <td className="p-3 hidden lg:table-cell">{fmtDate(c.created_at)}</td>
                  <td className="p-3 flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id, c.name)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
              {!clients?.length && (<tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum cliente cadastrado</td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}