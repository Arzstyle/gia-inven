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
  { title: "Penjualan", url: "/penjualan", icon: ShoppingCart },
];

const masterItems = [
  { title: "Kategori", url: "/kategori", icon: FolderTree },
  { title: "Subkategori", url: "/subkategori", icon: Layers },
  { title: "Barang", url: "/barang", icon: Box },
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
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4 flex flex-row items-center gap-3 bg-white">
        <img 
          src="/logo-gia.jpeg" 
          alt="GIA Logo" 
          className="h-9 w-auto object-contain flex-shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <span className="font-bold text-base text-slate-800 tracking-tight truncate">
          TB. GIA MULYA
        </span>
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
