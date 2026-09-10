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

const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }> }> = {
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
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeItems = items.filter((i) => i.is_active == 1 || i.is_active === true);
  const inactiveItems = items.filter((i) => i.is_active == 0 || i.is_active === false);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Cửa hàng</h1>
          <p className="text-muted-foreground">
            Toàn bộ vật phẩm · {activeItems.length} đang bán · {inactiveItems.length} đã ngưng
          </p>
        </div>
        <Button onClick={openAddDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Thêm vật phẩm
        </Button>
      </div>

      {/* ── Thông báo ── */}
      {successMsg && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* ── Bảng vật phẩm ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4" />
            Đang bán ({activeItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {activeItems.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">Chưa có vật phẩm nào.</p>
            )}
            {activeItems.map((item) => {
              const Icon = typeConfig[item.type]?.icon ?? ShoppingBag;
              return (
                <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.description || "—"}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {item.type.replace("_", " ")}
                  </Badge>
                  <span className="text-sm font-bold shrink-0 w-20 text-right">
                    {item.price.toLocaleString()} xu
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive hover:text-white"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Bảng vật phẩm đã ngưng bán ── */}
      {inactiveItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
              <PackageX className="h-4 w-4" />
              Đã ngưng bán ({inactiveItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {inactiveItems.map((item) => {
                const Icon = typeConfig[item.type]?.icon ?? ShoppingBag;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-6 py-4 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-through text-muted-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.description || "—"}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 opacity-60">
                      {item.type.replace("_", " ")}
                    </Badge>
                    <span className="text-sm font-bold shrink-0 w-20 text-right text-muted-foreground">
                      {item.price.toLocaleString()} xu
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 shrink-0"
                      onClick={() => handleActivate(item)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Mở lại
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Dialog Thêm / Sửa ── */}
      <Dialog
        open={dialogMode !== null}
        onOpenChange={(open) => { if (!open) setDialogMode(null); setErrorMsg(null); }}
      >
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add" ? "Thêm vật phẩm mới" : `Sửa: ${editingItem?.name}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {errorMsg && (
              <p className="text-sm text-destructive">{errorMsg}</p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="item-name">Tên vật phẩm</Label>
              <Input
                id="item-name"
                placeholder="Ví dụ: Streak Freeze"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-type">Loại</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as ItemFormData["type"] }))}
              >
                <SelectTrigger id="item-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STREAK_FREEZE">Streak Freeze</SelectItem>
                  <SelectItem value="AVATAR_FRAME">Avatar Frame</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-price">Giá (xu)</Label>
              <Input
                id="item-price"
                type="number"
                min={0}
                placeholder="Ví dụ: 50"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-desc">Mô tả</Label>
              <Input
                id="item-desc"
                placeholder="Mô tả ngắn về vật phẩm..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)} disabled={saving}>
              Huỷ
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {dialogMode === "add" ? "Thêm" : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog xác nhận Ngưng bán ── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Ngưng bán vật phẩm?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Vật phẩm <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span> sẽ bị ẩn khỏi cửa hàng. Bạn có thể mở bán lại bất cứ lúc nào.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Huỷ</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDeactivate(deleteTarget)}
            >
              Ngưng bán
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
