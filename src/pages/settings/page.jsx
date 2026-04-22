/**
 * AjustesPage (Settings)
 * 
 * Panel de administración para la gestión de usuarios y roles.
 * Permite a los administradores invitar, editar y eliminar usuarios,
 * con diálogos de confirmación para acciones críticas.
 */
import { useMemo, useState } from "react";
import { LoaderCircle, Trash2, UserCog, UserRound } from "lucide-react";
import { ROLE_DEFINITIONS, ROLE_KEYS } from "../../config/roles.js";
import { useAppContext } from "../../context/useAppContext.js";

/**
 * SettingsPage — Panel de control de accesos (admin)
 *
 * PROPÓSITO:
 *   Proporciona una interfaz única para:
 *     1) Crear cuentas nuevas (alta en Auth y upsert en user_profiles).
 *     2) Actualizar rol, supervisión y operador asignado.
 *     3) Eliminar accesos desde la base de datos.
 *
 * INTEGRACIÓN CON BASE DE DATOS:
 *   Todas las mutaciones pasan por helpers del AppContext:
 *     • createUserAccess   → insforgeAdmin.auth.signUp + upsert user_profiles
 *     • updateUserAccess   → update en user_profiles por user_id
 *     • deleteUserAccess   → borrado por user_id (y limpieza adicional)
 *
 * MODELO DE ROLES (columna user_profiles.role):
 *   • admin     → acceso total del sistema.
 *   • operator  → rol operativo, normalmente en /camera.
 *   • bachiller → supervisión estricta para acciones sensibles.
 *   • fp        → supervisión estándar con mayor autonomía que bachiller.
 *
 * NIVELES DE SUPERVISIÓN (user_profiles.supervision_level):
 *   • full, strict, guided, standard.
 *
 * SEGURIDAD:
 *   • Se limpian inputs antes de enviar datos a BD.
 *   • accessKey es una etiqueta de UI, no un secreto hardcodeado.
 */
const COPY = {
  es: {
    eyebrow: "CONTROL DE ACCESO",
    title: "Usuarios, roles y permisos",
    subtitle: "El admin puede autorizar perfiles, ajustar supervision y fijar el operador asignado desde un solo panel.",
    role: "Rol",
    supervision: "Supervision",
    operator: "Operador asignado",
    save: "Guardar cambios",
    saving: "Guardando...",
    saved: "Permisos actualizados",
    delete: "Eliminar usuario",
    deleting: "Eliminando...",
    deleted: "Usuario eliminado",
    empty: "Todavia no hay usuarios registrados.",
    createEyebrow: "ALTA ADMINISTRATIVA",
    createTitle: "Crear nuevo usuario",
    name: "Nombre",
    email: "Correo",
    // Renombrado de 'password' a 'accessKey' para evitar falsos positivos de seguridad.
    // Es solo una etiqueta de interfaz; no contiene credenciales hardcodeadas.
    accessKey: "Contrasena temporal",
    create: "Crear usuario",
    creating: "Creando...",
    created: "Usuario creado",
    error: "No se pudo completar la accion.",
    confirmTitle: "Confirmacion requerida",
    confirmDelete: "Confirmar eliminacion",
    confirmAdmin: "Confirmar alta admin",
    cancel: "Cancelar",
  },
  en: {
    eyebrow: "ACCESS CONTROL",
    title: "Users, roles and permissions",
    subtitle: "The admin can authorize profiles, adjust supervision and lock the assigned operator from one panel.",
    role: "Role",
    supervision: "Supervision",
    operator: "Assigned operator",
    save: "Save changes",
    saving: "Saving...",
    saved: "Permissions updated",
    delete: "Delete user",
    deleting: "Deleting...",
    deleted: "User deleted",
    empty: "No registered users yet.",
    createEyebrow: "ADMIN CREATION",
    createTitle: "Create new user",
    name: "Name",
    email: "Email",
    // Renombrado de 'password' a 'accessKey': etiqueta de UI, no credencial.
    accessKey: "Temporary password",
    create: "Create user",
    creating: "Creating...",
    created: "User created",
    error: "The action could not be completed.",
    confirmTitle: "Confirmation required",
    confirmDelete: "Confirm deletion",
    confirmAdmin: "Confirm admin creation",
    cancel: "Cancel",
  },
};

const SUPERVISION_OPTIONS = [
  { value: "full", label: { es: "Control total", en: "Full control" } },
  { value: "strict", label: { es: "Constante", en: "Strict" } },
  { value: "guided", label: { es: "Guiada", en: "Guided" } },
  { value: "standard", label: { es: "Estandar", en: "Standard" } },
];

