import type {
  Gasto,
  Categoria,
  Periodo,
  AgregadosDashboard,
  GastoCategoria,
  GastoDia,
  DiaSemana,
} from "@/types";
import {
  calcularRango,
  toLocalDate,
  generarDiasEnRango,
  type RangoPeriodo,
} from "@/lib/periodos";

interface PreferenciasCalculo {
  zona_horaria: string;
  semana_inicia_en: DiaSemana;
}

export const dashboardService = {
  /**
   * Calcula el rango de fechas para el periodo dado.
   */
  calcularRangoPeriodo(
    periodo: Periodo,
    prefs: PreferenciasCalculo
  ): RangoPeriodo {
    return calcularRango(periodo, prefs.zona_horaria, prefs.semana_inicia_en);
  },

  /**
   * Calcula los agregados del dashboard a partir de los gastos y categorías.
   */
  calcularAgregados(
    gastos: Gasto[],
    categorias: Categoria[],
    periodo: Periodo,
    rango: RangoPeriodo,
    prefs: PreferenciasCalculo
  ): AgregadosDashboard {
    const categoriasMap = new Map<string, Categoria>();
    for (const cat of categorias) {
      categoriasMap.set(cat.id, cat);
    }

    const gastosEnRango = gastos.filter((g) => {
      if (g.eliminado_en) return false;

      const fechaGasto = new Date(g.fecha_hora);
      return fechaGasto >= rango.desde && fechaGasto <= rango.hasta;
    });

    let totalPeriodo = 0;
    let tienePendientes = false;
    const porCategoria: Record<string, number> = {};
    const porDia: Record<string, number> = {};

    for (const gasto of gastosEnRango) {
      totalPeriodo += gasto.monto_cop;

      if (gasto.estado_sync === "Pendiente") {
        tienePendientes = true;
      }

      const catId = gasto.categoria_id;
      porCategoria[catId] = (porCategoria[catId] || 0) + gasto.monto_cop;

      const fechaLocal = toLocalDate(gasto.fecha_hora, prefs.zona_horaria);
      porDia[fechaLocal] = (porDia[fechaLocal] || 0) + gasto.monto_cop;
    }

    const gastoPorCategoria: GastoCategoria[] = Object.entries(porCategoria)
      .map(([catId, total]) => {
        const cat = categoriasMap.get(catId);
        return {
          categoria_id: catId,
          categoria_nombre: cat?.nombre ?? "Sin categoría",
          categoria_color: cat?.color ?? null,
          total_cop: total,
          porcentaje:
            totalPeriodo > 0
              ? Math.round((total / totalPeriodo) * 1000) / 10
              : 0,
        };
      })
      .sort((a, b) => b.total_cop - a.total_cop);

    const gastoPorDia = this.generarSerieDias(
      porDia,
      rango,
      periodo,
      prefs.zona_horaria
    );

    return {
      periodo,
      rango: { desde: rango.desde, hasta: rango.hasta },
      total_periodo_cop: totalPeriodo,
      gasto_por_categoria: gastoPorCategoria,
      gasto_por_dia: gastoPorDia,
      tiene_pendientes: tienePendientes,
    };
  },

  /**
   * Genera la serie de días con totales, incluyendo días sin gastos.
   */
  generarSerieDias(
    gastoPorDia: Record<string, number>,
    rango: RangoPeriodo,
    periodo: Periodo,
    zonaHoraria: string
  ): GastoDia[] {
    let desde: Date;
    let hasta: Date;

    if (periodo === "Hoy" || periodo === "Semana") {
      hasta = rango.hasta;
      desde = new Date(hasta);
      desde.setDate(desde.getDate() - 6);
    } else {
      desde = rango.desde;
      hasta = rango.hasta;
    }

    const diasEnRango = generarDiasEnRango(desde, hasta);

    return diasEnRango.map((fecha) => ({
      fecha,
      total_cop: gastoPorDia[fecha] || 0,
    }));
  },

  /**
   * Formatea el rango de fechas para mostrar en el dashboard.
   */
  formatearRangoPeriodo(rango: RangoPeriodo, periodo: Periodo): string {
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "numeric",
      month: "short",
    };

    const formatoCorto: Intl.DateTimeFormatOptions = {
      day: "numeric",
    };

    if (periodo === "Hoy") {
      const fecha = rango.desde.toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      return `Hoy, ${fecha}`;
    }

    if (periodo === "Semana") {
      const desdeStr = rango.desde.toLocaleDateString("es-CO", opciones);
      const hastaStr = rango.hasta.toLocaleDateString("es-CO", opciones);
      return `${desdeStr} – ${hastaStr}`;
    }

    if (periodo === "Mes") {
      return rango.desde.toLocaleDateString("es-CO", {
        month: "long",
        year: "numeric",
      });
    }

    return "";
  },
};
