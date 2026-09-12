import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Brain } from "lucide-react";
import { RetentionPoint } from "./hooks/useDashboardData";

interface RetentionChartProps {
  data: RetentionPoint[];
}

function RetentionChartSVG({ data }: { data: RetentionPoint[] }) {
  const W = 560;
  const H = 200;
  const pl = 36; const pr = 16; const pt = 16; const pb = 24;
  const cw = W - pl - pr;
  const ch = H - pt - pb;

  if (data.length === 0) return null;

  const x = (i: number) => (i / (data.length - 1)) * cw;
  const y = (v: number) => ch - (v / 100) * ch;

  const retPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.retention).toFixed(1)}`).join(" ");
  const revPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.withReview).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-h-[280px]" aria-label="Memory retention chart">
      <g transform={`translate(${pl},${pt})`}>
        {/* Lưới ngang (Grid) */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={0} y1={y(v)} x2={cw} y2={y(v)} stroke="hsl(var(--border))" strokeDasharray="4 4" opacity={0.6} />
            <text x={-8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="hsl(var(--muted-foreground))">{v}%</text>
          </g>
        ))}
        {/* Nhãn trục X (Ngày) */}
        {data.map((d, i) => (
          <text key={d.day} x={x(i)} y={ch + 20} textAnchor="middle" fontSize={12} fill="hsl(var(--muted-foreground))">{d.day}</text>
        ))}
        {/* Đường mờ - Forgetting Curve */}
        <path d={retPath} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth={2.5} strokeDasharray="6 6" strokeOpacity={0.4} />
        {/* Đường đậm - With Review */}
        <path d={revPath} fill="none" stroke="hsl(var(--primary))" strokeWidth={3.5} className="drop-shadow-sm" />
        {/* Các điểm neo (Dots) */}
        {data.map((d, i) => (
          <circle key={`dot-${d.day}`} cx={x(i)} cy={y(d.withReview)} r={5} fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth={2.5} className="drop-shadow-sm" />
        ))}
      </g>
    </svg>
  );
}

export function RetentionChartCard({ data }: RetentionChartProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/20 border-b border-border/40">
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Memory Retention Rate — This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {data.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
            Not enough data to calculate retention curve yet. Complete more reviews!
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-6 mb-6 text-sm justify-center sm:justify-start">
              <div className="flex items-center gap-2">
                <div className="h-3 w-6 rounded-full bg-muted-foreground/30 border border-muted-foreground/20" />
                <span className="text-muted-foreground">Without review (forgetting curve)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-6 rounded-full bg-primary shadow-sm" />
                <span className="text-foreground font-medium">With SRS review (your retention)</span>
              </div>
            </div>
            
            <div className="px-2 w-full mt-2">
                <RetentionChartSVG data={data} />
            </div>
            
            <div className="mt-6 p-4 bg-muted/40 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">
                SRS reviews keep your retention above 90%. The dashed line shows natural forgetting without review. 
                <br className="hidden sm:block mt-1" />
                Next batch: <strong className="font-semibold text-foreground text-primary">50 cards due today</strong>
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
