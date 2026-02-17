import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, ArrowDownToLine, ArrowUpFromLine, TrendingUp, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

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

function periodeLabel(p: Periode) {
  if (p === "harian") return "Hari Ini";
  if (p === "mingguan") return "7 Hari Terakhir";
  return "Bulan Ini";
}

const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

export default function Laporan() {
  const [tab, setTab] = useState("keuntungan");
  const [periode, setPeriode] = useState<Periode>("bulanan");
  const [dataMasuk, setDataMasuk] = useState<any[]>([]);
  const [dataKeluar, setDataKeluar] = useState<any[]>([]);
  const [barangMap, setBarangMap] = useState<Record<string, any>>({});

  useEffect(() => {
    const { start, end } = getDateRange(periode);
    const fetchAll = async () => {
      const [masukRes, keluarRes, brgRes] = await Promise.all([
        supabase.from("stok_masuk").select("*, barang(kode, nama, kategori(nama)), supplier(nama)")
          .gte("tanggal", start).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("stok_keluar").select("*, barang(kode, nama, harga_beli, harga_jual, kategori(nama))")
          .gte("tanggal", start).lte("tanggal", end).order("tanggal", { ascending: false }),
        supabase.from("barang").select("id, kode, nama, harga_beli, harga_jual"),
      ]);
      setDataMasuk(masukRes.data ?? []);
      setDataKeluar(keluarRes.data ?? []);
      const map: Record<string, any> = {};
      (brgRes.data ?? []).forEach(b => { map[b.id] = b; });
      setBarangMap(map);
    };
    fetchAll();
  }, [periode]);

  const totalMasuk = dataMasuk.reduce((s, d) => s + d.jumlah, 0);
  const totalKeluar = dataKeluar.reduce((s, d) => s + d.jumlah, 0);

  // Profit calculations per item from stok_keluar
  const profitByItem: Record<string, { nama: string; kode: string; qty: number; beli: number; jual: number; profit: number }> = {};
  dataKeluar.forEach(d => {
    const brg = d.barang || barangMap[d.barang_id];
    if (!brg) return;
    const beli = Number(brg.harga_beli) || 0;
    const jual = Number(brg.harga_jual) || 0;
    const key = d.barang_id;
    if (!profitByItem[key]) {
      profitByItem[key] = { nama: brg.nama, kode: brg.kode, qty: 0, beli: 0, jual: 0, profit: 0 };
    }
    profitByItem[key].qty += d.jumlah;
    profitByItem[key].beli += beli * d.jumlah;
    profitByItem[key].jual += jual * d.jumlah;
    profitByItem[key].profit += (jual - beli) * d.jumlah;
  });
  const profitList = Object.values(profitByItem).sort((a, b) => b.profit - a.profit);
  const totalProfit = profitList.reduce((s, p) => s + p.profit, 0);
  const totalRevenue = profitList.reduce((s, p) => s + p.jual, 0);
  const totalCost = profitList.reduce((s, p) => s + p.beli, 0);

  // Chart data: top 8 profit items
  const profitChartData = profitList.slice(0, 8).map(p => ({
    name: p.nama.length > 15 ? p.nama.substring(0, 15) + "..." : p.nama,
    keuntungan: p.profit,
    modal: p.beli,
    pendapatan: p.jual,
  }));

  // Pie chart: profit by category
  const profitByCat: Record<string, number> = {};
  dataKeluar.forEach(d => {
    const catName = d.barang?.kategori?.nama || "Lainnya";
    const brg = d.barang || barangMap[d.barang_id];
    if (!brg) return;
    const profit = ((Number(brg.harga_jual) || 0) - (Number(brg.harga_beli) || 0)) * d.jumlah;
    profitByCat[catName] = (profitByCat[catName] || 0) + profit;
  });
  const pieData = Object.entries(profitByCat)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));

  // Top sold items chart
  const soldByItem: Record<string, { nama: string; qty: number }> = {};
  dataKeluar.forEach(d => {
    const nama = d.barang?.nama || "?";
    if (!soldByItem[d.barang_id]) soldByItem[d.barang_id] = { nama, qty: 0 };
    soldByItem[d.barang_id].qty += d.jumlah;
  });
  const topSoldData = Object.values(soldByItem)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8)
    .map(s => ({ name: s.nama.length > 15 ? s.nama.substring(0, 15) + "..." : s.nama, jumlah: s.qty }));

  const handlePrint = () => window.print();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">Laporan</h1>
        <div className="flex items-center gap-2">
          <Select value={periode} onValueChange={v => setPeriode(v as Periode)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="harian">Harian</SelectItem>
              <SelectItem value="mingguan">Mingguan</SelectItem>
              <SelectItem value="bulanan">Bulanan</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" />Cetak</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowDownToLine className="h-6 w-6 text-green-600" />
            <div>
              <p className="text-xl font-bold">{totalMasuk}</p>
              <p className="text-xs text-muted-foreground">Stok Masuk</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <ArrowUpFromLine className="h-6 w-6 text-destructive" />
            <div>
              <p className="text-xl font-bold">{totalKeluar}</p>
              <p className="text-xs text-muted-foreground">Stok Keluar</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-xl font-bold">{fmt(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">Total Pendapatan</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <div>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">{fmt(totalProfit)}</p>
              <p className="text-xs text-muted-foreground">Total Keuntungan</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="keuntungan">💰 Keuntungan</TabsTrigger>
          <TabsTrigger value="masuk">📥 Stok Masuk</TabsTrigger>
          <TabsTrigger value="keluar">📤 Stok Keluar</TabsTrigger>
        </TabsList>

        {/* KEUNTUNGAN TAB */}
        <TabsContent value="keuntungan" className="space-y-4">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bar Chart: Profit per Item */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">📊 Keuntungan per Barang (Top 8)</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {profitChartData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Belum ada data stok keluar</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={profitChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}rb`} fontSize={11} />
                      <YAxis type="category" dataKey="name" width={110} fontSize={11} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="keuntungan" radius={[0, 4, 4, 0]}>
                        {profitChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Pie Chart: Profit by Category */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">🥧 Keuntungan per Kategori</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {pieData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Belum ada data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Profit Table */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">📋 Rincian Keuntungan per Barang ({periodeLabel(periode)})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama Barang</TableHead>
                      <TableHead className="text-right">Qty Keluar</TableHead>
                      <TableHead className="text-right">H. Beli/pcs</TableHead>
                      <TableHead className="text-right">H. Jual/pcs</TableHead>
                      <TableHead className="text-right">Total Modal</TableHead>
                      <TableHead className="text-right">Total Pendapatan</TableHead>
                      <TableHead className="text-right">Keuntungan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitList.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Belum ada stok keluar pada periode ini</TableCell></TableRow>
                    ) : (
                      <>
                        {profitList.map((p, i) => (
                          <TableRow key={i}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell className="font-mono text-xs">{p.kode}</TableCell>
                            <TableCell className="font-medium">{p.nama}</TableCell>
                            <TableCell className="text-right">{p.qty}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmt(p.qty > 0 ? Math.round(p.beli / p.qty) : 0)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmt(p.qty > 0 ? Math.round(p.jual / p.qty) : 0)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmt(p.beli)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmt(p.jual)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className={p.profit >= 0 ? "text-green-600 border-green-600 font-mono text-xs" : "text-red-600 border-red-600 font-mono text-xs"}>
                                {p.profit >= 0 ? "+" : ""}{fmt(p.profit)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={6} className="text-right">TOTAL</TableCell>
                          <TableCell className="text-right font-mono">{fmt(totalCost)}</TableCell>
                          <TableCell className="text-right font-mono">{fmt(totalRevenue)}</TableCell>
                          <TableCell className="text-right">
                            <Badge className="bg-green-600 font-mono text-xs">{fmt(totalProfit)}</Badge>
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STOK MASUK TAB */}
        <TabsContent value="masuk">
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Barang</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataMasuk.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>
                ) : dataMasuk.map((d, i) => (
                  <TableRow key={d.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(d.tanggal).toLocaleDateString("id-ID")}</TableCell>
                    <TableCell className="font-mono text-xs">{d.barang?.kode}</TableCell>
                    <TableCell>{d.barang?.nama}</TableCell>
                    <TableCell className="text-sm">{d.barang?.kategori?.nama ?? "-"}</TableCell>
                    <TableCell className="text-sm">{d.supplier?.nama ?? "-"}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">+{d.jumlah}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* STOK KELUAR TAB */}
        <TabsContent value="keluar" className="space-y-4">
          {/* Top Sold Chart */}
          {topSoldData.length > 0 && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">📦 Barang Paling Banyak Keluar ({periodeLabel(periode)})</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topSoldData} margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" fontSize={10} angle={-20} textAnchor="end" height={60} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="jumlah" fill="#ef4444" radius={[4, 4, 0, 0]} name="Qty Keluar">
                      {topSoldData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Barang</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataKeluar.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>
                ) : dataKeluar.map((d, i) => (
                  <TableRow key={d.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(d.tanggal).toLocaleDateString("id-ID")}</TableCell>
                    <TableCell className="font-mono text-xs">{d.barang?.kode}</TableCell>
                    <TableCell>{d.barang?.nama}</TableCell>
                    <TableCell className="text-sm">{d.barang?.kategori?.nama ?? "-"}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">-{d.jumlah}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
