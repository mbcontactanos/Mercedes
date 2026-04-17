/**
 * Role Configuration Module - User Role Definitions for Mercedes Vitoria OPS
 * 
 * @fileoverview Sistema de gestión de roles y permisos para la aplicación.
 * Define los cuatro roles principales del sistema y sus capacidades asociadas.
 * 
 * @description Este módulo implementa un sistema RBAC (Role-Based Access Control)
 * que determina qué acciones puede realizar cada usuario según su rol asignado.
 * 
 * Roles del sistema:
 * 
 * 1. **ADMIN** - Administrador de escritorio
 *    - Acceso completo al dashboard de gestión
 *    - Puede aprobar/denegar solicitudes de operarios
 *    - Ve todos los streams de cámara simultáneamente
 *    - Gestiona usuarios y configuración del sistema
 * 
 * 2. **OPERATOR** - Operario de planta
 *    - Acceso móvil a la consola de cámara
 *    - Puede transmitir video al admin
 *    - Usa el asistente de voz para consultas
 *    - Solicitudes escaladas con política "guided"
 * 
 * 3. **BACHILLER** - Estudiante de Bachillerato en prácticas
 *    - Supervisión constante requerida (requiresConstantSupervision)
 *    - Política de aprobación "strict" (todas las acciones requieren validación)
 *    - Acceso limitado a funciones de consulta
 * 
 * 4. **FP** - Estudiante de Formación Profesional
 *    - Más autonomía que Bachiller pero menos que Operator
 *    - Política "standard" de aprobación
 *    - Puede usar funciones de inventario con confirmación
 * 
 * @requires None - Módulo de solo exportaciones de constantes y funciones puras
 * 
 * @example
 * import { ROLE_KEYS, getRoleLabel, normalizeRole } from "./config/roles.js";
 * 
 * const userRole = normalizeRole(profile?.role);
 * const label = getRoleLabel(userRole, "es"); // "Operario"
 * 
 * @author Mercedes Vitoria OPS Team
 * @version 1.0.0
 * @since 2024-01-15
 */

/* ═══════════════════════════════════════════════════════════════════════════════
   ROLE KEYS - Identificadores únicos de rol
   
   Constantes string que identifican cada rol en la base de datos y lógica.
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * ROLE_KEYS - Enumeración de identificadores de rol
 * 
 * @constant {Object}
 * @description Objeto de constantes que mapea nombres semánticos a strings
 * de identificador de rol. Usar estas constantes en lugar de strings literales
 * para evitar errores de tipeo y facilitar refactoring.
 * 
 * @property {string} ADMIN - "admin" - Administrador con acceso completo
 * @property {string} OPERATOR - "operator" - Operario de planta
 * @property {string} BACHILLER - "student_bachiller" - Estudiante de Bachillerato
 * @property {string} FP - "student_fp" - Estudiante de Formación Profesional
 * 
 * @example
 * // Verificar si el usuario es admin
 * if (userRole === ROLE_KEYS.ADMIN) {
 *   showAdminPanel();
 * }
 */
export const ROLE_KEYS = {
  /** Administrador de escritorio con acceso completo al sistema */
  ADMIN: "admin",
  
  /** Operario de planta con acceso a consola móvil */
  OPERATOR: "operator",
  
  /** Estudiante de Bachillerato en prácticas (supervisión máxima) */
  BACHILLER: "student_bachiller",
  
  /** Estudiante de Formación Profesional (supervisión media) */
  FP: "student_fp",
};

