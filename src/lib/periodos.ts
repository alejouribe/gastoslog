import type { DiaSemana, Periodo } from "@/types";

// ─── Helpers de zona horaria ──────────────────────────────────────────────────

/**
 * Convierte un timestamp ISO a fecha local "YYYY-MM-DD" en la zona horaria dada.
 */
export function toLocalDate(
  isoTimestamp: string,
  zonaHoraria: string = "America/Bogota"
): string {
  try {
    const fecha = new Date(isoTimestamp);
    return fecha.toLocaleDateString("en-CA", { timeZone: zonaHoraria }); // "YYYY-MM-DD"
  } catch {
    // Fallback si la zona horaria es inválida
    return new Date(isoTimestamp).toLocaleDateString("en-CA", {
      timeZone: "America/Bogota",
    });
  }
}

/**
 * Convierte un timestamp ISO a mes "YYYY-MM" en la zona horaria del usuario.
 */
export function toYYYYMM(
  isoTimestamp: string,
  zonaHoraria: string = "America/Bogota"
): string {
  const localDate = toLocalDate(isoTimestamp, zonaHoraria);
  return localDate.slice(0, 7);
}

/**
 * Retorna el mes actual como "YYYY-MM" en la zona horaria del usuario.
 */
export function mesActual(zonaHoraria: string = "America/Bogota"): string {
  return toYYYYMM(new Date().toISOString(), zonaHoraria);
}

// ─── Inicio del día en zona horaria del usuario ───────────────────────────────

function inicioDia(
  fecha: Date,
  zonaHoraria: string
): Date {
  const localStr = fecha.toLocaleDateString("en-CA", { timeZone: zonaHoraria });
  // "2026-02-24" → construir medianoche en esa zona
  return new Date(`${localStr}T00:00:00`);
}

function finDia(fecha: Date, zonaHoraria: string): Date {
  const localStr = fecha.toLocaleDateString("en-CA", { timeZone: zonaHoraria });
  return new Date(`${localStr}T23:59:59.999`);
}

// ─── Cálculo de rangos por periodo ────────────────────────────────────────────

export interface RangoPeriodo {
  desde: Date;
  hasta: Date;
}

export function calcularRangoHoy(
  zonaHoraria: string = "America/Bogota"
): RangoPeriodo {
  const ahora = new Date();
  return {
    desde: inicioDia(ahora, zonaHoraria),
    hasta: finDia(ahora, zonaHoraria),
  };
}

export function calcularRangoSemana(
  zonaHoraria: string = "America/Bogota",
  semanaIniciaEn: DiaSemana = "Lunes"
): RangoPeriodo {
  const ahora = new Date();
  const diaSemana = ahora.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado

  // Calcular cuántos días retroceder para llegar al inicio de la semana
  const inicioSemana = semanaIniciaEn === "Lunes" ? 1 : 0;
  let diasAtras = (diaSemana - inicioSemana + 7) % 7;
  if (diasAtras === 0 && semanaIniciaEn === "Lunes" && diaSemana === 0) {
    diasAtras = 6; // domingo cuando la semana empieza en lunes
  }

  const desde = new Date(ahora);
  desde.setDate(ahora.getDate() - diasAtras);

  return {
    desde: inicioDia(desde, zonaHoraria),
    hasta: finDia(ahora, zonaHoraria),
  };
}

export function calcularRangoMes(
  zonaHoraria: string = "America/Bogota"
): RangoPeriodo {
  const ahora = new Date();
  const localStr = ahora.toLocaleDateString("en-CA", {
    timeZone: zonaHoraria,
  });
  const [anio, mes] = localStr.split("-");

  return {
    desde: new Date(`${anio}-${mes}-01T00:00:00`),
    hasta: finDia(ahora, zonaHoraria),
  };
}

/**
 * Calcula el rango para un mes específico en formato "YYYY-MM".
 */
export function calcularRangoMesEspecifico(mes: string): RangoPeriodo {
  const [anio, mesNum] = mes.split("-");
  const ultimoDia = new Date(parseInt(anio), parseInt(mesNum), 0).getDate();
  return {
    desde: new Date(`${anio}-${mesNum}-01T00:00:00`),
    hasta: new Date(`${anio}-${mesNum}-${ultimoDia}T23:59:59.999`),
  };
}

export function calcularRango(
  periodo: Periodo,
  zonaHoraria: string = "America/Bogota",
  semanaIniciaEn: DiaSemana = "Lunes"
): RangoPeriodo {
  switch (periodo) {
    case "Hoy":
      return calcularRangoHoy(zonaHoraria);
    case "Semana":
      return calcularRangoSemana(zonaHoraria, semanaIniciaEn);
    case "Mes":
      return calcularRangoMes(zonaHoraria);
  }
}

// ─── Validación de fechas para formularios ────────────────────────────────────

const MAX_DIAS_ATRAS = 30;

export function esFechaValida(isoTimestamp: string): {
  valida: boolean;
  error?: string;
} {
  const fecha = new Date(isoTimestamp);
  const ahora = new Date();

  if (fecha > ahora) {
    return { valida: false, error: "La fecha no puede ser futura." };
  }

  const diffMs = ahora.getTime() - fecha.getTime();
  const diffDias = diffMs / (1000 * 60 * 60 * 24);

  if (diffDias > MAX_DIAS_ATRAS) {
    return {
      valida: false,
      error: `Solo puedes registrar gastos de los últimos ${MAX_DIAS_ATRAS} días.`,
    };
  }

  return { valida: true };
}

/**
 * Genera todos los días en un rango como array de strings "YYYY-MM-DD".
 */
export function generarDiasEnRango(desde: Date, hasta: Date): string[] {
  const dias: string[] = [];
  const cursor = new Date(desde);
  cursor.setHours(0, 0, 0, 0);
  const fin = new Date(hasta);
  fin.setHours(23, 59, 59, 999);

  while (cursor <= fin) {
    dias.push(cursor.toLocaleDateString("en-CA"));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
}
