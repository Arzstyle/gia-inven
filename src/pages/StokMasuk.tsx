import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAktivitas } from "@/hooks/useLogAktivitas";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function StokMasuk() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [barangList, setBarangList] = useState<any[]>([]);
  const [supplierList, setSupplierList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ barang_id: "", supplier_id: "", jumlah: "", tanggal: new Date().toISOString().split("T")[0], keterangan: "" });

  const fetchData = async () => {
    const [smRes, brgRes, supRes] = await Promise.all([
      supabase.from("stok_masuk").select("*, barang(kode, nama), supplier(nama)").order("created_at", { ascending: false }),
      supabase.from("barang").select("id, kode, nama").order("nama"),
      supabase.from("supplier").select("id, nama").order("nama"),
    ]);
    setData(smRes.data ?? []);
    setBarangList(brgRes.data ?? []);
    setSupplierList(supRes.data ?? []);
  };
  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.barang_id || !form.jumlah) { toast.error("Barang dan jumlah wajib diisi"); return; }
    const jumlah = parseInt(form.jumlah);
    if (jumlah <= 0) { toast.error("Jumlah harus lebih dari 0"); return; }
    const { error } = await supabase.from("stok_masuk").insert({
      barang_id: form.barang_id,
      supplier_id: form.supplier_id || null, // Optional Supplier
      jumlah,
      tanggal: form.tanggal,
      keterangan: form.keterangan || null,
      user_id: user!.id,
    });
    if (error) { toast.error(error.message); return; }
    const brg = barangList.find(b => b.id === form.barang_id);
    await logAktivitas("Stok Masuk", `${brg?.nama ?? ""} +${jumlah}`);
    toast.success("Stok masuk berhasil dicatat");
    setOpen(false);
    setForm({ barang_id: "", supplier_id: "", jumlah: "", tanggal: new Date().toISOString().split("T")[0], keterangan: "" });
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Stok Masuk</h1>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
      </div>
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Barang</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>
            ) : data.map((s, i) => (
              <TableRow key={s.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="whitespace-nowrap">{new Date(s.tanggal).toLocaleDateString("id-ID")}</TableCell>
                <TableCell className="font-mono text-xs">{s.barang?.kode}</TableCell>
                <TableCell>{s.barang?.nama}</TableCell>
                <TableCell className="text-sm">{s.supplier?.nama ?? "-"}</TableCell>
                <TableCell className="text-right font-medium text-green-600">+{s.jumlah}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.keterangan ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Stok Masuk</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Barang</Label>
              <Select value={form.barang_id} onValueChange={v => setForm(p => ({ ...p, barang_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih barang" /></SelectTrigger>
                <SelectContent>{barangList.map(b => <SelectItem key={b.id} value={b.id}>[{b.kode}] {b.nama}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supplier</Label>
              <Select value={form.supplier_id} onValueChange={v => setForm(p => ({ ...p, supplier_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
                <SelectContent>{supplierList.map(s => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Jumlah</Label><Input type="number" value={form.jumlah} onChange={e => setForm(p => ({ ...p, jumlah: e.target.value }))} /></div>
            <div><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} /></div>
            <div><Label>Keterangan</Label><Textarea value={form.keterangan} onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} rows={1} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
