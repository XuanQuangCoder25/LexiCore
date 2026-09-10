import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Shield,
  Frame,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Loader2,
  ShoppingBag,
  PackageX,
} from "lucide-react";

const API_BASE = "http://localhost:5000";

// ============================================================
// TYPES
// ============================================================
interface AdminItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: "STREAK_FREEZE" | "AVATAR_FRAME";
  is_active: boolean | number;
  created_at: string;
}

interface ItemFormData {
  name: string;
  type: "STREAK_FREEZE" | "AVATAR_FRAME";
  price: string;
  description: string;
}

const EMPTY_FORM: ItemFormData = {
  name: "",
  type: "STREAK_FREEZE",
  price: "",
  description: "",
};

const typeConfig: Record<string, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  STREAK_FREEZE: { icon: Shield },
  AVATAR_FRAME: { icon: Frame },
};

// ============================================================
// COMPONENT
// ============================================================
export function AdminView() {
  const [items, setItems] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dialog state
  const [dialogMode, setDialogMode] = useState<"add" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<AdminItem | null>(null);
  const [form, setForm] = useState<ItemFormData>(EMPTY_FORM);

  // Confirm delete dialog
  const [deleteTarget, setDeleteTarget] = useState<AdminItem | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/store/admin/items`, {
        credentials: "include",
      });
      if (res.status === 403) {
        setErrorMsg("Bạn không có quyền truy cập trang này.");
        return;
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setErrorMsg("Không thể tải dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ── ADD ────────────────────────────────────────────────────
  const openAddDialog = () => {
    setForm(EMPTY_FORM);
    setEditingItem(null);
    setDialogMode("add");
  };

  // ── EDIT ───────────────────────────────────────────────────
  const openEditDialog = (item: AdminItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      type: item.type,
      price: String(item.price),
      description: item.description,
    });
    setDialogMode("edit");
  };

  // ── SAVE (Add hoặc Edit) ───────────────────────────────────
  const handleSave = async () => {
    if (!form.name || !form.type || !form.price) {
      setErrorMsg("Vui lòng điền đầy đủ tên, loại và giá.");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const body = {
        name: form.name,
        type: form.type,
        price: Number(form.price),
        description: form.description,
      };

      const url =
        dialogMode === "edit"
          ? `${API_BASE}/api/store/admin/items/${editingItem!.id}`
          : `${API_BASE}/api/store/admin/items`;

      const res = await fetch(url, {
        method: dialogMode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || "Thao tác thất bại.");
      } else {
        setDialogMode(null);
        showSuccess(
          dialogMode === "edit"
            ? `Đã cập nhật vật phẩm "${form.name}".`
            : `Đã thêm vật phẩm "${form.name}" thành công.`
        );
        await fetchItems();
      }
    } catch {
      setErrorMsg("Lỗi kết nối, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  // ── DEACTIVATE (Soft Delete) ───────────────────────────────
  const handleDeactivate = async (item: AdminItem) => {
    try {
      await fetch(`${API_BASE}/api/store/admin/items/${item.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setDeleteTarget(null);
      showSuccess(`Đã ngưng bán vật phẩm "${item.name}".`);
      await fetchItems();
    } catch {
      setErrorMsg("Lỗi kết nối, vui lòng thử lại.");
    }
  };

  // ── ACTIVATE (Mở bán lại) ──────────────────────────────────
  const handleActivate = async (item: AdminItem) => {
    try {
      await fetch(`${API_BASE}/api/store/admin/items/${item.id}/activate`, {
        method: "PATCH",
        credentials: "include",
      });
      showSuccess(`Đã mở bán lại vật phẩm "${item.name}".`);
      await fetchItems();
    } catch {
      setErrorMsg("Lỗi kết nối, vui lòng thử lại.");
    }
  };

  // ── RENDER ─────────────────────────────────────────────────
  const C = {
    pageBg: "#080714",
    cardBg: "#100e24",
    cardBg2: "#0d0c1e",
    border: "rgba(167,139,250,0.18)",
    borderHard: "rgba(167,139,250,0.35)",
    lavender: "#c4b5fd",
    violet: "#a78bfa",
    blue: "#93c5fd",
    lavBg: "rgba(196,181,253,0.1)",
    lavBgHover: "rgba(196,181,253,0.18)",
    blueBg: "rgba(147,197,253,0.1)",
    inputBg: "#12102a",
    white: "#f8fafc",
    muted: "#94a3b8",
    dimmed: "#4b5563",
    redBg: "rgba(239,68,68,0.12)",
    redBorder: "rgba(239,68,68,0.3)",
    red: "#f87171",
    btnGrad: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    headerGrad: "linear-gradient(135deg, #1a1040 0%, #0f0c2e 50%, #0a1628 100%)",
  } as const;

  if (loading) {
    return (
      <div
        className="min-h-full -m-6 flex items-center justify-center"
        style={{ background: C.pageBg }}
      >
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: C.lavender }} />
      </div>
    );
  }

  const activeItems = items.filter((i) => i.is_active == 1 || i.is_active === true);
  const inactiveItems = items.filter((i) => i.is_active == 0 || i.is_active === false);

  return (
    <div
      className="min-h-full -m-6 p-6 space-y-5"
      style={{ background: C.pageBg, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >

      {/* ── Hero Header ── */}
      <div
        className="rounded-2xl p-6 flex items-center justify-between relative overflow-hidden"
        style={{ background: C.headerGrad, border: `1px solid ${C.border}` }}
      >
        {/* decorative glow blobs */}
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.35), transparent)" }} />
        <div className="absolute -bottom-10 right-20 w-40 h-40 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(79,70,229,0.25), transparent)" }} />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full"
              style={{ background: C.lavBg, color: C.lavender, border: `1px solid ${C.border}` }}>
              Admin
            </span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: C.white }}>Quản lý Cửa hàng</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>
            {items.length} vật phẩm tổng cộng ·{" "}
            <span style={{ color: C.lavender, fontWeight: 600 }}>{activeItems.length} đang bán</span>
            {inactiveItems.length > 0 && (
              <span style={{ color: C.dimmed }}> · {inactiveItems.length} đã ngưng</span>
            )}
          </p>
        </div>

        <button
          onClick={openAddDialog}
          className="relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110 active:scale-95"
          style={{ background: C.btnGrad, color: C.white, boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}
        >
          <Plus className="h-4 w-4" />
          Thêm vật phẩm
        </button>
      </div>

      {/* ── Thông báo ── */}
      {successMsg && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2"
          style={{ background: C.lavBg, border: `1px solid ${C.borderHard}`, color: C.lavender }}>
          <span>✓</span> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, color: C.red }}>
          {errorMsg}
        </div>
      )}

      {/* ── Bảng đang bán ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: C.cardBg, border: `1px solid ${C.border}` }}>

        {/* Section header */}
        <div className="px-6 py-4 flex items-center gap-3"
          style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ background: C.lavBg }}>
            <ShoppingBag className="h-4 w-4" style={{ color: C.lavender }} />
          </div>
          <span className="font-semibold text-sm" style={{ color: C.white }}>
            Đang bán
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: C.lavBg, color: C.lavender }}>
            {activeItems.length}
          </span>
        </div>

        {activeItems.length === 0 && (
          <p className="text-center py-12 text-sm" style={{ color: C.dimmed }}>
            Chưa có vật phẩm nào đang bán.
          </p>
        )}

        <div>
          {activeItems.map((item, idx) => {
            const Icon = typeConfig[item.type]?.icon ?? ShoppingBag;
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 px-6 py-4 transition-colors cursor-default"
                style={{ borderTop: idx > 0 ? `1px solid ${C.border}` : "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(167,139,250,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {/* Icon */}
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: C.lavBg, border: `1px solid ${C.border}` }}>
                  <Icon className="h-5 w-5" style={{ color: C.lavender }} />
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: C.white }}>{item.name}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: C.dimmed }}>
                    {item.description || "—"}
                  </p>
                </div>

                {/* Type badge */}
                <span className="text-xs px-2.5 py-1 rounded-full font-medium shrink-0 tracking-wide"
                  style={{ background: "rgba(147,197,253,0.1)", color: C.blue, border: "1px solid rgba(147,197,253,0.2)" }}>
                  {item.type.replace("_", " ")}
                </span>

                {/* Price */}
                <span className="text-sm font-bold shrink-0 w-20 text-right" style={{ color: C.lavender }}>
                  {item.price.toLocaleString()} xu
                </span>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEditDialog(item)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: C.lavBg, color: C.violet }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.lavBgHover; e.currentTarget.style.boxShadow = `0 0 10px rgba(167,139,250,0.3)`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = C.lavBg; e.currentTarget.style.boxShadow = "none"; }}
                    title="Sửa">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(item)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: C.redBg, color: C.red }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; e.currentTarget.style.boxShadow = "0 0 10px rgba(239,68,68,0.25)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = C.redBg; e.currentTarget.style.boxShadow = "none"; }}
                    title="Ngưng bán">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bảng đã ngưng bán ── */}
      {inactiveItems.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: C.cardBg2, border: `1px solid rgba(167,139,250,0.08)` }}>
          <div className="px-6 py-4 flex items-center gap-3"
            style={{ borderBottom: `1px solid rgba(167,139,250,0.08)` }}>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(75,85,99,0.2)" }}>
              <PackageX className="h-4 w-4" style={{ color: C.dimmed }} />
            </div>
            <span className="font-semibold text-sm" style={{ color: C.dimmed }}>
              Đã ngưng bán
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs"
              style={{ background: "rgba(75,85,99,0.2)", color: C.dimmed }}>
              {inactiveItems.length}
            </span>
          </div>

          <div>
            {inactiveItems.map((item, idx) => {
              const Icon = typeConfig[item.type]?.icon ?? ShoppingBag;
              return (
                <div key={item.id}
                  className="flex items-center gap-4 px-6 py-4 opacity-50 hover:opacity-75 transition-opacity"
                  style={{ borderTop: idx > 0 ? `1px solid rgba(167,139,250,0.06)` : "none" }}>
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(75,85,99,0.15)" }}>
                    <Icon className="h-5 w-5" style={{ color: C.dimmed }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-through" style={{ color: C.dimmed }}>{item.name}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: "#374151" }}>{item.description || "—"}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: "rgba(75,85,99,0.15)", color: C.dimmed }}>
                    {item.type.replace("_", " ")}
                  </span>
                  <span className="text-sm shrink-0 w-20 text-right" style={{ color: C.dimmed }}>
                    {item.price.toLocaleString()} xu
                  </span>
                  <button onClick={() => handleActivate(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all"
                    style={{ background: C.lavBg, color: C.violet }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.lavBgHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = C.lavBg)}>
                    <RotateCcw className="h-3 w-3" />
                    Mở lại
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Dialog Thêm / Sửa ── */}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => { if (!open) { setDialogMode(null); setErrorMsg(null); } }}
      >
        <DialogContent
          className="max-w-md"
          aria-describedby={undefined}
          style={{ background: "#0d0c1e", border: `1px solid ${C.borderHard}` }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: C.white }}>
              {dialogMode === "add" ? "Thêm vật phẩm mới" : `Sửa: ${editingItem?.name}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {errorMsg && (
              <p className="text-sm px-3 py-2 rounded-lg"
                style={{ background: C.redBg, color: C.red, border: `1px solid ${C.redBorder}` }}>
                {errorMsg}
              </p>
            )}

            {[
              { id: "item-name", label: "Tên vật phẩm", placeholder: "Ví dụ: Streak Freeze", field: "name" as const },
              { id: "item-price", label: "Giá (xu)", placeholder: "Ví dụ: 50", field: "price" as const, type: "number" },
              { id: "item-desc", label: "Mô tả", placeholder: "Mô tả ngắn về vật phẩm...", field: "description" as const },
            ].map(({ id, label, placeholder, field, type }) => (
              <div key={id} className="space-y-1.5">
                <label htmlFor={id} className="text-sm font-medium" style={{ color: C.muted }}>{label}</label>
                <input
                  id={id}
                  type={type ?? "text"}
                  min={type === "number" ? 0 : undefined}
                  placeholder={placeholder}
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{ background: C.inputBg, border: `1px solid ${C.border}`, color: C.white }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = C.lavender)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <label htmlFor="item-type" className="text-sm font-medium" style={{ color: C.muted }}>Loại</label>
              <select
                id="item-type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ItemFormData["type"] }))}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: C.inputBg, border: `1px solid ${C.border}`, color: C.white }}
              >
                <option value="STREAK_FREEZE" style={{ background: "#0d0c1e" }}>Streak Freeze</option>
                <option value="AVATAR_FRAME" style={{ background: "#0d0c1e" }}>Avatar Frame</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => { setDialogMode(null); setErrorMsg(null); }}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", color: C.muted, border: `1px solid ${C.border}` }}
            >
              Huỷ
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all hover:brightness-110"
              style={{ background: C.btnGrad, color: C.white, boxShadow: "0 0 16px rgba(124,58,237,0.35)" }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {dialogMode === "add" ? "Thêm vật phẩm" : "Lưu thay đổi"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog xác nhận Ngưng bán ── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <DialogContent
          className="max-w-sm"
          aria-describedby={undefined}
          style={{ background: "#0d0c1e", border: `1px solid ${C.redBorder}` }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: C.white }}>Ngưng bán vật phẩm?</DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: C.muted }}>
            Vật phẩm{" "}
            <span style={{ color: C.lavender, fontWeight: 600 }}>"{deleteTarget?.name}"</span>{" "}
            sẽ bị ẩn khỏi cửa hàng. Bạn có thể mở bán lại bất cứ lúc nào.
          </p>
          <DialogFooter>
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "rgba(255,255,255,0.05)", color: C.muted, border: `1px solid ${C.border}` }}
            >
              Huỷ
            </button>
            <button
              onClick={() => deleteTarget && handleDeactivate(deleteTarget)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg, #b91c1c, #dc2626)", color: C.white }}
            >
              Ngưng bán
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