/* ═══════════════════════════════════════════════════════════════════════════════
   ROLE DEFINITIONS - Configuración detallada de cada rol
   
   Objeto principal que define las capacidades y restricciones de cada rol.
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * ROLE_DEFINITIONS - Mapa de definiciones completas de rol
 * 
 * @constant {Object}
 * @description Objeto que mapea cada ROLE_KEY a su configuración completa.
 * Cada definición de rol incluye:
 * 
 * @property {string} key - Identificador único del rol (mismo que la key del objeto)
 * @property {Object} label - Etiquetas localizadas {es, en}
 * @property {boolean} mobileConsole - Si accede vía interfaz móvil
 * @property {boolean} requiresConstantSupervision - Si requiere supervisión constante
 * @property {boolean} canApproveRequests - Si puede aprobar solicitudes de otros
 * @property {boolean} canBroadcastCamera - Si puede transmitir video
 * @property {boolean} canUseVoiceAssistant - Si puede usar el asistente de voz
 * @property {boolean} canChooseOperator - Si puede seleccionar operarios (reservado)
 * @property {string} approvalPolicy - Política de escalado: "full" | "guided" | "strict" | "standard"
 * @property {string} desktopDefaultRoute - Ruta por defecto al acceder
 * 
 * POLÍTICAS DE APROBACIÓN:
 * 
 * - "full": Respuesta directa del asistente, sin escalado (solo Admin)
 * - "guided": Escalado con guía, el admin ve pero el operario actúa
 * - "strict": Todo requiere aprobación previa del admin (Bachiller)
 * - "standard": Ayuda asistida con confirmación posterior (FP)
 */
export const ROLE_DEFINITIONS = {
  /**
   * ADMIN - Administrador de escritorio
   * 
   * @description Rol con máximos privilegios. Accede al dashboard completo
   * desde navegador de escritorio. Puede ver todos los streams, aprobar
   * solicitudes y gestionar el sistema.
   */
  [ROLE_KEYS.ADMIN]: {
    key: ROLE_KEYS.ADMIN,
    label: {
      es: "Admin desktop",     /** Etiqueta en español */
      en: "Desktop admin",     /** Etiqueta en inglés */
    },
    mobileConsole: false,             /** NO usa interfaz móvil */
    requiresConstantSupervision: false, /** NO requiere supervisión */
    canApproveRequests: true,         /** PUEDE aprobar solicitudes */
    canBroadcastCamera: false,        /** NO transmite video (recibe) */
    canUseVoiceAssistant: true,       /** PUEDE usar asistente de voz */
    canChooseOperator: false,         /** Reservado para futuro uso */
    approvalPolicy: "full",           /** Respuestas directas sin escalado */
    desktopDefaultRoute: "/inventory", /** Ruta inicial: inventario */
  },

  /**
   * OPERATOR - Operario de planta
   * 
   * @description Trabajador de producción con acceso móvil. Transmite video
   * desde su dispositivo, usa el asistente de voz para consultas y sus
   * solicitudes se escalan al admin con política "guided".
   */
  [ROLE_KEYS.OPERATOR]: {
    key: ROLE_KEYS.OPERATOR,
    label: {
      es: "Operario",          /** Etiqueta en español */
      en: "Operator",          /** Etiqueta en inglés */
    },
    mobileConsole: true,              /** USA interfaz móvil */
    requiresConstantSupervision: false, /** NO requiere supervisión constante */
    canApproveRequests: false,        /** NO puede aprobar solicitudes */
    canBroadcastCamera: true,         /** PUEDE transmitir video */
    canUseVoiceAssistant: true,       /** PUEDE usar asistente de voz */
    canChooseOperator: false,         /** NO puede elegir operarios */
    approvalPolicy: "guided",         /** Escalado guiado al admin */
    desktopDefaultRoute: "/camera",   /** Ruta inicial: cámara */
  },

  /**
   * BACHILLER - Estudiante de Bachillerato
   * 
   * @description Estudiante en prácticas con máxima supervisión. Todas sus
   * acciones requieren aprobación previa del admin (política "strict").
   * Útil para formación inicial y cumplimiento de protocolos de seguridad.
   */
  [ROLE_KEYS.BACHILLER]: {
    key: ROLE_KEYS.BACHILLER,
    label: {
      es: "Estudiante Bachiller",    /** Etiqueta en español */
      en: "Baccalaureate student",   /** Etiqueta en inglés */
    },
    mobileConsole: true,              /** USA interfaz móvil */
    requiresConstantSupervision: true, /** REQUIERE supervisión constante */
    canApproveRequests: false,        /** NO puede aprobar solicitudes */
    canBroadcastCamera: true,         /** PUEDE transmitir video */
    canUseVoiceAssistant: true,       /** PUEDE usar asistente de voz */
    canChooseOperator: false,         /** NO puede elegir operarios */
    approvalPolicy: "strict",         /** Todo requiere aprobación previa */
    desktopDefaultRoute: "/camera",   /** Ruta inicial: cámara */
  },

  /**
   * FP - Estudiante de Formación Profesional
   * 
   * @description Estudiante con formación técnica, más autonomía que Bachiller.
   * Política "standard" permite ayuda asistida con confirmación posterior,
   * equilibrando autonomía con supervisión adecuada.
   */
  [ROLE_KEYS.FP]: {
    key: ROLE_KEYS.FP,
    label: {
      es: "Estudiante FP",           /** Etiqueta en español */
      en: "Vocational student",      /** Etiqueta en inglés */
    },
    mobileConsole: true,              /** USA interfaz móvil */
    requiresConstantSupervision: false, /** NO requiere supervisión constante */
    canApproveRequests: false,        /** NO puede aprobar solicitudes */
    canBroadcastCamera: true,         /** PUEDE transmitir video */
    canUseVoiceAssistant: true,       /** PUEDE usar asistente de voz */
    canChooseOperator: false,         /** NO puede elegir operarios */
    approvalPolicy: "standard",       /** Ayuda asistida con confirmación */
    desktopDefaultRoute: "/camera",   /** Ruta inicial: cámara */
  },
};

