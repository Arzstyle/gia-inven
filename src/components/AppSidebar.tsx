import {
  LayoutDashboard,
  FolderTree,
  Layers,
  Box,
  Truck,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileBarChart,
  Activity,
  LogOut,
  ShoppingCart,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Katalog Barang", url: "/katalog", icon: FolderTree },
  { title: "Penjualan", url: "/penjualan", icon: ShoppingCart },
];

const masterItems = [
  { title: "Kategori", url: "/kategori", icon: FolderTree },
  { title: "Subkategori", url: "/subkategori", icon: Layers },
  { title: "Barang", url: "/barang", icon: Box },
  { title: "Supplier", url: "/supplier", icon: Truck },
];

const stokItems = [
  { title: "Stok Masuk", url: "/stok-masuk", icon: ArrowDownToLine },
  { title: "Stok Keluar", url: "/stok-keluar", icon: ArrowUpFromLine },
];

const laporanItems = [
  { title: "Laporan", url: "/laporan", icon: FileBarChart },
  { title: "Log Aktivitas", url: "/log-aktivitas", icon: Activity },
];

function MenuSection({ label, items }: { label: string; items: typeof mainItems }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="hover:bg-sidebar-accent/50"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { signOut } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sidebar-accent rounded flex items-center justify-center">
            <Package className="h-4 w-4 text-sidebar-accent-foreground" />
          </div>
          <div className="leading-none">
            <p className="font-semibold text-sm text-sidebar-foreground">GIA</p>
            <p className="text-xs text-sidebar-foreground/60">Toko Bangunan</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <MenuSection label="Utama" items={mainItems} />
        <MenuSection label="Master Data" items={masterItems} />
        <MenuSection label="Stok" items={stokItems} />
        <MenuSection label="Laporan" items={laporanItems} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
