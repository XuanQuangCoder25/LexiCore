import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  Brain,
  CalendarClock,
  Activity,
  ChevronDown,
  Layers,
  Target,
  ArrowUpRight,
} from "lucide-react";
import { RetentionPoint } from "./hooks/useDashboardData";
import {
  srsService,
  ForecastDayItem,
  ReviewedCardItem,
  CardCurveData,
  SawtoothPoint,
} from "../../services/srs-service";

interface RetentionChartProps {
  data: RetentionPoint[];
  dueCardsToday?: number;
  forecastData?: ForecastDayItem[];
  reviewedCards?: ReviewedCardItem[];
  onNavigateTab?: (tab: string) => void;
}

/**
 * TAB 1: Biểu đồ 7 ngày trong tuần (Tuần này - Thực tế) kèm Interactive Tooltip & Active Dots
 */
function WeeklyRetentionSVG({ data }: { data: RetentionPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const W = 680;
  const H = 250;
  const pl = 44;
  const pr = 26;
  const pt = 28;
  const pb = 46;
  const cw = W - pl - pr;
  const ch = H - pt - pb;

  if (data.length === 0) return null;

  const divisor = Math.max(1, data.length - 1);
  const x = (i: number) => (data.length === 1 ? cw / 2 : (i / divisor) * cw);
  const y = (v: number) => ch - (Math.min(100, Math.max(0, v)) / 100) * ch;

  const retPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.retention).toFixed(1)}`)
    .join(" ");
  const revPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.withReview).toFixed(1)}`)
    .join(" ");

  const areaPath =
    data.length > 1
      ? `${revPath} L${x(data.length - 1).toFixed(1)},${ch} L${x(0).toFixed(1)},${ch} Z`
      : "";

  const hoveredPoint = hoveredIdx !== null ? data[hoveredIdx] : null;
  const colWidth = data.length > 1 ? cw / (data.length - 1) : cw;

  const extractDateShort = (dayStr: string, dateStr?: string) => {
    const match = dayStr.match(/\(([^)]+)\)/);
    if (match) return match[1];
    if (dateStr) {
      const parts = dateStr.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    }
    return dayStr;
  };

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto max-h-[290px] overflow-visible select-none"
        aria-label="Weekly memory retention chart"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="retentionAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#18181b" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#18181b" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <g transform={`translate(${pl},${pt})`}>
          {/* Lưới ngang */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line
                x1={0}
                y1={y(v)}
                x2={cw}
                y2={y(v)}
                stroke="#e4e4e7"
                strokeWidth={1}
                strokeDasharray={v === 0 ? undefined : "4 4"}
              />
              <text
                x={-10}
                y={y(v) + 4}
                textAnchor="end"
                fontSize={11}
                fontWeight={500}
                className="font-mono"
                fill="#71717a"
              >
                {v}%
              </text>
            </g>
          ))}

          {/* Đường gióng dọc khi Hover */}
          {hoveredIdx !== null && (
            <line
              x1={x(hoveredIdx)}
              y1={0}
              x2={x(hoveredIdx)}
              y2={ch}
              stroke="#18181b"
              strokeWidth={1.25}
              strokeDasharray="3 3"
            />
          )}

          {/* Nhãn trục X (Ngày & Số lượt ôn) */}
          {data.map((d, i) => {
            const hasRev = (d.reviewsCount ?? 0) > 0;
            const isHovered = hoveredIdx === i;
            return (
              <g key={`${d.day}-${i}`}>
                <text
                  x={x(i)}
                  y={ch + 20}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={isHovered || hasRev ? 700 : 500}
                  fill={isHovered || hasRev ? "#18181b" : "#52525b"}
                >
                  {d.day}
                </text>
                <text
                  x={x(i)}
                  y={ch + 35}
                  textAnchor="middle"
                  fontSize={9.5}
                  fontWeight={hasRev ? 700 : 500}
                  className="font-mono"
                  fill={hasRev ? "#18181b" : "#a1a1aa"}
                >
                  {hasRev ? `${d.reviewsCount} lượt ôn` : "0 lượt ôn"}
                </text>
              </g>
            );
          })}

          {/* Vùng đổ bóng dưới đường SRS */}
          {areaPath && <path d={areaPath} fill="url(#retentionAreaGrad)" />}

          {/* Đường nét đứt - Without Review (Forgetting Curve) */}
          <path
            d={retPath}
            fill="none"
            stroke="#a1a1aa"
            strokeWidth={2.25}
            strokeDasharray="6 5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Điểm trên đường Without Review */}
          {data.map((d, i) => (
            <circle
              key={`ret-dot-${d.day}-${i}`}
              cx={x(i)}
              cy={y(d.retention)}
              r={hoveredIdx === i ? 4.5 : 3.5}
              fill="#ffffff"
              stroke="#a1a1aa"
              strokeWidth={2}
            />
          ))}

          {/* Đường liền đậm - With SRS Review */}
          <path
            d={revPath}
            fill="none"
            stroke="#18181b"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Các điểm neo (Active Dots cho ngày có lượt ôn > 0) */}
          {data.map((d, i) => {
            const hasRev = (d.reviewsCount ?? 0) > 0;
            const isHovered = hoveredIdx === i;
            return (
              <g key={`dot-${d.day}-${i}`}>
                {hasRev && (
                  <circle
                    cx={x(i)}
                    cy={y(d.withReview)}
                    r={9}
                    fill="#18181b"
                    fillOpacity={isHovered ? 0.18 : 0.08}
                  />
                )}
                <circle
                  cx={x(i)}
                  cy={y(d.withReview)}
                  r={hasRev ? 6 : isHovered ? 5.5 : 4.5}
                  fill={hasRev ? "#18181b" : "#ffffff"}
                  stroke={hasRev ? "#ffffff" : "#18181b"}
                  strokeWidth={2.5}
                />
                <text
                  x={x(i)}
                  y={y(d.withReview) - 12}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontWeight={700}
                  className="font-mono"
                  fill="#18181b"
                >
                  {d.withReview}%
                </text>
              </g>
            );
          })}

          {/* Vùng tương tác Hover cho từng cột ngày */}
          {data.map((d, i) => (
            <rect
              key={`hit-${d.day}-${i}`}
              x={x(i) - colWidth / 2}
              y={0}
              width={colWidth}
              height={ch + 40}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
            />
          ))}
        </g>
      </svg>

      {/* Interactive Tooltip nền đen chữ trắng chuẩn Monochrome */}
      {hoveredPoint && hoveredIdx !== null && (
        <div className="mt-2 flex justify-center animate-in fade-in duration-150">
          <div className="bg-zinc-900 text-white rounded-xl shadow-lg font-mono text-xs px-3.5 py-2 border border-zinc-800 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span className="font-bold text-white">
              Ngày {extractDateShort(hoveredPoint.day, hoveredPoint.date)}:
            </span>
            <span>
              Ôn <strong className="text-white">{hoveredPoint.reviewsCount ?? 0}</strong> thẻ
              {(hoveredPoint.reviewsCount ?? 0) > 0 && (
                <>
                  {" "}
                  (<strong className="text-zinc-100">{hoveredPoint.correctCount ?? hoveredPoint.reviewsCount}</strong> Đúng
                  {" · "}
                  <strong className="text-zinc-300">{hoveredPoint.wrongCount ?? 0}</strong> Sai/Khó)
                </>
              )}
            </span>
            <span className="text-zinc-500">·</span>
            <span>
              Retention trung bình: <strong className="text-white">{hoveredPoint.withReview}%</strong>
            </span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-400">
              Không ôn: {hoveredPoint.retention}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * TAB 2: Đồ thị Răng cưa Ebbinghaus (Sawtooth Curve) trên thẻ từ vựng thực tế
 */
function SawtoothCurveSVG({ curve }: { curve: CardCurveData }) {
  const [hoveredPoint, setHoveredPoint] = useState<SawtoothPoint | null>(null);

  const W = 680;
  const H = 255;
  const pl = 44;
  const pr = 34;
  const pt = 28;
  const pb = 48;
  const cw = W - pl - pr;
  const ch = H - pt - pb;

  const points = curve.points || [];
  if (points.length === 0) return null;

  const maxX = Math.max(1, curve.totalSpanDays || points[points.length - 1].x || 1);
  const x = (t: number) => (Math.min(maxX, Math.max(0, t)) / maxX) * cw;
  const y = (v: number) => ch - (Math.min(100, Math.max(0, v)) / 100) * ch;

  // Đường nét đứt: Không ôn tập (lọc các điểm không bị trùng x để vẽ mượt)
  const uniqueXPoints = points.filter((p, idx) => idx === 0 || p.x !== points[idx - 1].x);
  const withoutPath = uniqueXPoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.x).toFixed(1)},${y(p.withoutReview).toFixed(1)}`)
    .join(" ");

  // Đường nét liền đen: Có ôn tập SRS (bao gồm cả điểm đáy isTroughPoint và cú bật thẳng đứng isReviewEvent tại cùng toạ độ x)
  const srsPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.x).toFixed(1)},${y(p.withSrs).toFixed(1)}`)
    .join(" ");

  const areaPath =
    points.length > 1
      ? `${srsPath} L${x(points[points.length - 1].x).toFixed(1)},${ch} L${x(0).toFixed(1)},${ch} Z`
      : "";

  const milestonePoints = points.filter((p) => p.isReviewEvent || p.isNextDuePoint);

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto max-h-[295px] overflow-visible select-none"
        aria-label="SRS Ebbinghaus Sawtooth Curve"
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <defs>
          <linearGradient id="sawtoothAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#18181b" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#18181b" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <g transform={`translate(${pl},${pt})`}>
          {/* Lưới ngang */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line
                x1={0}
                y1={y(v)}
                x2={cw}
                y2={y(v)}
                stroke="#e4e4e7"
                strokeWidth={1}
                strokeDasharray={v === 0 ? undefined : "4 4"}
              />
              <text
                x={-10}
                y={y(v) + 4}
                textAnchor="end"
                fontSize={11}
                fontWeight={500}
                className="font-mono"
                fill="#71717a"
              >
                {v}%
              </text>
            </g>
          ))}

          {/* Vùng đổ bóng dưới đường răng cưa SRS */}
          {areaPath && <path d={areaPath} fill="url(#sawtoothAreaGrad)" />}

          {/* Đường nét đứt xám - Không ôn tập (Rơi tự do Ebbinghaus) */}
          <path
            d={withoutPath}
            fill="none"
            stroke="#a1a1aa"
            strokeWidth={2.25}
            strokeDasharray="6 5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Đường nét liền đen - Đồ thị Răng cưa SRS (Sawtooth Curve) */}
          <path
            d={srsPath}
            fill="none"
            stroke="#18181b"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Các mốc sự kiện ôn tập & Điểm rơi tiếp theo */}
          {milestonePoints.map((mp, idx) => {
            const cx = x(mp.x);
            const cy = y(mp.withSrs);
            const isFuture = !!mp.isNextDuePoint;
            const isHovered = hoveredPoint === mp;

            return (
              <g
                key={`ms-${mp.x}-${idx}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(mp)}
              >
                {/* Đường gióng dọc tại mỗi mốc ôn tập */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={cx}
                  y2={ch}
                  stroke={isFuture ? "#52525b" : "#d4d4d8"}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />

                {/* Vòng tròn hiệu ứng cho Điểm rơi tiếp theo hoặc điểm đang hover */}
                {(isFuture || isHovered) && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={10}
                    fill="#18181b"
                    fillOpacity={0.14}
                  />
                )}

                {/* Điểm đáy trước khi bật lên 100% */}
                {mp.preReviewRetention !== undefined && (
                  <circle
                    cx={cx}
                    cy={y(mp.preReviewRetention)}
                    r={3.5}
                    fill="#ffffff"
                    stroke="#52525b"
                    strokeWidth={2}
                  />
                )}

                {/* Điểm đỉnh 100% (Review Event) hoặc Điểm rơi tiếp theo */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isFuture ? 6.5 : 5.5}
                  fill={isFuture ? "#ffffff" : "#18181b"}
                  stroke="#18181b"
                  strokeWidth={isFuture ? 3 : 2}
                />

                {/* Nhãn % và Chu kỳ Interval trên đỉnh */}
                <text
                  x={cx}
                  y={cy - 11}
                  textAnchor={isFuture ? "end" : idx === 0 ? "start" : "middle"}
                  fontSize={10}
                  fontWeight={700}
                  className="font-mono"
                  fill="#18181b"
                >
                  {isFuture
                    ? `Điểm rơi (${mp.withSrs}%)`
                    : `${mp.withSrs}% (+${mp.intervalAfter ?? 1}d)`}
                </text>

                {/* Nhãn trục X tại mốc ôn tập */}
                <text
                  x={cx}
                  y={ch + 19}
                  textAnchor={isFuture ? "end" : idx === 0 ? "start" : "middle"}
                  fontSize={10.5}
                  fontWeight={isFuture ? 700 : 600}
                  fill="#18181b"
                >
                  {mp.label}
                </text>
                <text
                  x={cx}
                  y={ch + 33}
                  textAnchor={isFuture ? "end" : idx === 0 ? "start" : "middle"}
                  fontSize={9.5}
                  className="font-mono"
                  fill="#71717a"
                >
                  {isFuture ? `Due (+${mp.dayIndex}d)` : `Ngày +${mp.dayIndex}d`}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip chi tiết cho mốc trên đồ thị răng cưa */}
      {hoveredPoint && (
        <div className="mt-2 flex justify-center animate-in fade-in duration-150">
          <div className="bg-zinc-900 text-white rounded-xl shadow-lg font-mono text-xs px-3.5 py-2 border border-zinc-800 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span className="font-bold text-white">{hoveredPoint.label}:</span>
            {hoveredPoint.isNextDuePoint ? (
              <>
                <span>
                  Dự báo chạm ngưỡng ôn tập:{" "}
                  <strong className="text-white">{hoveredPoint.withSrs}%</strong>
                </span>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-300">
                  Không ôn SRS còn: {hoveredPoint.withoutReview}%
                </span>
              </>
            ) : (
              <>
                {hoveredPoint.preReviewRetention !== undefined && (
                  <>
                    <span>
                      Trước ôn: <strong className="text-zinc-300">{hoveredPoint.preReviewRetention}%</strong> → Bật lên:{" "}
                      <strong className="text-white">{hoveredPoint.withSrs}%</strong>
                    </span>
                    <span className="text-zinc-500">·</span>
                  </>
                )}
                <span>
                  Chu kỳ mới: <strong className="text-white">{hoveredPoint.intervalAfter}d</strong>
                </span>
                <span className="text-zinc-500">·</span>
                <span>
                  EF: <strong className="text-white">{Number(hoveredPoint.efAfter ?? 2.5).toFixed(2)}</strong>
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function RetentionChartCard({
  data,
  dueCardsToday = 0,
  forecastData = [],
  reviewedCards = [],
  onNavigateTab,
}: RetentionChartProps) {
  const [activeMode, setActiveMode] = useState<"week" | "sawtooth">("week");
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [cardCurve, setCardCurve] = useState<CardCurveData | null>(null);
  const [curveLoading, setCurveLoading] = useState(false);

  // Tự động chọn thẻ đầu tiên (có lịch sử ôn dày nhất) khi danh sách reviewedCards tải xong
  useEffect(() => {
    if (reviewedCards.length > 0 && !selectedCardId) {
      setSelectedCardId(reviewedCards[0].cardId);
    } else if (
      reviewedCards.length > 0 &&
      selectedCardId &&
      !reviewedCards.some((c) => c.cardId === selectedCardId)
    ) {
      setSelectedCardId(reviewedCards[0].cardId);
    }
  }, [reviewedCards, selectedCardId]);

  useEffect(() => {
    if (activeMode !== "sawtooth" || !selectedCardId) return;
    let cancelled = false;
    setCurveLoading(true);
    srsService
      .getCardCurve(selectedCardId)
      .then((res) => {
        if (!cancelled && res?.success && res.data) {
          setCardCurve(res.data);
        }
      })
      .catch((err) => {
        console.warn("Lỗi tải đường cong thẻ:", err);
      })
      .finally(() => {
        if (!cancelled) setCurveLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeMode, selectedCardId]);

  const maxForecastCount = Math.max(1, ...forecastData.map((f) => f.count));

  return (
    <Card className="overflow-hidden border border-zinc-200/80 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <CardHeader className="bg-zinc-50/70 border-b border-zinc-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4">
        <div className="space-y-0.5">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-zinc-900">
            <Brain className="h-5 w-5 text-zinc-900 shrink-0" />
            Memory Retention Rate — This Week
          </CardTitle>
          <p className="text-xs text-zinc-500">
            {activeMode === "week"
              ? "Tỷ lệ duy trì trí nhớ thực tế 7 ngày qua so với đường cong quên lãng Ebbinghaus"
              : "Mô hình đường cong răng cưa (Sawtooth Curve) tái dựng từ lịch sử ôn tập thẻ thực tế"}
          </p>
        </div>

        {/* Segmented Control Trắng - Đen chuyển đổi 2 chế độ */}
        <div className="inline-flex items-center bg-zinc-200/70 p-1 rounded-xl border border-zinc-300/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveMode("week")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeMode === "week"
                ? "bg-zinc-900 text-white shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Tuần này (Thực tế)
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("sawtooth")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeMode === "sawtooth"
                ? "bg-zinc-900 text-white shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Đường cong SRS (Thẻ thực tế)
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {activeMode === "week" ? (
          data.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50 text-sm">
              Chưa có lịch sử ôn tập thẻ nhớ (SRS) để tính toán đường cong ghi nhớ. Hãy ôn tập bộ thẻ đầu tiên của bạn.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-6 border-t-2 border-dashed border-zinc-400" />
                    <span className="text-zinc-500">Without review (forgetting curve)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-6 h-1 rounded-full bg-zinc-900" />
                    <span className="text-zinc-900 font-semibold">With SRS review (your retention)</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">
                  Di chuột vào từng điểm ngày để xem chi tiết Đúng / Sai
                </span>
              </div>

              <div className="px-1 sm:px-2 w-full mt-1">
                <WeeklyRetentionSVG data={data} />
              </div>
            </>
          )
        ) : (
          /* TAB 2: SAWTOOTH CURVE */
          reviewedCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50 space-y-3">
              <div className="w-11 h-11 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800">
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="text-sm font-bold text-zinc-900">
                  Chưa có thẻ từ vựng nào được ôn tập từ 2 lần trở lên
                </h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Đồ thị răng cưa Ebbinghaus cần ít nhất 2 lượt ôn tập trên cùng một thẻ để trực quan hóa độ giãn chu kỳ{" "}
                  <span className="font-mono text-zinc-700">(Interval 1d → 6d → 15d)</span>.
                </p>
              </div>
              {onNavigateTab && (
                <Button
                  size="sm"
                  onClick={() => onNavigateTab("flashcards")}
                  className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl text-xs h-9 px-4 gap-1.5"
                >
                  Vào học Flashcards ngay <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Thanh chọn thẻ Dropdown Monochrome + Thông số SM-2+ của thẻ */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 bg-zinc-50/80 border border-zinc-200/80 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
                  <span className="text-xs font-semibold text-zinc-700 shrink-0 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-zinc-900" /> Chọn thẻ thực tế:
                  </span>
                  <div className="relative flex-1 max-w-md">
                    <select
                      aria-label="Chọn thẻ từ vựng để xem đường cong răng cưa"
                      value={selectedCardId}
                      onChange={(e) => setSelectedCardId(e.target.value)}
                      className="w-full appearance-none bg-white border border-zinc-300 hover:border-zinc-900 focus:border-zinc-900 focus:outline-none rounded-lg px-3 py-1.5 pr-8 text-xs font-mono font-semibold text-zinc-900 transition-colors cursor-pointer"
                    >
                      {reviewedCards.map((c) => (
                        <option key={c.cardId} value={c.cardId}>
                          {c.front} ({c.reviewsCount} lần ôn · EF {Number(c.easeFactor).toFixed(2)} · Interval {c.interval}d)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {cardCurve && (
                  <div className="inline-flex flex-wrap items-center gap-2 font-mono text-xs text-zinc-700 bg-white border border-zinc-200/90 px-3 py-1.5 rounded-lg">
                    <Activity className="w-3.5 h-3.5 text-zinc-900" />
                    <span>
                      EF: <strong className="text-zinc-900">{Number(cardCurve.easeFactor).toFixed(2)}</strong>
                    </span>
                    <span className="text-zinc-300">·</span>
                    <span>
                      Interval: <strong className="text-zinc-900">{cardCurve.interval}d</strong>
                    </span>
                    <span className="text-zinc-300">·</span>
                    <span>
                      Rep: <strong className="text-zinc-900">{cardCurve.repetitions}</strong>
                    </span>
                    <span className="text-zinc-300">·</span>
                    <span>
                      Status: <strong className="text-zinc-900">{cardCurve.status}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Chú giải đồ thị Răng cưa */}
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-5">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-6 border-t-2 border-dashed border-zinc-400" />
                    <span className="text-zinc-500">Không ôn tập (Rơi tự do từ 100% xuống &lt;20%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-6 h-1 rounded-full bg-zinc-900" />
                    <span className="text-zinc-900 font-semibold">
                      Có ôn tập SRS (Bật lại 100% & độ dốc thoải dần theo Interval)
                    </span>
                  </div>
                </div>
                {cardCurve?.back && (
                  <span className="text-xs text-zinc-500">
                    Nghĩa: <strong className="text-zinc-800">{cardCurve.back}</strong>
                  </span>
                )}
              </div>

              {curveLoading ? (
                <div className="h-[240px] flex items-center justify-center text-xs font-mono text-zinc-500">
                  Đang dựng đồ thị răng cưa từ lịch sử ôn tập...
                </div>
              ) : (
                cardCurve && (
                  <div className="px-1 sm:px-2 w-full">
                    <SawtoothCurveSVG curve={cardCurve} />
                  </div>
                )
              )}
            </div>
          )
        )}

        {/* BẢNG LỊCH TRÌNH ÔN TẬP 7 NGÀY TỚI (REVIEW FORECAST) */}
        <div className="pt-5 border-t border-zinc-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-zinc-900" />
              <h4 className="text-sm font-bold text-zinc-900">
                Lịch trình ôn tập 7 ngày tới (Review Forecast)
              </h4>
            </div>
            <div className="text-xs text-zinc-600">
              Thẻ cần ôn tập hôm nay:{" "}
              <strong className="font-bold text-zinc-900 font-mono bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">
                {dueCardsToday} cards due today
              </strong>
            </div>
          </div>

          {forecastData.length > 0 && (
            <div className="grid grid-cols-7 gap-2 sm:gap-3 pt-2 px-1">
              {forecastData.map((item) => {
                const heightPct = item.count > 0 ? Math.max(18, Math.round((item.count / maxForecastCount) * 100)) : 8;
                return (
                  <div
                    key={item.date}
                    className="group flex flex-col items-center justify-end p-2 rounded-xl border border-zinc-200/70 bg-zinc-50/50 hover:border-zinc-300 transition-all"
                  >
                    <span
                      className={`font-mono text-xs font-bold mb-1.5 ${
                        item.isToday
                          ? "text-zinc-900"
                          : item.count > 0
                            ? "text-zinc-800"
                            : "text-zinc-400"
                      }`}
                    >
                      {item.count}
                    </span>

                    <div className="w-full h-16 flex items-end justify-center px-1.5">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full max-w-[32px] rounded-t-md transition-all duration-200 ${
                          item.isToday
                            ? "bg-zinc-900"
                            : item.count > 0
                              ? "bg-zinc-300 group-hover:bg-zinc-600"
                              : "bg-zinc-200/70"
                        }`}
                      />
                    </div>

                    <div className="mt-2 text-center">
                      <div
                        className={`text-[11px] leading-tight ${
                          item.isToday ? "font-bold text-zinc-900" : "font-medium text-zinc-600"
                        }`}
                      >
                        {item.label}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                        {item.dateLabel}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
