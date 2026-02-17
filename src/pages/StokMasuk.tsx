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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Search, Filter, X, Package, CalendarDays, RotateCcw } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Periode = "harian" | "mingguan" | "bulanan";

function getDateRange(periode: Periode): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  let start: Date;
  if (periode === "harian") { start = new Date(now); }
  else if (periode === "mingguan") { start = new Date(now); start.setDate(start.getDate() - 7); }
  else { start = new Date(now.getFullYear(), now.getMonth(), 1); }
  return { start: start.toISOString().split("T")[0], end };
}

export default function StokMasuk() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [barangList, setBarangList] = useState<any[]>([]);
  const [supplierList, setSupplierList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ barang_id: "", supplier_id: "", jumlah: "", tanggal: new Date().toISOString().split("T")[0], keterangan: "" });
  const [confirmReset, setConfirmReset] = useState(false);

  // Period & date filters
  const [periode, setPeriode] = useState<Periode>("harian");
  const [dateStart, setDateStart] = useState(getDateRange("harian").start);
  const [dateEnd, setDateEnd] = useState(getDateRange("harian").end);

  // Table filters
  const [search, setSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("all");

  // When periode changes, update date range
  useEffect(() => {
    const range = getDateRange(periode);
    setDateStart(range.start);
    setDateEnd(range.end);
  }, [periode]);

  const fetchData = async () => {
    const [smRes, brgRes, supRes] = await Promise.all([
      supabase.from("stok_masuk").select("*, barang(kode, nama, harga_beli), supplier(nama)")
        .gte("tanggal", dateStart).lte("tanggal", dateEnd)
        .order("created_at", { ascending: false }),
      supabase.from("barang").select("id, kode, nama").order("nama"),
      supabase.from("supplier").select("id, nama").order("nama"),
    ]);
    setData(smRes.data ?? []);
    setBarangList(brgRes.data ?? []);
    setSupplierList(supRes.data ?? []);
  };
  useEffect(() => { fetchData(); }, [dateStart, dateEnd]);

  // Table filtered data
  const filteredData = data.filter(s => {
    const matchSearch = !search ||
      s.barang?.nama?.toLowerCase().includes(search.toLowerCase()) ||
      s.barang?.kode?.toLowerCase().includes(search.toLowerCase()) ||
      s.keterangan?.toLowerCase().includes(search.toLowerCase());
    const matchSupplier = filterSupplier === "all" || s.supplier_id === filterSupplier;
    return matchSearch && matchSupplier;
  });

  // Summary calculations
  const totalTransaksi = filteredData.length;
  const totalQty = filteredData.reduce((s, d) => s + d.jumlah, 0);
  const totalNilai = filteredData.reduce((s, d) => {
    return s + (Number(d.barang?.harga_beli) || 0) * d.jumlah;
  }, 0);

  const handleSave = async () => {
    if (!form.barang_id || !form.jumlah) { toast.error("Barang dan jumlah wajib diisi"); return; }
    const jumlah = parseInt(form.jumlah);
    if (jumlah <= 0) { toast.error("Jumlah harus lebih dari 0"); return; }
    const { error } = await supabase.from("stok_masuk").insert({
      barang_id: form.barang_id,
      supplier_id: form.supplier_id || null,
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

  const hasFilters = search || filterSupplier !== "all";
  const clearFilters = () => { setSearch(""); setFilterSupplier("all"); };

  const periodeLabel = periode === "harian" ? "Hari Ini" : periode === "mingguan" ? "7 Hari Terakhir" : "Bulan Ini";

  const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  const handleResetData = async () => {
    setConfirmReset(false);
    const { error } = await supabase
      .from("stok_masuk")
      .delete()
      .gte("tanggal", dateStart)
      .lte("tanggal", dateEnd);
    if (error) { toast.error(error.message); return; }
    await logAktivitas("Reset Stok Masuk", `Data stok masuk periode ${dateStart} s/d ${dateEnd} dihapus (${filteredData.length} record)`);
    toast.success(`Data stok masuk periode ${dateStart} s/d ${dateEnd} berhasil direset`);
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">Stok Masuk</h1>
        <div className="flex items-center gap-2">
          {data.length > 0 && (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-4 w-4 mr-1" />Reset Data
            </Button>
          )}
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
        </div>
      </div>

      {/* Period Tabs + Date Range */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={periode} onValueChange={v => setPeriode(v as Periode)} className="w-auto">
          <TabsList>
            <TabsTrigger value="harian">Harian</TabsTrigger>
            <TabsTrigger value="mingguan">Mingguan</TabsTrigger>
            <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="w-[140px] h-9" />
          <span className="text-muted-foreground">s/d</span>
          <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="w-[140px] h-9" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-lg font-bold">{totalTransaksi}</p>
              <p className="text-xs text-muted-foreground">Total Transaksi</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-lg font-bold text-green-600">+{totalQty}</p>
              <p className="text-xs text-muted-foreground">Qty Masuk</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-lg font-bold">{fmt(totalNilai)}</p>
              <p className="text-xs text-muted-foreground">Total Nilai Beli</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari barang/kode..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Supplier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Supplier</SelectItem>
            {supplierList.map(s => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="h-3.5 w-3.5 mr-1" />Reset
          </Button>
        )}
      </div>

      {hasFilters && (
        <p className="text-xs text-muted-foreground">{filteredData.length} dari {data.length} transaksi</p>
      )}

      {/* Table */}
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
              <TableHead className="text-right">Nilai</TableHead>
              <TableHead>Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Tidak ada data stok masuk pada periode ini</TableCell></TableRow>
            ) : (
              <>
                {filteredData.map((s, i) => {
                  const nilai = (Number(s.barang?.harga_beli) || 0) * s.jumlah;
                  return (
                    <TableRow key={s.id} className="hover:bg-muted/50">
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="whitespace-nowrap">{new Date(s.tanggal).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell className="font-mono text-xs">{s.barang?.kode}</TableCell>
                      <TableCell>{s.barang?.nama}</TableCell>
                      <TableCell className="text-sm">{s.supplier?.nama ?? "-"}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">+{s.jumlah}</TableCell>
                      <TableCell className="text-right text-sm">
                        {nilai > 0 ? (
                          <Badge variant="outline" className="font-mono text-xs">{fmt(nilai)}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{s.keterangan ?? "-"}</TableCell>
                    </TableRow>
                  );
                })}
                {/* Total Row */}
                <TableRow className="bg-muted/50 font-bold border-t-2">
                  <TableCell colSpan={5} className="text-right">TOTAL ({periodeLabel})</TableCell>
                  <TableCell className="text-right text-green-600">+{totalQty}</TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-blue-600 font-mono text-xs">{fmt(totalNilai)}</Badge>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* DIALOG TAMBAH STOK MASUK */}
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

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset Data Stok Masuk"
        description={`Apakah Anda yakin ingin menghapus SEMUA data stok masuk periode ${dateStart} s/d ${dateEnd}? (${data.length} record) Tindakan ini tidak dapat dibatalkan.`}
        variant="danger"
        confirmLabel="Ya, Reset Semua"
        onConfirm={handleResetData}
      />
    </div>
  );
}
