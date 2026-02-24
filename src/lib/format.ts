// ─── Formateo de moneda COP ────────────────────────────────────────────────────

/**
 * Formatea un número entero como moneda COP.
 * Ejemplo: 25000 → "$25.000"
 */
export function formatearCOP(monto: number): string {
  if (isNaN(monto)) return "$0";
  return (
    "$" +
    Math.trunc(monto)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}

/**
 * Parsea un string de monto COP a número entero.
 * Elimina "$", ".", espacios y convierte a entero.
 * Ejemplo: "$25.000" → 25000
 */
export function parsearMontoCOP(valor: string): number {
  const limpio = valor.replace(/[$.\s]/g, "");
  const numero = parseInt(limpio, 10);
  return isNaN(numero) ? 0 : Math.abs(numero);
}

/**
 * Formatea un número como string de monto mientras el usuario escribe.
 * Solo permite dígitos, agrega separador de miles automáticamente.
 */
export function formatearInputMonto(valor: string): string {
  const soloDigitos = valor.replace(/\D/g, "");
  if (!soloDigitos) return "";
  const numero = parseInt(soloDigitos, 10);
  return numero.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formatea un porcentaje con 1 decimal.
 * Ejemplo: 34.567 → "34.6%"
 */
export function formatearPorcentaje(valor: number): string {
  return `${Math.round(valor * 10) / 10}%`;
}

// ─── Formateo de fechas ────────────────────────────────────────────────────────

const DIAS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
const MESES_LARGO = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/**
 * Formatea una fecha ISO como fecha relativa legible.
 * Ejemplos: "hace 2 horas", "ayer", "lun 17 feb"
 */
export function formatearFechaRelativa(
  isoTimestamp: string,
  zonaHoraria: string = "America/Bogota"
): string {
  const ahora = new Date();
  const fecha = new Date(isoTimestamp);
  const diffMs = ahora.getTime() - fecha.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHoras < 24) return `hace ${diffHoras}h`;
  if (diffDias === 1) return "ayer";
  if (diffDias < 7) return `hace ${diffDias} días`;

  // Para fechas más antiguas, mostrar "lun 17 feb"
  const local = new Date(
    fecha.toLocaleString("en-US", { timeZone: zonaHoraria })
  );
  const diaSemana = DIAS[local.getDay()].slice(0, 3);
  const dia = local.getDate();
  const mes = MESES[local.getMonth()];
  return `${diaSemana} ${dia} ${mes}`;
}

/**
 * Formatea un mes "YYYY-MM" como texto legible.
 * Ejemplo: "2026-02" → "Febrero 2026"
 */
export function formatearMes(mes: string): string {
  const [anio, mesNum] = mes.split("-");
  const indice = parseInt(mesNum, 10) - 1;
  const nombreMes =
    MESES_LARGO[indice] ??
    new Date(`${anio}-${mesNum}-01`).toLocaleString("es-CO", { month: "long" });
  return `${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${anio}`;
}

/**
 * Formatea un rango de fechas para el subtítulo del dashboard.
 * Ejemplos: "Hoy, lun 24 feb" | "Lun 17 – Dom 23 feb" | "Feb 2026"
 */
export function formatearRangoPeriodo(
  desde: Date,
  hasta: Date,
  periodo: "Hoy" | "Semana" | "Mes"
): string {
  if (periodo === "Hoy") {
    const dia = DIAS[desde.getDay()].slice(0, 3);
    return `Hoy, ${dia} ${desde.getDate()} ${MESES[desde.getMonth()]}`;
  }
  if (periodo === "Mes") {
    return `${MESES_LARGO[desde.getMonth()].charAt(0).toUpperCase() + MESES_LARGO[desde.getMonth()].slice(1)} ${desde.getFullYear()}`;
  }
  // Semana
  const diaDesde = DIAS[desde.getDay()].slice(0, 3);
  const diaHasta = DIAS[hasta.getDay()].slice(0, 3);
  const mesDesde = MESES[desde.getMonth()];
  const mesHasta = MESES[hasta.getMonth()];
  if (mesDesde === mesHasta) {
    return `${diaDesde} ${desde.getDate()} – ${diaHasta} ${hasta.getDate()} ${mesHasta}`;
  }
  return `${diaDesde} ${desde.getDate()} ${mesDesde} – ${diaHasta} ${hasta.getDate()} ${mesHasta}`;
}
