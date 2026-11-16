import React, { useState, useEffect } from "react";
import { Search, X, RotateCcw, ArrowUpDown, Eye, BookOpen, Layers, ChevronDown } from "lucide-react";

export type SortOption = "newest" | "oldest" | "most_viewed" | string;

export interface SortItem {
  value: string;
  label: string;
}

export interface CatalogFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  level: string; // 'ALL' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  onLevelChange: (level: string) => void;
  sort: SortOption;
  onSortChange: (sort: any) => void;
  totalResults: number;
  resultLabel?: string; // e.g. "khóa học", "bộ thẻ", "bài thi"
  searchPlaceholder?: string;
  onReset?: () => void;
  extraSortOptions?: SortItem[];
}

const CEFR_LEVELS = [
  { key: "ALL", label: "Tất cả" },
  { key: "A1", label: "A1" },
  { key: "A2", label: "A2" },
  { key: "B1", label: "B1" },
  { key: "B2", label: "B2" },
  { key: "C1", label: "C1" },
  { key: "C2", label: "C2" },
];

export function CatalogFilterBar({
  search,
  onSearchChange,
  level,
  onLevelChange,
  sort,
  onSortChange,
  totalResults,
  resultLabel = "mục",
  searchPlaceholder = "Tìm kiếm theo tiêu đề, mô tả, từ khóa...",
  onReset,
  extraSortOptions = [],
}: CatalogFilterBarProps) {
  // Quản lý giá trị input với kỹ thuật Debounce 300ms
  const [inputValue, setInputValue] = useState(search);

  useEffect(() => {
    setInputValue(search);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== search) {
        onSearchChange(inputValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, search, onSearchChange]);

  const handleClearSearch = () => {
    setInputValue("");
    onSearchChange("");
  };

  const defaultSortOptions: SortItem[] = [
    { value: "newest", label: "Mới nhất" },
    { value: "oldest", label: "Trễ nhất (Cũ nhất)" },
    { value: "most_viewed", label: "Xem nhiều nhất" },
    ...extraSortOptions,
  ];

  const hasActiveFilters = Boolean(
    (search && search.trim() !== "") ||
    (level && level !== "ALL" && level !== "All") ||
    (sort !== "newest")
  );

  return (
    <div className="space-y-4 w-full">
      {/* Hàng 1: Search Input & Sort Dropdown */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Ô Tìm kiếm với Debounce 300ms */}
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-zinc-900 transition-colors pointer-events-none" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-11 pl-10 pr-10 rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 focus:outline-none transition-all duration-200 text-sm shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              title="Xóa từ khóa tìm kiếm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Bộ chọn sắp xếp (Sort Dropdown) */}
        <div className="relative shrink-0 flex items-center">
          <div className="relative w-full sm:w-auto">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
              <ArrowUpDown className="h-3.5 w-3.5" />
            </div>
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              className="w-full sm:w-[200px] h-11 pl-9 pr-8 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-sm font-medium hover:border-zinc-300 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 focus:outline-none transition-all duration-200 appearance-none cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
            >
              {defaultSortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" strokeWidth={1.75} />
          </div>
        </div>
      </div>

      {/* Hàng 2: CEFR Level Pills & Bộ đếm kết quả */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Dải nút Level Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            Trình độ:
          </span>
          {CEFR_LEVELS.map((lvl) => {
            const isActive = level === lvl.key || (lvl.key === "ALL" && (!level || level === "All" || level === "All Levels"));
            return (
              <button
                key={lvl.key}
                type="button"
                onClick={() => onLevelChange(lvl.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isActive
                    ? "bg-zinc-900 text-white shadow-sm scale-[1.02]"
                    : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 active:scale-[0.98]"
                }`}
              >
                {lvl.label}
              </button>
            );
          })}
        </div>

        {/* Bộ đếm kết quả & Nút xóa bộ lọc */}
        <div className="flex items-center justify-between md:justify-end gap-3 text-xs text-zinc-500 shrink-0">
          <div>
            Hiển thị <span className="font-bold text-zinc-900 font-mono">{totalResults}</span> {resultLabel}
          </div>
          {hasActiveFilters && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-900 underline underline-offset-2 transition-colors font-medium"
            >
              <RotateCcw className="h-3 w-3" />
              Đặt lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Component hiển thị trạng thái trống (Empty Filter State) chuẩn Monochrome
 */
export function CatalogEmptyState({
  onReset,
  title = "Không tìm thấy kết quả phù hợp",
  description = "Thử điều chỉnh từ khóa tìm kiếm hoặc chọn cấp độ khác để tìm được học liệu bạn cần.",
}: {
  onReset?: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <div className="col-span-full text-center py-16 px-6 border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50 flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="p-3.5 rounded-2xl bg-zinc-100 border border-zinc-200/60 text-zinc-700 mb-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <Search className="w-6 h-6 text-zinc-600" />
      </div>
      <h3 className="text-base font-bold text-zinc-900 tracking-tight">{title}</h3>
      <p className="text-xs md:text-sm text-zinc-500 max-w-md mt-1 mb-5 leading-relaxed">
        {description}
      </p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 active:scale-[0.98] transition-all duration-200 shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Xóa bộ lọc (Reset Filters)
        </button>
      )}
    </div>
  );
}
