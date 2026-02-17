import { useEffect, useState, useRef } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { Plus, Search, Filter, X, Check, ChevronsUpDown, Eye, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export default function StokKeluar() {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [barangList, setBarangList] = useState<any[]>([]);
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [subkategoriList, setSubkategoriList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ barang_id: "", jumlah: "", tanggal: new Date().toISOString().split("T")[0], keterangan: "" });

  // Table filters
  const [search, setSearch] = useState("");
  const [filterKat, setFilterKat] = useState("all");
  const [filterSub, setFilterSub] = useState("all");

  // Combobox state
  const [comboOpen, setComboOpen] = useState(false);
  const [dialogKat, setDialogKat] = useState("all");
  const [dialogSub, setDialogSub] = useState("all");

  // Bon detail dialog
  const [bonOpen, setBonOpen] = useState(false);
  const [bonDetail, setBonDetail] = useState<any>(null);
  const bonRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    const [skRes, brgRes, katRes, subRes] = await Promise.all([
      supabase.from("stok_keluar").select("*, barang(kode, nama, stok, kategori_id, subkategori_id)").order("created_at", { ascending: false }),
      supabase.from("barang").select("id, kode, nama, stok, kategori_id, subkategori_id").order("nama"),
      supabase.from("kategori").select("*").order("nama"),
      supabase.from("subkategori").select("*").order("nama"),
    ]);
    setData(skRes.data ?? []);
    setBarangList(brgRes.data ?? []);
    setKategoriList(katRes.data ?? []);
    setSubkategoriList(subRes.data ?? []);
  };
  useEffect(() => { fetchData(); }, []);

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

  // Dialog barang filter by kategori/sub
  const filteredBarangDialog = barangList.filter(b => {
    const matchKat = dialogKat === "all" || b.kategori_id === dialogKat;
    const matchSub = dialogSub === "all" || b.subkategori_id === dialogSub;
    return matchKat && matchSub;
  });

  const filteredSubForDialog = dialogKat === "all"
    ? subkategoriList
    : subkategoriList.filter(s => s.kategori_id === dialogKat);

  const selectedBarang = barangList.find(b => b.id === form.barang_id);

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

  const viewBon = async (nomorBon: string) => {
    const bonCode = nomorBon.replace("Penjualan: ", "");
    const { data: penjualan } = await supabase.from("penjualan").select("*").eq("nomor_bon", bonCode).single();
    if (!penjualan) { toast.error("Bon tidak ditemukan"); return; }
    const { data: items } = await supabase.from("penjualan_item").select("*, barang(kode, nama)").eq("penjualan_id", penjualan.id);
    setBonDetail({
      nomor_bon: penjualan.nomor_bon,
      tanggal: new Date(penjualan.tanggal),
      pembeli: penjualan.pembeli,
      items: (items ?? []).map((it: any) => ({
        nama: it.barang?.nama ?? "-",
        jumlah: it.jumlah,
        harga_jual: Number(it.harga_jual),
        subtotal: Number(it.subtotal),
      })),
      total: Number(penjualan.total),
      bayar: Number(penjualan.bayar),
      kembali: Number(penjualan.kembali),
    });
    setBonOpen(true);
  };

  const handlePrintBon = () => {
    const content = bonRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Bon - ${bonDetail?.nomor_bon}</title><style>body{margin:0;padding:10px;font-family:'Courier New',monospace;font-size:12px;}@media print{body{margin:0;}}</style></head><body>${content.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Stok Keluar</h1>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
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
              <TableHead>Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>
            ) : filteredData.map((s, i) => (
              <TableRow key={s.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="whitespace-nowrap">{new Date(s.tanggal).toLocaleDateString("id-ID")}</TableCell>
                <TableCell className="font-mono text-xs">{s.barang?.kode}</TableCell>
                <TableCell>{s.barang?.nama}</TableCell>
                <TableCell className="text-right font-medium text-destructive">-{s.jumlah}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {s.keterangan?.startsWith("Penjualan: ") ? (
                    <button
                      className="text-primary hover:underline cursor-pointer flex items-center gap-1"
                      onClick={() => viewBon(s.keterangan)}
                    >
                      <Eye className="h-3 w-3" />
                      {s.keterangan}
                    </button>
                  ) : (
                    s.keterangan ?? "-"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Tambah Stok Keluar</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">

            {/* Category filters */}
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

            {/* Searchable Combobox for Barang */}
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

      {/* BON DETAIL DIALOG */}
      <Dialog open={bonOpen} onOpenChange={setBonOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Detail Bon Penjualan</DialogTitle></DialogHeader>
          <div ref={bonRef} style={{ fontFamily: "'Courier New', monospace", fontSize: "12px", lineHeight: "1.4", color: "#000", background: "#fff", padding: "16px" }}>
            <div style={{ textAlign: "center", borderBottom: "2px solid #000", paddingBottom: "8px", marginBottom: "8px" }}>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>GIA MULYA</div>
              <div style={{ fontSize: "10px" }}>KONSTRUKSI & PEMASANGAN</div>
              <div style={{ fontSize: "10px" }}>BENGKEL LAS · TOKO BANGUNAN</div>
              <div style={{ fontSize: "9px", marginTop: "4px" }}>MENERIMA PESANAN:</div>
              <div style={{ fontSize: "9px" }}>PAGAR - TERALIS - STAINLESS - KANOPI - GALVALUM - PLAT BAJA</div>
              <div style={{ fontSize: "9px" }}>ALAT-ALAT LISTRIK</div>
              <div style={{ fontSize: "10px", marginTop: "4px", fontWeight: "bold" }}>JL. NAGRAK CISAAT NO. 45 SUKABUMI</div>
              <div style={{ fontSize: "10px", fontWeight: "bold" }}>HP/WA: 085217147864 / 082111648392</div>
            </div>
            <div style={{ marginBottom: "8px" }}>
              <div>Nota No. : {bonDetail?.nomor_bon}</div>
              <div>Tanggal : {bonDetail?.tanggal ? new Date(bonDetail.tanggal).toLocaleDateString("id-ID") : "-"}</div>
              {bonDetail?.pembeli && <div>Kepada Yth. : {bonDetail.pembeli}</div>}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
                  <th style={{ textAlign: "left", padding: "4px 2px" }}>Banyak</th>
                  <th style={{ textAlign: "left", padding: "4px 2px" }}>Nama Barang</th>
                  <th style={{ textAlign: "right", padding: "4px 2px" }}>Harga</th>
                  <th style={{ textAlign: "right", padding: "4px 2px" }}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {bonDetail?.items?.map((item: any, i: number) => (
                  <tr key={i} style={{ borderBottom: "1px dotted #ccc" }}>
                    <td style={{ padding: "3px 2px" }}>{item.jumlah}</td>
                    <td style={{ padding: "3px 2px" }}>{item.nama}</td>
                    <td style={{ textAlign: "right", padding: "3px 2px" }}>{item.harga_jual.toLocaleString("id-ID")}</td>
                    <td style={{ textAlign: "right", padding: "3px 2px" }}>{item.subtotal.toLocaleString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: "2px solid #000", marginTop: "4px", paddingTop: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "13px" }}>
                <span>Jumlah Rp.</span><span>{bonDetail?.total?.toLocaleString("id-ID")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Bayar</span><span>{bonDetail?.bayar?.toLocaleString("id-ID")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                <span>Kembali</span><span>{bonDetail?.kembali?.toLocaleString("id-ID")}</span>
              </div>
            </div>
            <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
              <div style={{ textAlign: "center" }}><div>Tanda terima,</div><div style={{ marginTop: "40px" }}>____________</div></div>
              <div style={{ textAlign: "center" }}><div>Hormat kami,</div><div style={{ marginTop: "40px" }}>____________</div></div>
            </div>
            <div style={{ textAlign: "center", marginTop: "12px", fontSize: "9px", fontStyle: "italic", borderTop: "1px solid #000", paddingTop: "4px" }}>
              Perhatian !!! Barang yang sudah dibeli tidak dapat ditukar / dikembalikan
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBonOpen(false)}>Tutup</Button>
            <Button onClick={handlePrintBon}><Printer className="h-4 w-4 mr-2" />Cetak Bon</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
