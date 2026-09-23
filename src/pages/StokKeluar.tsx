/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from "react";
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
import { Plus, Search, Filter, X, Check, ChevronsUpDown, Eye, Printer, TrendingUp, Package, DollarSign, CalendarDays, RotateCcw, Folder, FolderOpen, FileText, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

type Periode = "harian" | "mingguan" | "bulanan" | "kustom";

function getDateRange(periode: Periode): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  let start: Date;
  if (periode === "harian" || periode === "kustom") { start = new Date(now); }
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

  // Arsip Nota state
  const [arsipData, setArsipData] = useState<any[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const [bonOpen, setBonOpen] = useState(false);
  const [savedBon, setSavedBon] = useState<any>(null);

  // When periode changes, update date range
  useEffect(() => {
    if (periode !== "kustom") {
      const range = getDateRange(periode);
      setDateStart(range.start);
      setDateEnd(range.end);
    }
  }, [periode]);

  const fetchData = async () => {
    const [skRes, brgRes, katRes, subRes, penRes] = await Promise.all([
      supabase.from("stok_keluar").select("*, barang(kode, nama, stok, harga_beli, harga_jual, kategori_id, subkategori_id)")
        .gte("tanggal", dateStart).lte("tanggal", dateEnd)
        .order("created_at", { ascending: false }),
      supabase.from("barang").select("id, kode, nama, stok, harga_beli, harga_jual, kategori_id, subkategori_id").order("nama"),
      supabase.from("kategori").select("*").order("nama"),
      supabase.from("subkategori").select("*").order("nama"),
      supabase.from("penjualan").select("*, penjualan_item(jumlah, harga_jual, subtotal, barang(kode, nama))").order("tanggal", { ascending: false })
    ]);
    setData(skRes.data ?? []);
    setBarangList(brgRes.data ?? []);
    setKategoriList(katRes.data ?? []);
    setSubkategoriList(subRes.data ?? []);
    setArsipData(penRes.data ?? []);
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

  // Arsip Tree Logic
  const toggleMonth = (monthKey: string) => setExpandedMonths(prev => prev.includes(monthKey) ? prev.filter(m => m !== monthKey) : [...prev, monthKey]);
  const toggleDate = (dateKey: string) => setExpandedDates(prev => prev.includes(dateKey) ? prev.filter(d => d !== dateKey) : [...prev, dateKey]);

  const groupedArsip = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = {};
    arsipData.forEach(p => {
        const d = new Date(p.tanggal);
        const monthKey = d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        const dateKey = d.toLocaleDateString('id-ID');
        if (!groups[monthKey]) groups[monthKey] = {};
        if (!groups[monthKey][dateKey]) groups[monthKey][dateKey] = [];
        groups[monthKey][dateKey].push(p);
    });
    return groups;
  }, [arsipData]);

  const handleMonthClick = (monthKey: string, firstItemDate: string) => {
      toggleMonth(monthKey);
      const d = new Date(firstItemDate);
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
      setPeriode("kustom");
      setDateStart(start);
      setDateEnd(end);
  };

  const handleDateClick = (dateKey: string, dateStr: string) => {
      toggleDate(dateKey);
      setPeriode("kustom");
      setDateStart(dateStr);
      setDateEnd(dateStr);
  };

  const viewArsipBon = (penjualan: any) => {
        setSavedBon({
            nomor_bon: penjualan.nomor_bon,
            tanggal: new Date(penjualan.tanggal),
            pembeli: penjualan.pembeli,
            items: (penjualan.penjualan_item ?? []).map((it: any) => ({
                jumlah: it.jumlah,
                nama: it.barang?.nama ?? "-",
                harga_jual: Number(it.harga_jual),
                subtotal: Number(it.subtotal),
            })),
            total: Number(penjualan.total),
            bayar: Number(penjualan.bayar),
            kembali: Number(penjualan.kembali),
        });
        setBonOpen(true);
  };

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
        <p className="text-xs text-muted-foreground mb-4">{filteredData.length} dari {data.length} transaksi</p>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="riwayat" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="riwayat">Riwayat Barang Keluar</TabsTrigger>
          <TabsTrigger value="arsip">Arsip Nota Penjualan</TabsTrigger>
        </TabsList>

        <TabsContent value="riwayat" className="m-0">
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
        </TabsContent>

        <TabsContent value="arsip" className="m-0">
            <Card>
              <CardContent className="p-4">
                  {Object.keys(groupedArsip).length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Belum ada arsip penjualan</p>
                  ) : (
                      <div className="space-y-2 font-sans">
                          {Object.entries(groupedArsip).map(([monthKey, dates]) => {
                              const isExpanded = expandedMonths.includes(monthKey);
                              const firstItemDate = Object.values(dates)[0][0].tanggal;
                              return (
                                  <div key={monthKey} className="border rounded-md overflow-hidden">
                                      <div 
                                          className="flex items-center gap-2 bg-muted/30 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                                          onClick={() => handleMonthClick(monthKey, firstItemDate)}
                                      >
                                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                          {isExpanded ? <FolderOpen className="h-5 w-5 text-blue-500" /> : <Folder className="h-5 w-5 text-blue-500" />}
                                          <span className="font-bold">{monthKey}</span>
                                          <Badge variant="secondary" className="ml-auto">{Object.values(dates).flat().length} Transaksi</Badge>
                                      </div>
                                      
                                      {isExpanded && (
                                          <div className="pl-6 py-2 pr-2 space-y-2 bg-white dark:bg-slate-950">
                                              {Object.entries(dates).map(([dateKey, items]) => {
                                                  const isDateExpanded = expandedDates.includes(dateKey);
                                                  const dateStr = items[0].tanggal;
                                                  return (
                                                      <div key={dateKey} className="border-l-2 border-slate-200 dark:border-slate-800 ml-3 pl-3">
                                                          <div 
                                                              className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted/50"
                                                              onClick={() => handleDateClick(dateKey, dateStr)}
                                                          >
                                                              {isDateExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                                              {isDateExpanded ? <FolderOpen className="h-4 w-4 text-orange-400" /> : <Folder className="h-4 w-4 text-orange-400" />}
                                                              <span className="font-semibold text-sm">{dateKey}</span>
                                                          </div>

                                                          {isDateExpanded && (
                                                              <div className="pl-6 py-1 space-y-1">
                                                                  {items.map(p => (
                                                                      <div 
                                                                          key={p.id} 
                                                                          className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer text-sm"
                                                                          onClick={() => viewArsipBon(p)}
                                                                      >
                                                                          <div className="flex items-center gap-2">
                                                                              <FileText className="h-4 w-4 text-slate-400" />
                                                                              <span>{p.pembeli ? `${p.pembeli}` : `Pembeli Umum`} <span className="text-muted-foreground text-xs ml-1">({p.nomor_bon})</span></span>
                                                                          </div>
                                                                          <span className="font-mono font-bold text-green-600 dark:text-green-400">{fmt(Number(p.total))}</span>
                                                                      </div>
                                                                  ))}
                                                              </div>
                                                          )}
                                                      </div>
                                                  )
                                              })}
                                          </div>
                                      )}
                                  </div>
                              )
                          })}
                      </div>
                  )}
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

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

      {/* BON PREVIEW DIALOG */}
      <Dialog open={bonOpen} onOpenChange={setBonOpen}>
          <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Bon Penjualan</DialogTitle></DialogHeader>

              {/* Printable Bon DOM */}
              <div className="bg-[#f9f9f9] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.1)] border border-slate-300 relative text-slate-900" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
                  {/* decorative jagged top edge */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 flex" style={{ backgroundImage: "linear-gradient(-45deg, transparent 33.33%, #f9f9f9 33.33%, #f9f9f9 66.66%, transparent 66.66%), linear-gradient(45deg, transparent 33.33%, #f9f9f9 33.33%, #f9f9f9 66.66%, transparent 66.66%)", backgroundSize: "8px 16px", backgroundPosition: "0 -8px", marginTop: "-6px" }}></div>
                  
                  {/* Header */}
                  <div className="text-center border-b-2 border-slate-800 pb-2 mb-2">
                      <div className="flex justify-center items-center gap-2 mb-1">
                          <img src="/logo-gia.jpeg" alt="Logo" className="h-10 w-auto mix-blend-multiply" onError={(e) => e.currentTarget.style.display = 'none'} />
                          <div className="font-extrabold text-2xl tracking-tight leading-none">GIA MULYA</div>
                      </div>
                      <div className="text-[10px] leading-[1.2] font-bold">KONSTRUKSI & PEMASANGAN</div>
                      <div className="text-[10px] leading-[1.2] font-bold">BENGKEL LAS · TOKO BANGUNAN</div>
                      <div className="text-[9px] leading-[1.2] mt-1 font-semibold">MENERIMA PESANAN:</div>
                      <div className="text-[9px] leading-[1.2] font-semibold">PAGAR - TERALIS - STAINLESS - KANOPI - GALVALUM - PLAT BAJA</div>
                      <div className="text-[9px] leading-[1.2] font-semibold mb-1">ALAT-ALAT LISTRIK</div>
                      <div className="text-[10px] leading-[1.2] font-bold italic">JL. NAGRAK CISAAT NO. 45 SUKABUMI</div>
                      <div className="text-[10px] leading-[1.2] font-bold italic">HP/WA: 085217147864 / 082111648392</div>
                  </div>

                  {/* Customer Info */}
                  <div className="flex justify-between items-end mb-2 text-xs font-bold">
                      <div>
                          <span>Nota No. {savedBon?.nomor_bon}</span>
                      </div>
                      <div className="text-right">
                          <div>Sukabumi, {savedBon?.tanggal ? new Date(savedBon.tanggal).toLocaleDateString("id-ID") : "-"}</div>
                          <div className="flex items-center justify-end mt-1">
                              <span className="mr-1">Kepada Yth.</span>
                              <span className="border-b border-dotted border-slate-600 w-32 text-center text-blue-900 inline-block">{savedBon?.pembeli || "................."}</span>
                          </div>
                      </div>
                  </div>

                  {/* Table */}
                  <table className="w-full text-xs border-collapse mb-1 border-t-2 border-b-2 border-slate-800">
                      <thead>
                          <tr className="border-b-2 border-slate-800">
                              <th className="py-1 px-1 border-r-2 border-slate-800 font-extrabold text-center w-12">Banyak<br/>nya</th>
                              <th className="py-1 px-1 border-r-2 border-slate-800 font-extrabold text-center">Nama Barang</th>
                              <th className="py-1 px-1 border-r-2 border-slate-800 font-extrabold text-center w-20">Harga<br/>Satuan</th>
                              <th className="py-1 px-1 font-extrabold text-center w-24">Jumlah</th>
                          </tr>
                      </thead>
                      <tbody>
                          {savedBon?.items?.map((item: any, i: number) => (
                              <tr key={i} className="border-b border-slate-400">
                                  <td className="py-1 px-1 border-r-2 border-slate-800 text-center font-bold">{item.jumlah}</td>
                                  <td className="py-1 px-1 border-r-2 border-slate-800 font-bold">{item.nama}</td>
                                  <td className="py-1 px-1 border-r-2 border-slate-800 text-right">{item.harga_jual.toLocaleString("id-ID")}</td>
                                  <td className="py-1 px-1 text-right font-bold">{item.subtotal.toLocaleString("id-ID")}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>

                  {/* Totals & Payments */}
                  <div className="flex">
                      <div className="w-12 border-r-2 border-slate-800"></div>
                      <div className="flex-1 flex flex-col pt-1">
                          <div className="flex justify-between items-center text-sm font-extrabold px-1 mb-1">
                              <span>Jumlah Rp.</span>
                              <span>{savedBon?.total?.toLocaleString("id-ID")}</span>
                          </div>
                          <div className="border-t-2 border-slate-800 w-full mb-1"></div>
                          <div className="flex justify-between items-center text-xs font-bold px-1 py-0.5">
                              <span>Bayar</span>
                              <span className="border-b border-dotted border-slate-500 w-24 text-right text-blue-700">{savedBon?.bayar?.toLocaleString("id-ID")}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-bold px-1 py-0.5 mb-1">
                              <span>Kembali</span>
                              <span className={savedBon?.kembali >= 0 ? "text-green-700" : "text-red-600"}>
                                  {savedBon?.kembali?.toLocaleString("id-ID")}
                              </span>
                          </div>
                      </div>
                  </div>
                  <div className="border-t-2 border-slate-800 w-full"></div>

                  {/* Footer Notes */}
                  <div className="flex justify-between text-xs font-bold mt-2 mb-4">
                      <div className="text-center pt-1">
                          <div>Tanda terima,</div>
                          <div className="mt-8 border-t border-slate-800 w-24 mx-auto"></div>
                      </div>
                      <div className="text-center text-[10px] max-w-[120px] pt-4 leading-tight">
                          <div>Norek:</div>
                          <div>BCA 377 1202 886</div>
                          <div>a.n. M. GIFFARY F.</div>
                      </div>
                      <div className="text-center pt-1">
                          <div>Hormat kami,</div>
                          <div className="mt-8 border-t border-slate-800 w-24 mx-auto"></div>
                      </div>
                  </div>
              </div>

              <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setBonOpen(false)}>Tutup</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