/* ═══════════════════════════════════════════════════════════════════════════════
   DEFAULT ROLE - Rol por defecto para usuarios sin rol asignado
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * DEFAULT_ROLE - Rol asignado por defecto a usuarios nuevos o sin rol
 * 
 * @constant {string}
 * @description Se usa BACHILLER como default por seguridad:
 * - Máxima supervisión para usuarios no categorizados
 * - Previene acceso no autorizado a funciones sensibles
 * - Permite operación básica mientras se asigna el rol correcto
 */
export const DEFAULT_ROLE = ROLE_KEYS.BACHILLER;

/* ═══════════════════════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS - Funciones de utilidad para manejo de roles
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * normalizeRole - Normaliza y valida un string de rol
 * 
 * @function
 * @param {string|undefined|null} role - String de rol a normalizar
 * @returns {string} Rol válido (el input si existe en ROLE_DEFINITIONS, o DEFAULT_ROLE)
 * 
 * @description Función de seguridad que garantiza que siempre se retorne
 * un rol válido. Si el rol proporcionado no existe en las definiciones,
 * retorna DEFAULT_ROLE (BACHILLER) como fallback seguro.
 * 
 * @example
 * normalizeRole("admin")           // "admin"
 * normalizeRole("invalid_role")    // "student_bachiller" (DEFAULT)
 * normalizeRole(undefined)         // "student_bachiller" (DEFAULT)
 * normalizeRole(null)              // "student_bachiller" (DEFAULT)
 */
export function normalizeRole(role) {
  /** Verifica si el rol existe en las definiciones; si no, usa default */
  return ROLE_DEFINITIONS[role] ? role : DEFAULT_ROLE;
}

/**
 * getRoleLabel - Obtiene la etiqueta localizada de un rol
 * 
 * @function
 * @param {string} role - Identificador del rol
 * @param {string} [lang="es"] - Código de idioma ("es" | "en")
 * @returns {string} Etiqueta localizada del rol
 * 
 * @description Retorna la etiqueta legible para mostrar en la UI.
 * Si el idioma solicitado no existe, cae back a español.
 * 
 * @example
 * getRoleLabel("operator", "es")    // "Operario"
 * getRoleLabel("operator", "en")    // "Operator"
 * getRoleLabel("admin", "fr")       // "Admin desktop" (fallback a español)
 */
export function getRoleLabel(role, lang = "es") {
  /** Normaliza el rol para garantizar que existe en las definiciones */
  const normalizedRole = normalizeRole(role);
  
  /** Retorna la etiqueta del idioma solicitado, o español como fallback */
  return ROLE_DEFINITIONS[normalizedRole].label[lang] 
    ?? ROLE_DEFINITIONS[normalizedRole].label.es;
}