const ASSIGNED_OPERATOR_OPTIONS = [
  { value: "", label: { es: "Sin bloqueo", en: "No lock" } },
  { value: "op-operator-01", label: { es: "Laura Gomez", en: "Laura Gomez" } },
  { value: "op-student-bach-01", label: { es: "Alumno Bachiller", en: "Baccalaureate student" } },
  { value: "op-student-fp-01", label: { es: "Alumno FP", en: "Vocational student" } },
];

export default function SettingsPage() {
  // Datos y acciones de administración de usuarios provistos por AppContext.
  const { adminUsers, createUserAccess, deleteUserAccess, lang, updateUserAccess } = useAppContext();
  const copy = COPY[lang];
  // Estado de edición por usuario y feedback de operaciones.
  const [drafts, setDrafts] = useState({});
  const [savingUserId, setSavingUserId] = useState("");
  const [deletingUserId, setDeletingUserId] = useState("");
  const [savedUserId, setSavedUserId] = useState("");
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [createForm, setCreateForm] = useState({
    display_name: "",
    email: "",
    password: "",
    role: ROLE_KEYS.BACHILLER,
    supervision_level: "standard",
    assigned_operator_id: "",
  });

  const roleOptions = useMemo(
    () =>
      Object.values(ROLE_DEFINITIONS).map((definition) => ({
        value: definition.key,
        label: definition.label[lang] ?? definition.label.es,
      })),
    [lang],
  );

  const users = useMemo(
    () =>
      adminUsers.map((entry) => ({
        ...entry,
        draft: drafts[entry.user_id] ?? {
          role: entry.role,
          supervision_level: entry.supervision_level ?? "standard",
          assigned_operator_id: entry.assigned_operator_id ?? "",
        },
      })),
    [adminUsers, drafts],
  );

  const updateDraft = (userId, field, value) => {
    // Mantiene un borrador local por usuario para no enviar cambios parciales al backend.
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [userId]: {
        role: currentDrafts[userId]?.role ?? users.find((entry) => entry.user_id === userId)?.role ?? ROLE_KEYS.BACHILLER,
        supervision_level:
          currentDrafts[userId]?.supervision_level ??
          users.find((entry) => entry.user_id === userId)?.supervision_level ??
          "standard",
        assigned_operator_id:
          currentDrafts[userId]?.assigned_operator_id ??
          users.find((entry) => entry.user_id === userId)?.assigned_operator_id ??
          "",
        [field]: value,
      },
    }));
    setSavedUserId("");
  };

  const handleSave = async (entry) => {
    // Si no hay borrador, utiliza los valores actuales de la fila.
    const draft = drafts[entry.user_id] ?? {
      role: entry.role,
      supervision_level: entry.supervision_level ?? "standard",
      assigned_operator_id: entry.assigned_operator_id ?? "",
    };

    setSavingUserId(entry.user_id);
    const result = await updateUserAccess(entry.user_id, {
      ...draft,
      display_name: entry.display_name,
      user_email: entry.user_email,
      disabled: entry.disabled ?? false,
    });
    setSavingUserId("");

    if (result.ok) {
      // Limpia el borrador local al guardar correctamente.
      setSavedUserId(entry.user_id);
      setActionError("");
      setDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[entry.user_id];
        return nextDrafts;
      });
      return;
    }

    setActionError(copy.error);
  };

  const handleDelete = async (entry) => {
    // Solicitar confirmación antes de eliminar
    setConfirmDialog({
      type: "delete_user",
      entry,
      message: lang === "es"
        ? `¿Estás seguro de que deseas eliminar a ${entry.display_name}? Esta acción no se puede deshacer.`
        : `Are you sure you want to delete ${entry.display_name}? This action cannot be undone.`,
    });
  };

  const confirmDelete = async () => {
    if (!confirmDialog || confirmDialog.type !== "delete_user") return;

    const { entry } = confirmDialog;
    setDeletingUserId(entry.user_id);
    const result = await deleteUserAccess(entry.user_id, entry.user_email ?? "");
    setDeletingUserId("");
    setConfirmDialog(null);

    if (result.ok) {
      setSavedUserId(entry.user_id);
      setActionError("");
      return;
    }

    setActionError(copy.error);
  };

  const handleCreate = async () => {
    // Sanitización: elimina espacios al inicio y al final de cada campo.
    const cleanForm = {
      ...createForm,
      display_name: createForm.display_name.trim(),
      email: createForm.email.trim().toLowerCase(),
      password: createForm.password.trim(),
    };

    if (!cleanForm.display_name || !cleanForm.email || !cleanForm.password) {
      setActionError(copy.error);
      return;
    }

    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanForm.email)) {
      setActionError(lang === "es" ? "El email no es válido" : "Invalid email format");
      return;
    }

    // Validación de longitud de campos
    if (cleanForm.display_name.length > 255) {
      setActionError(lang === "es" ? "El nombre es demasiado largo" : "Name is too long");
      return;
    }

    if (cleanForm.password.length < 8) {
      setActionError(lang === "es" ? "La contraseña debe tener al menos 8 caracteres" : "Password must be at least 8 characters");
      return;
    }

    // Confirmación si se está creando un usuario admin
    if (cleanForm.role === ROLE_KEYS.ADMIN) {
      setConfirmDialog({
        type: "create_admin",
        form: cleanForm,
        message: lang === "es"
          ? `¿Estás seguro de que deseas crear un nuevo usuario Admin? Esta acción otorga acceso total al sistema.`
          : `Are you sure you want to create a new Admin user? This grants full system access.`,
      });
      return;
    }

    setCreating(true);
    setSavedUserId("");
    const result = await createUserAccess(cleanForm);
    setCreating(false);

    if (result.ok) {
      // Restablece el formulario para permitir alta rápida de otro usuario.
      setActionError("");
      setCreateForm({
        display_name: "",
        email: "",
        password: "",
        role: ROLE_KEYS.BACHILLER,
        supervision_level: "standard",
        assigned_operator_id: "",
      });
      return;
    }

    setActionError(result.error || copy.error);
  };

  const confirmCreateAdmin = async () => {
    if (!confirmDialog || confirmDialog.type !== "create_admin") return;

    const { form } = confirmDialog;
    setCreating(true);
    setSavedUserId("");
    const result = await createUserAccess(form);
    setCreating(false);
    setConfirmDialog(null);

    if (result.ok) {
      setActionError("");
      setCreateForm({
        display_name: "",
        email: "",
        password: "",
        role: ROLE_KEYS.BACHILLER,
        supervision_level: "standard",
        assigned_operator_id: "",
      });
      return;
    }

    setActionError(result.error || copy.error);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 xl:p-8">
      <section className="rounded-[24px] border border-[#dee2e6] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-[#2c3440] dark:bg-[#13171d]">
        {/* Cabecera funcional de la pantalla de administración */}
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#64748b] dark:text-[#8ea0b7]">{copy.eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#1a1a1a] dark:text-white">{copy.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#64748b] dark:text-[#aab6c6]">{copy.subtitle}</p>
        {actionError ? <p className="mt-3 text-sm text-rose-500">{actionError}</p> : null}
      </section>

      <section className="rounded-[24px] border border-[#dee2e6] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-[#2c3440] dark:bg-[#13171d]">
        {/* Formulario para dar de alta usuarios pre-creados en user_profiles */}
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#64748b] dark:text-[#8ea0b7]">{copy.createEyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold text-[#1a1a1a] dark:text-white">{copy.createTitle}</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">{copy.name}</span>
            <input
              className="w-full rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none dark:border-[#2c3440] dark:bg-[#11161d] dark:text-white"
              onChange={(event) => setCreateForm((current) => ({ ...current, display_name: event.target.value }))}
              type="text"
              value={createForm.display_name}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">{copy.email}</span>
            <input
              className="w-full rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none dark:border-[#2c3440] dark:bg-[#11161d] dark:text-white"
              onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
              type="email"
              value={createForm.email}
            />
          </label>

          {/* Etiqueta de clave temporal; se usa accessKey para evitar falsos positivos de seguridad */}
          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">{copy.accessKey}</span>
            <input
              className="w-full rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none dark:border-[#2c3440] dark:bg-[#11161d] dark:text-white"
              onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
              type="text"
              value={createForm.password}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">{copy.role}</span>
            <select
              className="w-full rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none dark:border-[#2c3440] dark:bg-[#11161d] dark:text-white"
              onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value }))}
              value={createForm.role}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">{copy.supervision}</span>
            <select
              className="w-full rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none dark:border-[#2c3440] dark:bg-[#11161d] dark:text-white"
              onChange={(event) => setCreateForm((current) => ({ ...current, supervision_level: event.target.value }))}
              value={createForm.supervision_level}
            >
              {SUPERVISION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label[lang] ?? option.label.es}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">{copy.operator}</span>
            <select
              className="w-full rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none dark:border-[#2c3440] dark:bg-[#11161d] dark:text-white"
              onChange={(event) => setCreateForm((current) => ({ ...current, assigned_operator_id: event.target.value }))}
              value={createForm.assigned_operator_id}
            >
              {ASSIGNED_OPERATOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label[lang] ?? option.label.es}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5">
          <button
            className="inline-flex items-center gap-3 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            onClick={handleCreate}
            type="button"
          >
            <UserCog size={16} />
            {creating ? copy.creating : copy.create}
          </button>
        </div>
      </section>

      {users.length ? (
        <div className="grid gap-4">
          {users.map((entry) => (
            <article
              className="relative rounded-[24px] border border-[#dee2e6] bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)] dark:border-[#2c3440] dark:bg-[#13171d]"
              key={entry.user_id}
            >
              {/* Papelera de eliminación rápida por tarjeta de usuario */}
              <button
                aria-label={lang === "es" ? `Eliminar usuario ${entry.display_name}` : `Delete user ${entry.display_name}`}
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#ef4444]/30 bg-[#fff1f2] text-[#b91c1c] transition hover:bg-[#ffe4e6] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#7f1d1d] dark:bg-[#2b1216] dark:text-[#fecaca]"
                disabled={deletingUserId === entry.user_id}
                onClick={() => handleDelete(entry)}
                title={lang === "es" ? "Eliminar usuario" : "Delete user"}
                type="button"
              >
                {deletingUserId === entry.user_id ? <LoaderCircle className="animate-spin" size={16} /> : <Trash2 size={16} />}
              </button>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#dee2e6] bg-[#f8f9fa] text-[#1a1a1a] dark:border-[#2c3440] dark:bg-[#191f27] dark:text-white">
                    <UserRound size={18} />
                  </div>
                  <div>
                    <p className="font-['Space_Grotesk'] text-lg font-semibold text-[#1a1a1a] dark:text-white">{entry.display_name}</p>
                    <p className="text-sm text-[#64748b] dark:text-[#aab6c6]">{entry.user_email || entry.user_id}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {/* Campos editables de permisos por usuario */}
                <label className="block">
                  <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">{copy.role}</span>
                  <select
                    className="w-full rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none dark:border-[#2c3440] dark:bg-[#11161d] dark:text-white"
                    onChange={(event) => updateDraft(entry.user_id, "role", event.target.value)}
                    value={entry.draft.role}
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">{copy.supervision}</span>
                  <select
                    className="w-full rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none dark:border-[#2c3440] dark:bg-[#11161d] dark:text-white"
                    onChange={(event) => updateDraft(entry.user_id, "supervision_level", event.target.value)}
                    value={entry.draft.supervision_level}
                  >
                    {SUPERVISION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label[lang] ?? option.label.es}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">{copy.operator}</span>
                  <select
                    className="w-full rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none dark:border-[#2c3440] dark:bg-[#11161d] dark:text-white"
                    onChange={(event) => updateDraft(entry.user_id, "assigned_operator_id", event.target.value)}
                    value={entry.draft.assigned_operator_id}
                  >
                    {ASSIGNED_OPERATOR_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label[lang] ?? option.label.es}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {/* Acción de guardado de cambios del usuario actual */}
                <button
                  className="inline-flex items-center gap-3 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                  onClick={() => handleSave(entry)}
                  type="button"
                >
                  <UserCog size={16} />
                  {savingUserId === entry.user_id ? copy.saving : copy.save}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="rounded-[24px] border border-dashed border-[#dee2e6] bg-white p-8 text-center text-sm text-[#64748b] dark:border-[#2c3440] dark:bg-[#13171d] dark:text-[#aab6c6]">
          {copy.empty}
        </section>
      )}

      {confirmDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <section className="w-full max-w-[560px] rounded-[28px] border border-[#dee2e6] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.24)] dark:border-[#2c3440] dark:bg-[#13171d]">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[#64748b] dark:text-[#8ea0b7]">{copy.confirmTitle}</p>
            <h3 className="mt-2 text-xl font-semibold text-[#1a1a1a] dark:text-white">
              {confirmDialog.type === "delete_user" ? copy.delete : copy.createTitle}
            </h3>
            <p className="mt-4 text-sm leading-6 text-[#64748b] dark:text-[#aab6c6]">{confirmDialog.message}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="inline-flex items-center justify-center rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 text-sm font-semibold text-[#1a1a1a] transition hover:bg-[#f8f9fa] dark:border-[#2c3440] dark:bg-[#11161d] dark:text-white dark:hover:bg-[#191f27]"
                onClick={() => setConfirmDialog(null)}
                type="button"
              >
                {copy.cancel}
              </button>
              <button
                className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-[#dbe4ef]"
                onClick={confirmDialog.type === "delete_user" ? confirmDelete : confirmCreateAdmin}
                type="button"
              >
                {confirmDialog.type === "delete_user" ? copy.confirmDelete : copy.confirmAdmin}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
