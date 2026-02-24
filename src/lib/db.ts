import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  Gasto,
  Categoria,
  Presupuesto,
  PreferenciasUsuario,
  OperacionSync,
} from "@/types";

// ─── Schema de IndexedDB ──────────────────────────────────────────────────────

interface GastoLogDB extends DBSchema {
  gastos: {
    key: string;
    value: Gasto;
    indexes: {
      "by-usuario-fecha": [string, string];
      "by-usuario-categoria": [string, string];
      "by-usuario-estado": [string, string];
    };
  };
  categorias: {
    key: string;
    value: Categoria;
    indexes: {
      "by-usuario": string;
      "by-usuario-activa": [string, boolean];
    };
  };
  presupuestos: {
    key: string;
    value: Presupuesto;
    indexes: {
      "by-usuario-mes": [string, string];
      "by-usuario-categoria": [string, string];
    };
  };
  preferencias_usuario: {
    key: string;
    value: PreferenciasUsuario;
  };
  cola_sync: {
    key: string;
    value: OperacionSync;
    indexes: {
      "by-estado": string;
      "by-creada_en": string;
    };
  };
}

// ─── Singleton de la instancia de DB ─────────────────────────────────────────

const DB_NAME = "gastolog-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<GastoLogDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<GastoLogDB>> {
  if (!dbPromise) {
    dbPromise = openDB<GastoLogDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // ── Store: gastos ──────────────────────────────────────────────────
        const gastoStore = db.createObjectStore("gastos", { keyPath: "id" });
        gastoStore.createIndex("by-usuario-fecha", ["usuario_id", "fecha_hora"]);
        gastoStore.createIndex("by-usuario-categoria", [
          "usuario_id",
          "categoria_id",
        ]);
        gastoStore.createIndex("by-usuario-estado", [
          "usuario_id",
          "estado_sync",
        ]);

        // ── Store: categorias ──────────────────────────────────────────────
        const catStore = db.createObjectStore("categorias", { keyPath: "id" });
        catStore.createIndex("by-usuario", "usuario_id");
        catStore.createIndex("by-usuario-activa", ["usuario_id", "activa"]);

        // ── Store: presupuestos ────────────────────────────────────────────
        const presStore = db.createObjectStore("presupuestos", {
          keyPath: "id",
        });
        presStore.createIndex("by-usuario-mes", ["usuario_id", "mes"]);
        presStore.createIndex("by-usuario-categoria", [
          "usuario_id",
          "categoria_id",
        ]);

        // ── Store: preferencias_usuario ────────────────────────────────────
        db.createObjectStore("preferencias_usuario", {
          keyPath: "usuario_id",
        });

        // ── Store: cola_sync ───────────────────────────────────────────────
        const syncStore = db.createObjectStore("cola_sync", {
          keyPath: "id_operacion",
        });
        syncStore.createIndex("by-estado", "estado");
        syncStore.createIndex("by-creada_en", "creada_en");
      },
    });
  }
  return dbPromise;
}

// ─── Helpers de acceso tipado ─────────────────────────────────────────────────

export async function getGastoStore() {
  const db = await getDB();
  return db;
}
