import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FolderTree, Box, Package, AlertTriangle, TrendingUp, ArrowUpFromLine } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];

export default function Dashboard() {
  const [stats, setStats] = useState({ kategori: 0, barang: 0, totalStok: 0, stokMenipis: 0 });
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [topStockData, setTopStockData] = useState<any[]>([]);
  const [topSoldData, setTopSoldData] = useState<any[]>([]);
  const [stockByCatData, setStockByCatData] = useState<any[]>([]);
  const [profitToday, setProfitToday] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().split("T")[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

      const [katRes, brgRes, logRes, keluarRes] = await Promise.all([
        supabase.from("kategori").select("id, nama", { count: "exact" }),
        supabase.from("barang").select("*, kategori(nama)"),
        supabase.from("log_aktivitas").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("stok_keluar").select("*, barang(kode, nama, harga_beli, harga_jual)")
          .gte("tanggal", monthStart).lte("tanggal", today),
      ]);

      const barangData = brgRes.data ?? [];
      const totalStok = barangData.reduce((s, b) => s + (b.stok ?? 0), 0);
      const low = barangData.filter(b => b.stok <= b.stok_minimum);
      const katData = katRes.data ?? [];

      setStats({ kategori: katData.length, barang: barangData.length, totalStok, stokMenipis: low.length });
      setLowStock(low);
      setRecentLogs(logRes.data ?? []);

      // Top 10 highest stock items
      const topStock = [...barangData]
        .sort((a, b) => (b.stok ?? 0) - (a.stok ?? 0))
        .slice(0, 10)
        .map(b => ({
          name: b.nama.length > 18 ? b.nama.substring(0, 18) + "..." : b.nama,
          stok: b.stok ?? 0,
        }));
      setTopStockData(topStock);

      // Stock distribution by category (pie)
      const catStock: Record<string, number> = {};
      barangData.forEach(b => {
        const cat = b.kategori?.nama || "Lainnya";
        catStock[cat] = (catStock[cat] || 0) + (b.stok ?? 0);
      });
      const catPie = Object.entries(catStock)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({ name, value }));
      setStockByCatData(catPie);

      // Top sold items this month
      const keluarData = keluarRes.data ?? [];
      const soldMap: Record<string, { nama: string; qty: number }> = {};
      let monthProfit = 0;
      keluarData.forEach(d => {
        const brg = d.barang;
        if (!brg) return;
        const key = d.barang_id;
        if (!soldMap[key]) soldMap[key] = { nama: brg.nama, qty: 0 };
        soldMap[key].qty += d.jumlah;
        monthProfit += ((Number(brg.harga_jual) || 0) - (Number(brg.harga_beli) || 0)) * d.jumlah;
      });
      const topSold = Object.values(soldMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 8)
        .map(s => ({
          name: s.nama.length > 18 ? s.nama.substring(0, 18) + "..." : s.nama,
          jumlah: s.qty,
        }));
      setTopSoldData(topSold);
      setProfitToday(monthProfit);
    };
    fetchData();
  }, []);

  const cards = [
    { label: "Total Kategori", value: String(stats.kategori), icon: FolderTree, color: "text-blue-600" },
    { label: "Total Barang", value: String(stats.barang), icon: Box, color: "text-purple-600" },
    { label: "Total Stok", value: String(stats.totalStok), icon: Package, color: "text-cyan-600" },
    { label: "Stok Menipis", value: String(stats.stokMenipis), icon: AlertTriangle, color: "text-destructive" },
    { label: "Keuntungan Bulan Ini", value: fmt(profitToday), icon: TrendingUp, color: "text-green-600", isWide: true },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map(c => (
          <Card key={c.label} className={c.isWide ? "col-span-2 md:col-span-1 border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900" : ""}>
            <CardContent className="p-4 flex items-center gap-3">
              <c.icon className={`h-7 w-7 ${c.color} shrink-0`} />
              <div className="min-w-0">
                <p className="text-lg font-bold truncate">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Stock Items Bar Chart */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-cyan-600" />
              Stok Terbanyak (Top 10)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {topStockData.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Belum ada data</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topStockData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={130} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="stok" name="Stok" radius={[0, 4, 4, 0]}>
                    {topStockData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Stock Distribution by Category Pie Chart */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-blue-600" />
              Distribusi Stok per Kategori
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {stockByCatData.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Belum ada data</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stockByCatData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    fontSize={10}
                  >
                    {stockByCatData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Sold Items This Month */}
      {topSoldData.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowUpFromLine className="h-4 w-4 text-red-500" />
              Barang Paling Banyak Keluar (Bulan Ini)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topSoldData} margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={10} angle={-15} textAnchor="end" height={60} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="jumlah" name="Qty Keluar" radius={[4, 4, 0, 0]}>
                  {topSoldData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Warning */}
      {lowStock.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Peringatan Stok Menipis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Minimum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.kode}</TableCell>
                    <TableCell>{b.nama}</TableCell>
                    <TableCell className="text-right"><Badge variant="destructive">{b.stok}</Badge></TableCell>
                    <TableCell className="text-right">{b.stok_minimum}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Aktivitas Terbaru</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">Belum ada aktivitas</TableCell>
                </TableRow>
              ) : (
                recentLogs.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString("id-ID")}</TableCell>
                    <TableCell><Badge variant="secondary">{l.aksi}</Badge></TableCell>
                    <TableCell className="text-xs">{l.detail}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
