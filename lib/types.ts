export type Warehouse = { id: string; code: string; name: string; active: boolean };
export type Category = { id: string; name: string };

export type ProductUnit = {
  id?: string;
  product_id?: string;
  unit: string;
  factor: number;
  price_retail: number;
  price_wholesale: number;
};

export type Product = {
  id: string;
  sku: string | null;
  name: string;
  category_id: string | null;
  category_name?: string | null;
  base_unit: string;
  avg_cost: number;
  min_stock: number;
  notes: string | null;
  active: boolean;
  stock_total?: number;
  product_units?: ProductUnit[];
};

export type Customer = {
  id: string;
  name: string;
  price_type: "eceran" | "grosir";
  phone: string | null;
  address: string | null;
  term_days: number;
  notes: string | null;
  active: boolean;
};

export type Supplier = {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  address: string | null;
  bank_info: string | null;
  notes: string | null;
  active: boolean;
};

export type Bank = { bank: string; number: string };

export type Settings = {
  id: number;
  company_name: string;
  address: string;
  phone: string;
  account_name: string;
  banks: Bank[];
  invoice_prefix: string;
  tax_enabled: boolean;
  tax_percent: number;
  footer_note: string;
  signature_url: string | null;
};

export type LineItem = {
  key: string;
  product_id: string;
  name: string;
  unit: string;
  factor: number;
  qty: number;
  price: number;
};

export type Sale = {
  id: string;
  number: string;
  date: string;
  customer_id: string | null;
  customer_name: string;
  warehouse_id: string;
  subtotal: number;
  discount: number;
  shipping: number;
  tax_percent: number;
  tax_amount: number;
  total: number;
  cogs: number;
  paid_amount: number;
  return_amount: number;
  due_date: string | null;
  status: "aktif" | "batal";
  notes: string | null;
};

export type SaleItem = {
  id: string;
  product_id: string;
  name: string;
  qty: number;
  unit: string;
  factor: number;
  price: number;
  subtotal: number;
};

export type Purchase = {
  id: string;
  number: string;
  date: string;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_ref: string | null;
  warehouse_id: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  paid_amount: number;
  return_amount: number;
  due_date: string | null;
  status: "aktif" | "batal";
  notes: string | null;
};

export const balance = (d: { total: number; paid_amount: number; return_amount: number }) =>
  Number(d.total) - Number(d.paid_amount) - Number(d.return_amount);
