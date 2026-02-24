import { categoriaService } from "./categoria-service";
import { preferenciasService } from "./preferencias-service";

/**
 * Inicializa todos los datos necesarios para un usuario recién registrado.
 * Es idempotente: puede llamarse más de una vez sin duplicar datos.
 *
 * Se llama desde el flujo de registro (AuthContext) tras crear la cuenta.
 */
export const inicializacionUsuarioService = {
  async inicializar(usuarioId: string): Promise<void> {
    await Promise.all([
      categoriaService.inicializarDefaults(usuarioId),
      preferenciasService.inicializar(usuarioId),
    ]);
  },
};
