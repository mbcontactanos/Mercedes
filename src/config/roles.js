export const ROLE_KEYS = {
  ADMIN: "admin",
  OPERATOR: "operator",
  BACHILLER: "student_bachiller",
  FP: "student_fp",
};

export const ROLE_DEFINITIONS = {
  [ROLE_KEYS.ADMIN]: {
    key: ROLE_KEYS.ADMIN,
    label: {
      es: "Admin desktop",
      en: "Desktop admin",
    },
    mobileConsole: false,
    requiresConstantSupervision: false,
    canApproveRequests: true,
    canBroadcastCamera: false,
    canUseVoiceAssistant: true,
    canChooseOperator: false,
    approvalPolicy: "full",
    desktopDefaultRoute: "/inventory",
  },
  [ROLE_KEYS.OPERATOR]: {
    key: ROLE_KEYS.OPERATOR,
    label: {
      es: "Operario",
      en: "Operator",
    },
    mobileConsole: true,
    requiresConstantSupervision: false,
    canApproveRequests: false,
    canBroadcastCamera: true,
    canUseVoiceAssistant: true,
    canChooseOperator: false,
    approvalPolicy: "guided",
    desktopDefaultRoute: "/camera",
  },
  [ROLE_KEYS.BACHILLER]: {
    key: ROLE_KEYS.BACHILLER,
    label: {
      es: "Estudiante Bachiller",
      en: "Baccalaureate student",
    },
    mobileConsole: true,
    requiresConstantSupervision: true,
    canApproveRequests: false,
    canBroadcastCamera: true,
    canUseVoiceAssistant: true,
    canChooseOperator: false,
    approvalPolicy: "strict",
    desktopDefaultRoute: "/camera",
  },
  [ROLE_KEYS.FP]: {
    key: ROLE_KEYS.FP,
    label: {
      es: "Estudiante FP",
      en: "Vocational student",
    },
    mobileConsole: true,
    requiresConstantSupervision: false,
    canApproveRequests: false,
    canBroadcastCamera: true,
    canUseVoiceAssistant: true,
    canChooseOperator: false,
    approvalPolicy: "standard",
    desktopDefaultRoute: "/camera",
  },
};

export const DEFAULT_ROLE = ROLE_KEYS.BACHILLER;

export function normalizeRole(role) {
  return ROLE_DEFINITIONS[role] ? role : DEFAULT_ROLE;
}

export function getRoleLabel(role, lang = "es") {
  const normalizedRole = normalizeRole(role);
  return ROLE_DEFINITIONS[normalizedRole].label[lang] ?? ROLE_DEFINITIONS[normalizedRole].label.es;
}
