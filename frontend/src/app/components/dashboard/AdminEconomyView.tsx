import { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Switch } from "../ui/switch";
import {
  Shield,
  Image as ImageIcon,
  Store,
  Eye,
  Pencil,
  Loader2,
  Package,
  Trophy,
  Target,
  BookImage,
} from "lucide-react";

const API_BASE = "";

interface AdminItem {
  id: string;
  name: string;
  description: string;
  price: number;
  price_type: "COIN" | "DIAMOND";
  type: string;
  is_active: boolean | number;
  image_url?: string;
  collection_id?: string;
  collection_name?: string;
  required_level?: number;
}

interface AdminCollection {
  id: string;
  name: string;
  description: string;
  unlock_level: number;
  theme_color: string;
  is_deleted: boolean | number;
  total_items: number;
  image_url?: string;
}

const TYPE_LABELS: Record<string, string> = {
  STREAK_FREEZE: "Streak Freeze",
  AVATAR: "Avatar",
  COVER_PHOTO: "Ảnh bìa",
};

const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  STREAK_FREEZE: Shield,
  AVATAR: ImageIcon,
  COVER_PHOTO: ImageIcon,
};

export function AdminView() {
  const [activeTab, setActiveTab] = useState("items");
  const [items, setItems] = useState<AdminItem[]>([]);
  const [collections, setCollections] = useState<AdminCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Item state
  const [selectedItem, setSelectedItem] = useState<AdminItem | null>(null);
  const [editFields, setEditFields] = useState<Partial<AdminItem>>({});
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});
  const [imgAspect, setImgAspect] = useState<'landscape' | 'square' | null>(null);

  // Collection state
  const [selectedCollection, setSelectedCollection] = useState<AdminCollection | null>(null);
  const [editCollectionFields, setEditCollectionFields] = useState<Partial<AdminCollection>>({});
  const [isEditingCollection, setIsEditingCollection] = useState<Record<string, boolean>>({});
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resItems, resColls] = await Promise.all([
        fetch(`${API_BASE}/api/admin/gamification/items`, { credentials: "include" }),
        fetch(`${API_BASE}/api/admin/gamification/collections`, { credentials: "include" })
      ]);
      const dataItems = await resItems.json();
      const dataColls = await resColls.json();
      setItems(Array.isArray(dataItems.data) ? dataItems.data : []);
      setCollections(Array.isArray(dataColls.data) ? dataColls.data : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDetail = (item: AdminItem) => {
    setSelectedItem(item);
    setEditFields({ ...item });
    setIsEditing({});
    setImgAspect(null);
  };

  const closeDetail = () => {
    setSelectedItem(null);
    setEditFields({});
    setIsEditing({});
  };

  const openCollectionDetail = (coll: AdminCollection) => {
    setSelectedCollection(coll);
    setEditCollectionFields({ ...coll });
    setIsEditingCollection({});
  };

  const closeCollectionDetail = () => {
    setSelectedCollection(null);
    setEditCollectionFields({});
    setIsEditingCollection({});
  };

  const handleToggleActive = async (item: AdminItem) => {
    try {
      await fetch(`${API_BASE}/api/admin/gamification/items/${item.id}/toggle`, {
        method: "PUT",
        credentials: "include",
      });
      const newActive = !(item.is_active == 1 || item.is_active === true);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: newActive } : i));
      if (selectedItem?.id === item.id) {
        const updated = { ...selectedItem, is_active: newActive };
        setSelectedItem(updated);
        setEditFields(f => ({ ...f, is_active: newActive }));
      }
      showSuccess(newActive ? `Đã mở bán "${item.name}".` : `Đã ngưng bán "${item.name}".`);
    } catch {
      alert("Lỗi kết nối.");
    }
  };

  const handleSaveField = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/gamification/items/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editFields.name,
          type: editFields.type,
          price: editFields.price,
          price_type: editFields.price_type,
          description: editFields.description,
          image_url: editFields.image_url,
          required_level: editFields.required_level,
          collection_id: editFields.collection_id,
          is_active: editFields.is_active !== undefined ? editFields.is_active : selectedItem.is_active,
        }),
      });
      if (res.ok) {
        await fetchData();
        setIsEditing({});
        const merged = { ...selectedItem, ...editFields } as AdminItem;
        setSelectedItem(merged);
        showSuccess("Đã lưu thay đổi.");
        closeDetail();
      } else {
        const d = await res.json();
        alert(d.message || "Lỗi lưu.");
      }
    } catch {
      alert("Lỗi kết nối.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCollectionField = async () => {
    if (!selectedCollection) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/gamification/collections/${selectedCollection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editCollectionFields.name,
          description: editCollectionFields.description,
          unlock_level: editCollectionFields.unlock_level,
          theme_color: editCollectionFields.theme_color,
          is_deleted: editCollectionFields.is_deleted !== undefined ? editCollectionFields.is_deleted : selectedCollection.is_deleted,
        }),
      });
      if (res.ok) {
        await fetchData();
        setIsEditingCollection({});
        const merged = { ...selectedCollection, ...editCollectionFields } as AdminCollection;
        setSelectedCollection(merged);
        showSuccess("Đã lưu bộ sưu tập.");
        closeCollectionDetail();
      } else {
        const d = await res.json();
        alert(d.message || "Lỗi lưu.");
      }
    } catch {
      alert("Lỗi kết nối.");
    } finally {
      setSaving(false);
    }
  };
  const handleCreateCollectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/gamification/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editCollectionFields.name,
          description: editCollectionFields.description,
          unlock_level: editCollectionFields.unlock_level || 1,
          theme_color: editCollectionFields.theme_color || "#3b82f6",
        }),
      });
      if (res.ok) {
        showSuccess("Đã thêm bộ sưu tập.");
        setIsCreatingCollection(false);
        setEditCollectionFields({});
        fetchData();
      } else {
        const d = await res.json();
        alert(d.message || "Lỗi tạo.");
      }
    } catch {
      alert("Lỗi kết nối.");
    } finally {
      setSaving(false);
    }
  };

  const isActive = (item: AdminItem) => item.is_active == 1 || item.is_active === true;

  const getStatusBadge = (item: AdminItem) => isActive(item)
    ? <Badge variant="outline" className="text-emerald-500 border-emerald-500 bg-emerald-500/10">Đang bán</Badge>
    : <Badge variant="outline" className="text-muted-foreground border-muted-foreground/40 bg-muted/30">Ngưng bán</Badge>;

  const getTypeIcon = (type: string) => {
    const Icon = TYPE_ICONS[type] ?? Store;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 p-6 rounded-2xl border bg-card shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gamification & Economy</h1>
          <p className="text-muted-foreground mt-1">Quản lý cửa hàng, bộ sưu tập, nhiệm vụ và thành tựu trong hệ thống.</p>
        </div>
        <div className="flex gap-3">
          {activeTab === "collections" && (
            <Button onClick={() => setIsCreatingCollection(true)}>Thêm Bộ Sưu Tập</Button>
          )}
          {activeTab === "items" && (
            <Button>Thêm Vật Phẩm</Button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
          ✓ {successMsg}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="items">
            <Store className="w-4 h-4 mr-1.5" /> Cửa hàng
          </TabsTrigger>
          <TabsTrigger value="collections">
            <BookImage className="w-4 h-4 mr-1.5" /> Bộ sưu tập
          </TabsTrigger>
          <TabsTrigger value="quests">
            <Target className="w-4 h-4 mr-1.5" /> Nhiệm vụ
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Trophy className="w-4 h-4 mr-1.5" /> Thành tựu
          </TabsTrigger>
        </TabsList>

        {/* ── STORE ITEMS TAB ── */}
        <TabsContent value="items">
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
            {items.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Chưa có vật phẩm nào trong hệ thống.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Vật phẩm</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Giá</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right pr-6">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium pl-6">
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <div className={`h-8 ${item.type === 'COVER_PHOTO' ? 'w-14' : 'w-8'} rounded-md overflow-hidden border shrink-0`}>
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className={`h-8 ${item.type === 'COVER_PHOTO' ? 'w-14' : 'w-8'} rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0`}>
                              {getTypeIcon(item.type)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{TYPE_LABELS[item.type] ?? item.type}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {item.price.toLocaleString()} {item.price_type === "DIAMOND" ? "💎" : "xu"}
                      </TableCell>
                      <TableCell>{getStatusBadge(item)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="secondary" size="sm" onClick={() => openDetail(item)}>
                          <Eye className="w-4 h-4 mr-1.5" /> Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* ── COLLECTIONS TAB ── */}
        <TabsContent value="collections" className="bg-card border rounded-xl shadow-sm overflow-hidden">
          {collections.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookImage className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Chưa có bộ sưu tập nào.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Bộ sưu tập</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead>Level yêu cầu</TableHead>
                  <TableHead>Vật phẩm</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right pr-6">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((coll) => (
                  <TableRow key={coll.id}>
                    <TableCell className="font-medium pl-6">
                      <div className="flex items-center gap-3">
                        {coll.image_url ? (
                          <div className="w-14 h-8 rounded-md overflow-hidden border shrink-0">
                            <img src={coll.image_url} alt={coll.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: coll.theme_color || "#3b82f6" }} />
                        )}
                        {coll.name}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">{coll.description}</TableCell>
                    <TableCell>Lv. {coll.unlock_level}</TableCell>
                    <TableCell>{coll.total_items} món</TableCell>
                    <TableCell>
                      {coll.is_deleted ? (
                        <Badge variant="outline" className="text-destructive border-destructive bg-destructive/10">Đã xóa</Badge>
                      ) : (
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500 bg-emerald-500/10">Hoạt động</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="secondary" size="sm" onClick={() => openCollectionDetail(coll)}>
                        <Eye className="w-4 h-4 mr-1.5" /> Chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="quests" className="bg-card border rounded-xl shadow-sm">
          <div className="text-center py-16 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Quản lý nhiệm vụ Daily/Weekly sẽ hiển thị ở đây.</p>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="bg-card border rounded-xl shadow-sm">
          <div className="text-center py-16 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Quản lý thành tựu sẽ hiển thị ở đây.</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── ITEM DETAIL MODAL ── */}
      <Dialog open={selectedItem !== null} onOpenChange={(open) => { if (!open) closeDetail(); }}>
        {selectedItem && (
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                Chi tiết Vật phẩm
                {getStatusBadge(selectedItem)}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Image preview — responsive by aspect ratio */}
              {editFields.image_url && (
                <div className={[
                  "overflow-hidden rounded-xl border transition-all",
                  imgAspect === 'square'
                    ? "h-36 w-36 mx-auto"
                    : "h-36 w-full",
                ].join(" ")}>
                  <img
                    src={editFields.image_url}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                    onLoad={(e) => {
                      const { naturalWidth, naturalHeight } = e.currentTarget;
                      setImgAspect(naturalWidth / naturalHeight > 1.2 ? 'landscape' : 'square');
                    }}
                  />
                </div>
              )}

              {/* Editable fields */}
              {([
                { label: "Tên vật phẩm", field: "name", type: "text" },
                { label: "Mô tả", field: "description", type: "text" },
                { label: "Loại", field: "type", type: "text" },
                { label: "Giá", field: "price", type: "number" },
                { label: "URL ảnh", field: "image_url", type: "text" },
                { label: "Level yêu cầu", field: "required_level", type: "number" },
              ] as { label: string; field: keyof AdminItem; type: string }[]).map(({ label, field, type }) => (
                <div key={String(field)} className="flex flex-col gap-1.5 border-b pb-4 last:border-0">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                  <div className="flex items-center gap-3">
                    {isEditing[String(field)] ? (
                      <input
                        type={type}
                        className="flex-1 bg-transparent border-b border-primary outline-none py-1 focus:border-primary text-sm font-medium"
                        value={String(editFields[field] ?? "")}
                        onChange={(e) => setEditFields(f => ({
                          ...f,
                          [field]: type === "number" ? Number(e.target.value) : e.target.value
                        }))}
                        autoFocus
                      />
                    ) : (
                      <p className="flex-1 text-sm font-medium break-all">{String(editFields[field] ?? "—")}</p>
                    )}
                    <button
                      className="text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setIsEditing(e => ({ ...e, [String(field)]: !e[String(field)] }))}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Toggle bán / ngưng bán */}
              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Trạng thái kinh doanh</h3>
                <div className="flex items-center justify-between bg-muted/40 border rounded-xl p-4">
                  <div>
                    <p className="font-medium">Đang bán trong cửa hàng</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Tắt để ẩn vật phẩm. Người dùng đã mua vẫn giữ được.</p>
                  </div>
                  <Switch
                    checked={editFields.is_active !== undefined ? (editFields.is_active == 1 || editFields.is_active === true) : isActive(selectedItem)}
                    onCheckedChange={(val) => setEditFields(f => ({ ...f, is_active: val }))}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" onClick={closeDetail}>Huỷ</Button>
              <Button onClick={handleSaveField} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Lưu thay đổi
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ── COLLECTION DETAIL MODAL ── */}
      <Dialog open={selectedCollection !== null} onOpenChange={(open) => { if (!open) closeCollectionDetail(); }}>
        {selectedCollection && (
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                Chi tiết Bộ sưu tập
                {selectedCollection.is_deleted ? (
                  <Badge variant="outline" className="text-destructive border-destructive bg-destructive/10">Đã xóa</Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500 bg-emerald-500/10">Hoạt động</Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="flex items-center gap-4">
                {selectedCollection.image_url ? (
                  <div className="w-28 h-16 rounded-xl overflow-hidden border shadow-sm shrink-0">
                    <img src={selectedCollection.image_url} alt={selectedCollection.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl shadow-sm border flex items-center justify-center font-bold text-white text-xl shrink-0" style={{ backgroundColor: selectedCollection.theme_color || "#3b82f6" }}>
                    {selectedCollection.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg">{selectedCollection.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCollection.total_items} vật phẩm</p>
                </div>
              </div>

              {([
                { label: "Tên bộ sưu tập", field: "name", type: "text" },
                { label: "Mô tả", field: "description", type: "text" },
                { label: "Level yêu cầu", field: "unlock_level", type: "number" },
                { label: "Mã màu chủ đề", field: "theme_color", type: "text" },
              ] as { label: string; field: keyof AdminCollection; type: string }[]).map(({ label, field, type }) => (
                <div key={field} className="flex flex-col gap-1.5 border-b pb-4 last:border-0">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                  <div className="flex items-center gap-3">
                    {isEditingCollection[field] ? (
                      <input
                        className="flex-1 bg-transparent border-b border-primary outline-none py-1 focus:border-primary text-sm font-medium"
                        type={type}
                        value={editCollectionFields[field] as any || ""}
                        onChange={(e) => setEditCollectionFields(f => ({
                          ...f,
                          [field]: type === "number" ? Number(e.target.value) : e.target.value
                        }))}
                        autoFocus
                      />
                    ) : (
                      <div className="flex-1 flex items-center gap-2">
                        {field === "theme_color" && (
                          <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: String(editCollectionFields[field]) }} />
                        )}
                        <p className="text-sm font-medium break-all">{String(editCollectionFields[field] ?? "—")}</p>
                      </div>
                    )}
                    <button
                      className="text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setIsEditingCollection(e => ({ ...e, [String(field)]: !e[String(field)] }))}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Toggle bán / ngưng bán */}
              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Trạng thái phát hành</h3>
                <div className="flex items-center justify-between bg-muted/40 border rounded-xl p-4">
                  <div>
                    <p className="font-medium">Đang phát hành</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Tắt để ngưng phát hành bộ sưu tập này.</p>
                  </div>
                  <Switch
                    checked={editCollectionFields.is_deleted !== undefined ? !editCollectionFields.is_deleted : !selectedCollection.is_deleted}
                    onCheckedChange={(val) => setEditCollectionFields(f => ({ ...f, is_deleted: !val }))}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2 border-t mt-2">
              <Button variant="ghost" onClick={closeCollectionDetail}>Huỷ</Button>
              <Button onClick={handleSaveCollectionField} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Lưu thay đổi
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* ── CREATE COLLECTION MODAL ── */}
      <Dialog open={isCreatingCollection} onOpenChange={(open) => {
        setIsCreatingCollection(open);
        if (!open) setEditCollectionFields({});
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm Bộ Sưu Tập Mới</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCollectionSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên bộ sưu tập <span className="text-red-500">*</span></label>
              <input
                required
                className="w-full p-2 rounded-md border bg-background text-sm"
                value={editCollectionFields.name || ""}
                onChange={e => setEditCollectionFields(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mô tả</label>
              <textarea
                className="w-full p-2 rounded-md border bg-background text-sm"
                value={editCollectionFields.description || ""}
                onChange={e => setEditCollectionFields(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Level yêu cầu</label>
                <input
                  type="number"
                  min="1"
                  className="w-full p-2 rounded-md border bg-background text-sm"
                  value={editCollectionFields.unlock_level || 1}
                  onChange={e => setEditCollectionFields(f => ({ ...f, unlock_level: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mã màu chủ đề</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="w-10 h-10 rounded-md border bg-background cursor-pointer"
                    value={editCollectionFields.theme_color || "#3b82f6"}
                    onChange={e => setEditCollectionFields(f => ({ ...f, theme_color: e.target.value }))}
                  />
                  <input
                    type="text"
                    className="flex-1 p-2 rounded-md border bg-background text-sm uppercase"
                    value={editCollectionFields.theme_color || "#3b82f6"}
                    onChange={e => setEditCollectionFields(f => ({ ...f, theme_color: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4 gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsCreatingCollection(false)}>Hủy</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Tạo mới
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
