import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Brain } from "lucide-react";
import { RetentionPoint } from "./hooks/useDashboardData";

interface RetentionChartProps {
  data: RetentionPoint[];
  dueCardsToday?: number;
}

function RetentionChartSVG({ data }: { data: RetentionPoint[] }) {
  const W = 640;
  const H = 235;
  const pl = 44;
  const pr = 24;
  const pt = 22;
  const pb = 42;
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

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-h-[280px] overflow-visible" aria-label="Memory retention chart">
      <defs>
        <linearGradient id="retentionAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#18181b" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#18181b" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      <g transform={`translate(${pl},${pt})`}>
        {/* Lưới ngang (Grid) */}
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
              fill="#71717a"
            >
              {v}%
            </text>
          </g>
        ))}

        {/* Nhãn trục X (Ngày & Số lượt ôn tập thực tế) */}
        {data.map((d, i) => (
          <g key={`${d.day}-${i}`}>
            <text
              x={x(i)}
              y={ch + 20}
              textAnchor="middle"
              fontSize={11}
              fontWeight={500}
              fill="#52525b"
            >
              {d.day}
            </text>
            <text
              x={x(i)}
              y={ch + 34}
              textAnchor="middle"
              fontSize={9.5}
              fontWeight={500}
              fill={d.reviewsCount && d.reviewsCount > 0 ? "#18181b" : "#a1a1aa"}
            >
              {d.reviewsCount && d.reviewsCount > 0 ? `${d.reviewsCount} lượt ôn` : "0 lượt ôn"}
            </text>
          </g>
        ))}

        {/* Vùng đổ bóng dưới đường SRS */}
        {areaPath && <path d={areaPath} fill="url(#retentionAreaGrad)" />}

        {/* Đường nét đứt nối các điểm - Forgetting Curve (Without Review) */}
        <path
          d={retPath}
          fill="none"
          stroke="#a1a1aa"
          strokeWidth={2.25}
          strokeDasharray="6 5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Các điểm trên đường Forgetting Curve */}
        {data.map((d, i) => (
          <circle
            key={`ret-dot-${d.day}-${i}`}
            cx={x(i)}
            cy={y(d.retention)}
            r={3.5}
            fill="#ffffff"
            stroke="#a1a1aa"
            strokeWidth={2}
          />
        ))}

        {/* Đường liền đậm nối các điểm - With SRS Review */}
        <path
          d={revPath}
          fill="none"
          stroke="#18181b"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Các điểm neo (Dots) + Nhãn % trên đường SRS Review */}
        {data.map((d, i) => (
          <g key={`dot-${d.day}-${i}`}>
            <circle
              cx={x(i)}
              cy={y(d.withReview)}
              r={5}
              fill="#ffffff"
              stroke="#18181b"
              strokeWidth={2.75}
            />
            <text
              x={x(i)}
              y={y(d.withReview) - 10}
              textAnchor="middle"
              fontSize={10}
              fontWeight={700}
              fill="#18181b"
            >
              {d.withReview}%
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export function RetentionChartCard({ data, dueCardsToday = 0 }: RetentionChartProps) {
  return (
    <Card className="overflow-hidden border border-zinc-200/80 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <CardHeader className="bg-zinc-50/70 border-b border-zinc-200/80">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-zinc-900">
          <Brain className="h-5 w-5 text-zinc-900" />
          Memory Retention Rate — This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {data.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50 text-sm">
            Chưa có lịch sử ôn tập thẻ nhớ (SRS) để tính toán đường cong ghi nhớ. Hãy ôn tập bộ thẻ đầu tiên của bạn!
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-6 mb-6 text-xs sm:text-sm justify-center sm:justify-start">
              <div className="flex items-center gap-2">
                <span className="inline-block w-6 border-t-2 border-dashed border-zinc-400" />
                <span className="text-zinc-500">Without review (forgetting curve)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-6 h-1 rounded-full bg-zinc-900" />
                <span className="text-zinc-900 font-semibold">With SRS review (your retention)</span>
              </div>
            </div>

            <div className="px-2 w-full mt-2">
              <RetentionChartSVG data={data} />
            </div>

            <div className="mt-6 p-4 bg-zinc-50 border border-zinc-200/70 rounded-xl text-center">
              <p className="text-xs sm:text-sm text-zinc-600">
                Ôn tập ngắt quãng (SRS) giúp duy trì tỷ lệ ghi nhớ từ vựng lâu dài. Đường nét đứt thể hiện tốc độ quên tự nhiên nếu không ôn tập.
                <br className="hidden sm:block mt-1" />
                Thẻ cần ôn tập hôm nay:{" "}
                <strong className="font-bold text-zinc-900 font-mono">
                  {dueCardsToday} cards due today
                </strong>
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
