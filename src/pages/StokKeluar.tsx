import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Search, Filter, X, Check, ChevronsUpDown, Eye, Printer, TrendingUp, Package, DollarSign, CalendarDays, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

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

export default function StokKeluar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [barangList, setBarangList] = useState<any[]>([]);
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [subkategoriList, setSubkategoriList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ barang_id: "", jumlah: "", tanggal: new Date().toISOString().split("T")[0], keterangan: "" });
  const [confirmReset, setConfirmReset] = useState(false);

  // Period & date filters
  const [periode, setPeriode] = useState<Periode>("harian");
  const [dateStart, setDateStart] = useState(getDateRange("harian").start);
  const [dateEnd, setDateEnd] = useState(getDateRange("harian").end);

  // Table filters
  const [search, setSearch] = useState("");
  const [filterKat, setFilterKat] = useState("all");
  const [filterSub, setFilterSub] = useState("all");

  // Combobox state
  const [comboOpen, setComboOpen] = useState(false);
  const [dialogKat, setDialogKat] = useState("all");
  const [dialogSub, setDialogSub] = useState("all");

  // When periode changes, update date range
  useEffect(() => {
    const range = getDateRange(periode);
    setDateStart(range.start);
    setDateEnd(range.end);
  }, [periode]);

  const fetchData = async () => {
    const [skRes, brgRes, katRes, subRes] = await Promise.all([
      supabase.from("stok_keluar").select("*, barang(kode, nama, stok, harga_beli, harga_jual, kategori_id, subkategori_id)")
        .gte("tanggal", dateStart).lte("tanggal", dateEnd)
        .order("created_at", { ascending: false }),
      supabase.from("barang").select("id, kode, nama, stok, harga_beli, harga_jual, kategori_id, subkategori_id").order("nama"),
      supabase.from("kategori").select("*").order("nama"),
      supabase.from("subkategori").select("*").order("nama"),
    ]);
    setData(skRes.data ?? []);
    setBarangList(brgRes.data ?? []);
    setKategoriList(katRes.data ?? []);
    setSubkategoriList(subRes.data ?? []);
  };
  useEffect(() => { fetchData(); }, [dateStart, dateEnd]);

  // Table filtered data
  const filteredData = data.filter(s => {
    const matchSearch = !search ||
      s.barang?.nama?.toLowerCase().includes(search.toLowerCase()) ||
      s.barang?.kode?.toLowerCase().includes(search.toLowerCase()) ||
      s.keterangan?.toLowerCase().includes(search.toLowerCase());
    const matchKat = filterKat === "all" || s.barang?.kategori_id === filterKat;
    const matchSub = filterSub === "all" || s.barang?.subkategori_id === filterSub;
    return matchSearch && matchKat && matchSub;
  });

  const filteredSubForTable = filterKat === "all"
    ? subkategoriList
    : subkategoriList.filter(s => s.kategori_id === filterKat);

  // Dialog barang filter
  const filteredBarangDialog = barangList.filter(b => {
    const matchKat = dialogKat === "all" || b.kategori_id === dialogKat;
    const matchSub = dialogSub === "all" || b.subkategori_id === dialogSub;
    return matchKat && matchSub;
  });

  const filteredSubForDialog = dialogKat === "all"
    ? subkategoriList
    : subkategoriList.filter(s => s.kategori_id === dialogKat);

  const selectedBarang = barangList.find(b => b.id === form.barang_id);

  // Summary calculations
  const totalTransaksi = filteredData.length;
  const totalQty = filteredData.reduce((s, d) => s + d.jumlah, 0);
  const totalKeuntungan = filteredData.reduce((s, d) => {
    const beli = Number(d.barang?.harga_beli) || 0;
    const jual = Number(d.barang?.harga_jual) || 0;
    return s + (jual - beli) * d.jumlah;
  }, 0);
  const totalPendapatan = filteredData.reduce((s, d) => {
    return s + (Number(d.barang?.harga_jual) || 0) * d.jumlah;
  }, 0);

  const handleSave = async () => {
    if (!form.barang_id || !form.jumlah) { toast.error("Barang dan jumlah wajib diisi"); return; }
    const jumlah = parseInt(form.jumlah);
    if (jumlah <= 0) { toast.error("Jumlah harus lebih dari 0"); return; }
    const brg = barangList.find(b => b.id === form.barang_id);
    if (brg && jumlah > brg.stok) { toast.error(`Stok tidak cukup. Stok tersedia: ${brg.stok}`); return; }
    const { error } = await supabase.from("stok_keluar").insert({
      barang_id: form.barang_id,
      jumlah,
      tanggal: form.tanggal,
      keterangan: form.keterangan || null,
      user_id: user!.id,
    });
    if (error) { toast.error(error.message); return; }
    await logAktivitas("Stok Keluar", `${brg?.nama ?? ""} -${jumlah}`);
    toast.success("Stok keluar berhasil dicatat");
    setOpen(false);
    setForm({ barang_id: "", jumlah: "", tanggal: new Date().toISOString().split("T")[0], keterangan: "" });
    setDialogKat("all"); setDialogSub("all");
    fetchData();
  };

  const hasFilters = search || filterKat !== "all" || filterSub !== "all";
  const clearFilters = () => { setSearch(""); setFilterKat("all"); setFilterSub("all"); };

  const viewDetail = (id: string) => {
    navigate(`/stok-keluar/${id}`);
  };

  const periodeLabel = periode === "harian" ? "Hari Ini" : periode === "mingguan" ? "7 Hari Terakhir" : "Bulan Ini";

  const handleResetData = async () => {
    setConfirmReset(false);
    const { error } = await supabase
      .from("stok_keluar")
      .delete()
      .gte("tanggal", dateStart)
      .lte("tanggal", dateEnd);
    if (error) { toast.error(error.message); return; }
    await logAktivitas("Reset Stok Keluar", `Data stok keluar periode ${dateStart} s/d ${dateEnd} dihapus (${data.length} record)`);
    toast.success(`Data stok keluar periode ${dateStart} s/d ${dateEnd} berhasil direset`);
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">Stok Keluar</h1>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <Package className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-lg font-bold">{totalQty}</p>
              <p className="text-xs text-muted-foreground">Qty Keluar</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-lg font-bold">{fmt(totalPendapatan)}</p>
              <p className="text-xs text-muted-foreground">Total Pendapatan</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-lg font-bold text-green-700 dark:text-green-400">{fmt(totalKeuntungan)}</p>
              <p className="text-xs text-muted-foreground">Total Keuntungan</p>
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
        <Select value={filterKat} onValueChange={v => { setFilterKat(v); setFilterSub("all"); }}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {kategoriList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSub} onValueChange={setFilterSub}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Subkategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Sub</SelectItem>
            {filteredSubForTable.map(s => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}
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
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead className="text-right">Keuntungan</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="w-12 text-center">Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Tidak ada data stok keluar pada periode ini</TableCell></TableRow>
            ) : (
              <>
                {filteredData.map((s, i) => {
                  const beli = Number(s.barang?.harga_beli) || 0;
                  const jual = Number(s.barang?.harga_jual) || 0;
                  const profit = (jual - beli) * s.jumlah;
                  return (
                    <TableRow key={s.id} className="hover:bg-muted/50">
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="whitespace-nowrap">{new Date(s.tanggal).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell className="font-mono text-xs">{s.barang?.kode}</TableCell>
                      <TableCell>{s.barang?.nama}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">-{s.jumlah}</TableCell>
                      <TableCell className="text-right">
                        {profit > 0 ? (
                          <Badge variant="outline" className="text-green-600 border-green-600 font-mono text-xs">+{fmt(profit)}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {s.keterangan?.startsWith("Penjualan: ") ? (
                          <button
                            className="text-primary hover:underline cursor-pointer flex items-center gap-1"
                            onClick={() => viewDetail(s.id)}
                          >
                            <Eye className="h-3 w-3" />
                            {s.keterangan}
                          </button>
                        ) : (
                          s.keterangan ?? "-"
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => viewDetail(s.id)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Total Row */}
                <TableRow className="bg-muted/50 font-bold border-t-2">
                  <TableCell colSpan={4} className="text-right">TOTAL ({periodeLabel})</TableCell>
                  <TableCell className="text-right text-destructive">-{totalQty}</TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-green-600 font-mono text-xs">{fmt(totalKeuntungan)}</Badge>
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* DIALOG TAMBAH STOK KELUAR */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Tambah Stok Keluar</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Kategori</Label>
                <Select value={dialogKat} onValueChange={v => { setDialogKat(v); setDialogSub("all"); setForm(p => ({ ...p, barang_id: "" })); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Semua" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {kategoriList.map(k => <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Subkategori</Label>
                <Select value={dialogSub} onValueChange={v => { setDialogSub(v); setForm(p => ({ ...p, barang_id: "" })); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Semua" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Sub</SelectItem>
                    {filteredSubForDialog.map(s => <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="col-span-2">
              <Label>Barang</Label>
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={comboOpen} className="w-full justify-between font-normal h-10">
                    {selectedBarang ? (
                      <span className="truncate">[{selectedBarang.kode}] {selectedBarang.nama} <span className="text-muted-foreground">(stok: {selectedBarang.stok})</span></span>
                    ) : (
                      <span className="text-muted-foreground">Ketik untuk cari barang...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari nama/kode barang..." />
                    <CommandList>
                      <CommandEmpty>Barang tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {filteredBarangDialog.map(b => (
                          <CommandItem
                            key={b.id}
                            value={`${b.kode} ${b.nama}`}
                            onSelect={() => {
                              setForm(p => ({ ...p, barang_id: b.id }));
                              setComboOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", form.barang_id === b.id ? "opacity-100" : "opacity-0")} />
                            <span className="font-mono text-xs mr-2 text-muted-foreground">[{b.kode}]</span>
                            <span className="flex-1 truncate">{b.nama}</span>
                            <span className="text-xs text-muted-foreground ml-2">stok: {b.stok}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div><Label>Jumlah</Label><Input type="number" value={form.jumlah} onChange={e => setForm(p => ({ ...p, jumlah: e.target.value }))} /></div>
            <div><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Keterangan</Label><Textarea value={form.keterangan} onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} rows={1} /></div>
          </div>
          <DialogFooter><Button onClick={handleSave}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset Data Stok Keluar"
        description={`Apakah Anda yakin ingin menghapus SEMUA data stok keluar periode ${dateStart} s/d ${dateEnd}? (${data.length} record) Tindakan ini tidak dapat dibatalkan.`}
        variant="danger"
        confirmLabel="Ya, Reset Semua"
        onConfirm={handleResetData}
      />
    </div>
  );
}
