"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatearCOP } from "@/lib/format";
import type { GastoDia } from "@/types";

interface GraficoSerieTemporalProps {
  datos: GastoDia[];
}

export function GraficoSerieTemporal({ datos }: GraficoSerieTemporalProps) {
  if (datos.length === 0) {
    return null;
  }

  const datosFormateados = datos.map((d) => {
    const [, mes, dia] = d.fecha.split("-");
    return {
      ...d,
      fechaCorta: `${dia}/${mes}`,
    };
  });

  const maxValor = Math.max(...datos.map((d) => d.total_cop));
  const hoyStr = new Date().toLocaleDateString("en-CA");

  return (
    <div className="rounded-3xl bg-white border border-gray-100 p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
        Gasto por día
      </h2>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={datosFormateados}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey="fechaCorta"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              interval={datos.length > 15 ? Math.floor(datos.length / 7) : 0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
              width={40}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(99, 102, 241, 0.1)" }}
            />
            <Bar
              dataKey="total_cop"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            >
              {datosFormateados.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fecha === hoyStr ? "#6366F1" : "#C7D2FE"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: GastoDia & { fechaCorta: string } }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
      <p className="font-semibold">{formatearCOP(data.total_cop)}</p>
      <p className="text-gray-400 text-xs">{data.fechaCorta}</p>
    </div>
  );
}

export function GraficoSerieTemporalSkeleton() {
  return (
    <div className="rounded-3xl bg-white border border-gray-100 p-5 animate-pulse">
      <div className="h-4 w-28 bg-gray-200 rounded mb-4" />
      <div className="h-48 flex items-end justify-between gap-2 px-4">
        {[60, 40, 80, 30, 50, 70, 45].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-200 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
