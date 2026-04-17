/**
 * InsForge Client Configuration Module
 * 
 * @fileoverview Módulo de configuración del cliente InsForge para Mercedes Vitoria OPS.
 * InsForge es un Backend-as-a-Service (BaaS) similar a Supabase que proporciona:
 * - Base de datos PostgreSQL con Row Level Security (RLS)
 * - Autenticación JWT con gestión de sesiones
 * - API REST autogenerada para todas las tablas
 * - Suscripciones en tiempo real vía WebSocket
 * 
 * @description Este módulo exporta dos instancias del cliente InsForge:
 * 
 * 1. `insforge` - Cliente estándar para operaciones del lado del cliente
 *    Utiliza la clave anónima (anon key) con permisos limitados por RLS.
 *    Todas las consultas están restringidas al usuario autenticado.
 * 
 * 2. `insforgeAdmin` - Cliente con privilegios elevados para operaciones de servidor
 *    Utiliza modo servidor (isServerMode: true) que bypasea RLS.
 *    IMPORTANTE: Solo usar en contextos seguros (API routes, scripts de servidor).
 * 
 * @requires @insforge/sdk - SDK oficial de InsForge
 * @requires VITE_INSFORGE_BASE_URL - URL base del servidor InsForge (env var)
 * @requires VITE_INSFORGE_ANON_KEY - API Key pública anónima (env var)
 * 
 * @example
 * // Uso del cliente estándar (operaciones de usuario)
 * import { insforge } from "./lib/insforge.js";
 * const { data, error } = await insforge.from("inventory_items").select("*");
 * 
 * @example
 * // Uso del cliente admin (operaciones privilegiadas)
 * import { insforgeAdmin } from "./lib/insforge.js";
 * const { data } = await insforgeAdmin.from("user_profiles").update({ role: "admin" });
 * 
 * @author Mercedes Vitoria OPS Team
 * @version 1.0.0
 * @since 2024-01-15
 */

import { createClient } from "@insforge/sdk";

/* ═══════════════════════════════════════════════════════════════════════════════
   ENVIRONMENT VARIABLES VALIDATION
   
   Validación estricta de las variables de entorno requeridas para la conexión.
   El módulo lanzará un error inmediato si faltan las credenciales, evitando
   errores silenciosos en runtime que son difíciles de depurar.
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * URL base del servidor InsForge
 * 
 * @constant {string}
 * @description URL del endpoint de la instancia InsForge desplegada.
 * Formato esperado: https://base.servidor.dpdns.org
 * 
 * @throws {Error} Si la variable de entorno VITE_INSFORGE_BASE_URL no está definida
 */
const baseUrl = import.meta.env.VITE_INSFORGE_BASE_URL;

/**
 * API Key anónima de InsForge
 * 
 * @constant {string}
 * @description Token JWT firmado que identifica la aplicación cliente.
 * Esta clave es "anónima" en el sentido de que no identifica a ningún usuario
 * específico, pero permite que la aplicación se conecte al servidor.
 * 
 * SEGURIDAD: Esta clave es segura para exponer en el cliente porque:
 * 1. No otorga acceso directo a datos - RLS controla todo el acceso
 * 2. Solo permite operaciones definidas en las políticas de seguridad
 * 3. Los datos sensibles requieren autenticación adicional del usuario
 * 
 * @throws {Error} Si la variable de entorno VITE_INSFORGE_ANON_KEY no está definida
 */
const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY;

/**
 * Validación de credenciales de InsForge
 * 
 * @description Verifica que ambas variables de entorno estén presentes antes
 * de intentar crear los clientes. Este check temprano previene errores crípticos
 * de conexión que ocurrirían más tarde en el ciclo de vida de la aplicación.
 * 
 * @throws {Error} Error descriptivo indicando qué variables faltan
 */
if (!baseUrl || !anonKey) {
  throw new Error(
    "Missing InsForge environment variables. " +
    "Define VITE_INSFORGE_BASE_URL and VITE_INSFORGE_ANON_KEY in your .env file. " +
    "See README.md section 5.1 for required environment configuration."
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CLIENT INSTANCES
   
   Creación de las instancias del cliente InsForge con diferentes niveles de acceso.
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * insforge - Cliente InsForge estándar para operaciones del lado del cliente
 * 
 * @constant {InsforgeClient}
 * @description Cliente configurado para uso en componentes React y lógica de frontend.
 * Todas las operaciones están sujetas a Row Level Security (RLS).
 * 
 * Capacidades:
 * - Autenticación de usuarios (login, logout, signup, password reset)
 * - Consultas SELECT con filtros definidos por RLS
 * - Inserciones/actualizaciones/eliminaciones según políticas de usuario
 * - Suscripciones en tiempo real a cambios de datos
 * - Almacenamiento de archivos (si está habilitado en InsForge)
 * 
 * @example
 * // Consultar inventario visible para el usuario actual
 * const { data: items } = await insforge
 *   .from("inventory_items")
 *   .select("id, family, stock, zone")
 *   .eq("status", "ok");
 * 
 * @example
 * // Autenticar usuario
 * const { data, error } = await insforge.auth.signInWithPassword({
 *   email: "operario@mercedes.com",
 *   password: "securePassword123"
 * });
 */
export const insforge = createClient({
  baseUrl,      /** URL del servidor InsForge */
  anonKey,      /** API Key pública para autenticación inicial */
});

/**
 * insforgeAdmin - Cliente InsForge con privilegios de servidor
 * 
 * @constant {InsforgeClient}
 * @description Cliente configurado para operaciones administrativas que requieren
 * bypass de Row Level Security. USAR CON PRECAUCIÓN.
 * 
 * ADVERTENCIA DE SEGURIDAD:
 * Este cliente NO respeta las políticas RLS y puede acceder/modificar
 * cualquier dato en la base de datos. Solo debe usarse en:
 * - Scripts de migración de base de datos
 * - API routes del servidor (Server Components, API Routes)
 * - Tareas de mantenimiento programadas (cron jobs)
 * - Operaciones administrativas autenticadas por separado
 * 
 * NUNCA usar este cliente en:
 * - Componentes del cliente que reciben input del usuario
 * - Código que se ejecuta en el navegador sin validación adicional
 * - Cualquier contexto donde un usuario no autorizado pueda influir en la query
 * 
 * @example
 * // Actualizar rol de usuario (operación admin)
 * const { error } = await insforgeAdmin
 *   .from("user_profiles")
 *   .update({ role: "admin" })
 *   .eq("user_id", targetUserId);
 * 
 * @example
 * // Eliminar todos los logs antiguos (mantenimiento)
 * await insforgeAdmin
 *   .from("system_logs")
 *   .delete()
 *   .lt("created_at", thirtyDaysAgo);
 */
export const insforgeAdmin = createClient({
  baseUrl,           /** URL del servidor InsForge */
  anonKey,           /** API Key (requerida incluso en modo servidor) */
  isServerMode: true /** FLAG: Habilita bypass de RLS - SOLO PARA SERVIDOR */
});
