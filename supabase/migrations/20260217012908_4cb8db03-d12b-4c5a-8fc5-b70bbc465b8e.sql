
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'kasir');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles: users can read their own roles, admins can manage all
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Kategori table
CREATE TABLE public.kategori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  deskripsi TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kategori ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read kategori" ON public.kategori FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage kategori" ON public.kategori FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Subkategori table
CREATE TABLE public.subkategori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kategori_id UUID REFERENCES public.kategori(id) ON DELETE CASCADE NOT NULL,
  nama TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subkategori ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read subkategori" ON public.subkategori FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage subkategori" ON public.subkategori FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Supplier table
CREATE TABLE public.supplier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  kontak TEXT,
  alamat TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read supplier" ON public.supplier FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage supplier" ON public.supplier FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Barang table
CREATE TABLE public.barang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  kategori_id UUID REFERENCES public.kategori(id) ON DELETE SET NULL,
  subkategori_id UUID REFERENCES public.subkategori(id) ON DELETE SET NULL,
  satuan TEXT NOT NULL DEFAULT 'pcs',
  stok INTEGER NOT NULL DEFAULT 0,
  stok_minimum INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.barang ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read barang" ON public.barang FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage barang" ON public.barang FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Stok masuk table
CREATE TABLE public.stok_masuk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barang_id UUID REFERENCES public.barang(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES public.supplier(id) ON DELETE SET NULL,
  jumlah INTEGER NOT NULL,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  keterangan TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stok_masuk ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read stok_masuk" ON public.stok_masuk FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert stok_masuk" ON public.stok_masuk FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage stok_masuk" ON public.stok_masuk FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Stok keluar table
CREATE TABLE public.stok_keluar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barang_id UUID REFERENCES public.barang(id) ON DELETE CASCADE NOT NULL,
  jumlah INTEGER NOT NULL,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  keterangan TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stok_keluar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read stok_keluar" ON public.stok_keluar FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert stok_keluar" ON public.stok_keluar FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage stok_keluar" ON public.stok_keluar FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Log aktivitas table
CREATE TABLE public.log_aktivitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aksi TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.log_aktivitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read log" ON public.log_aktivitas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert log" ON public.log_aktivitas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Trigger: auto update stok on stok_masuk insert
CREATE OR REPLACE FUNCTION public.update_stok_masuk()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.barang SET stok = stok + NEW.jumlah WHERE id = NEW.barang_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_stok_masuk
AFTER INSERT ON public.stok_masuk
FOR EACH ROW EXECUTE FUNCTION public.update_stok_masuk();

-- Trigger: auto update stok on stok_keluar insert
CREATE OR REPLACE FUNCTION public.update_stok_keluar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.barang SET stok = stok - NEW.jumlah WHERE id = NEW.barang_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_stok_keluar
AFTER INSERT ON public.stok_keluar
FOR EACH ROW EXECUTE FUNCTION public.update_stok_keluar();
