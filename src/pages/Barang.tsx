import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, TrendingUp } from "lucide-react";

const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export default function BarangPage() {
  const [data, setData] = useState<any[]>([]);
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [subkategoriList, setSubkategoriList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const formDefault = { kode: "", nama: "", harga_beli: "0", harga_jual: "0", kategori_id: "", subkategori_id: "", satuan: "pcs", stok_minimum: "0" };
  const [form, setForm] = useState(formDefault);

  const fetchData = async () => {
    const [brgRes, katRes, subRes] = await Promise.all([
      supabase.from("barang").select("*, kategori(nama), subkategori(nama)"),
      supabase.from("kategori").select("*").order("nama"),
      supabase.from("subkategori").select("*").order("nama"),
    ]);
    const sortedItems = (brgRes.data ?? []).sort((a, b) => {
      const subA = a.subkategori?.nama || "";
      const subB = b.subkategori?.nama || "";
      if (subA < subB) return -1;
      if (subA > subB) return 1;
      return a.kode.localeCompare(b.kode);
    });
    setData(sortedItems);
    setKategoriList(katRes.data ?? []);
    setSubkategoriList(subRes.data ?? []);
  };
  useEffect(() => { fetchData(); }, []);

  const filteredSub = subkategoriList.filter(s => s.kategori_id === form.kategori_id);
  const filtered = data.filter(d => d.nama.toLowerCase().includes(search.toLowerCase()) || d.kode.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => {
    setEditing(null);
    const autoCode = `BRG-${Math.floor(1000 + Math.random() * 9000)}`;
    setForm({ ...formDefault, kode: autoCode });
    setOpen(true);
  };

  const openEdit = (b: any) => {
    setEditing(b);
    setForm({
      kode: b.kode,
      nama: b.nama,
      harga_beli: String(b.harga_beli || 0),
      harga_jual: String(b.harga_jual || 0),
      kategori_id: b.kategori_id ?? "",
      subkategori_id: b.subkategori_id ?? "",
      satuan: b.satuan,
      stok_minimum: String(b.stok_minimum)
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.kode.trim() || !form.nama.trim()) { toast.error("Kode dan Nama wajib diisi"); return; }
    const payload = {
      kode: form.kode,
      nama: form.nama,
      harga_beli: parseInt(form.harga_beli) || 0,
      harga_jual: parseInt(form.harga_jual) || 0,
      kategori_id: form.kategori_id || null,
      subkategori_id: form.subkategori_id || null,
      satuan: form.satuan,
      stok_minimum: parseInt(form.stok_minimum) || 0,
    };

    if (editing) {
      const { error } = await supabase.from("barang").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Barang diperbarui");
    } else {
      const { error } = await supabase.from("barang").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Barang ditambahkan");
    }
    setOpen(false);
    fetchData();
  };

  const handleDelete = async (b: any) => {
    if (!confirm(`Hapus barang "${b.nama}"?`)) return;
    const { error } = await supabase.from("barang").delete().eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Barang dihapus");
    fetchData();
  };

  // Profit calculation for form preview
  const formBeli = parseInt(form.harga_beli) || 0;
  const formJual = parseInt(form.harga_jual) || 0;
  const formProfit = formJual - formBeli;
  const formMargin = formBeli > 0 ? Math.round((formProfit / formBeli) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Data Barang</h1>
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
      </div>
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari kode/nama..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Subkategori</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">H. Beli</TableHead>
              <TableHead className="text-right">H. Jual</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="text-right">Stok</TableHead>
              <TableHead className="w-24">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>
            ) : filtered.map((b, i) => {
              const beli = Number(b.harga_beli) || 0;
              const jual = Number(b.harga_jual) || 0;
              const profit = jual - beli;
              return (
                <TableRow key={b.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{b.kode}</TableCell>
                  <TableCell className="font-medium">{b.nama}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.subkategori?.nama ?? "-"}</TableCell>
                  <TableCell>{b.satuan}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{beli ? fmt(beli) : "-"}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{jual ? fmt(jual) : "-"}</TableCell>
                  <TableCell className="text-right">
                    {profit > 0 ? (
                      <Badge variant="outline" className="text-green-600 border-green-600 font-mono text-xs">
                        +{fmt(profit)}
                      </Badge>
                    ) : profit < 0 ? (
                      <Badge variant="destructive" className="font-mono text-xs">
                        {fmt(profit)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {b.stok <= b.stok_minimum ? <Badge variant="destructive">{b.stok}</Badge> : b.stok}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(b)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Barang</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Kode (Otomatis)</Label><Input value={form.kode} readOnly className="bg-muted" /></div>
            <div className="col-span-2"><Label>Nama Barang</Label><Input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} /></div>

            <div>
              <Label>Kategori</Label>
              <Select value={form.kategori_id} onValueChange={v => setForm(p => ({ ...p, kategori_id: v, subkategori_id: "" }))}>
                <SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                <SelectContent>{kategoriList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subkategori</Label>
              <Select value={form.subkategori_id} onValueChange={v => setForm(p => ({ ...p, subkategori_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih Sub" /></SelectTrigger>
                <SelectContent>{filteredSub.map(s => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <Label>Harga Beli (Rp)</Label>
              <Input type="number" value={form.harga_beli} onChange={e => setForm(p => ({ ...p, harga_beli: e.target.value }))} placeholder="Harga modal" />
            </div>
            <div>
              <Label>Harga Jual (Rp)</Label>
              <Input type="number" value={form.harga_jual} onChange={e => setForm(p => ({ ...p, harga_jual: e.target.value }))} placeholder="Harga jual" />
            </div>

            {/* Live profit preview */}
            {(formBeli > 0 || formJual > 0) && (
              <div className="col-span-2 rounded-lg bg-muted/50 p-3 flex items-center gap-3">
                <TrendingUp className={`h-5 w-5 ${formProfit >= 0 ? "text-green-600" : "text-red-500"}`} />
                <div className="text-sm">
                  <span className="text-muted-foreground">Keuntungan: </span>
                  <span className={`font-bold ${formProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {formProfit >= 0 ? "+" : ""}{fmt(formProfit)}
                  </span>
                  {formBeli > 0 && (
                    <span className="text-muted-foreground ml-2">({formMargin}%)</span>
                  )}
                </div>
              </div>
            )}

            <div><Label>Satuan</Label><Input value={form.satuan} onChange={e => setForm(p => ({ ...p, satuan: e.target.value }))} /></div>
            <div><Label>Stok Minimum</Label><Input type="number" value={form.stok_minimum} onChange={e => setForm(p => ({ ...p, stok_minimum: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>{editing ? "Simpan" : "Tambah"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
