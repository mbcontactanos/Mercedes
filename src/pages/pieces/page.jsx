import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Save, Send, ShieldCheck, Trash2, X } from "lucide-react";
import { ROLE_KEYS, getRoleLabel } from "../../config/roles.js";
import { insforge } from "../../lib/insforge.js";
import { useAppContext } from "../../context/useAppContext.js";

const BUCKET_NAME = "piece-reference-images";

const COPY = {
  es: {
    subtitle: "BIBLIOTECA VISUAL",
    title: "Fotos y permisos de piezas",
    titleShort: "Nueva ficha visual",
    description:
      "Sube fotos, asigna un nombre visible y define qué roles pueden consultar la información de cada pieza desde la base de datos.",
    displayName: "Nombre visible",
    technicalPiece: "Pieza técnica asociada",
    notes: "Notas",
    photos: "Fotos",
    access: "Roles con acceso",
    create: "Crear ficha",
    creating: "Guardando...",
    noEntries: "Todavía no hay fichas visuales registradas.",
    uploadedBy: "Creado por",
    delete: "Eliminar ficha",
    saving: "Guardando...",
    save: "Guardar cambios",
    linkedPiece: "Pieza técnica",
    uploadedPhotos: "Fotos registradas",
    refreshError: "No se pudo cargar la biblioteca visual",
    createError: "No se pudo crear la ficha visual",
    updateError: "No se pudo actualizar la ficha visual",
    deleteError: "No se pudo eliminar la ficha visual",
    createSuccess: "Ficha visual guardada en base de datos",
    updateSuccess: "Ficha visual actualizada",
    deleteSuccess: "Ficha visual eliminada",
    rolesHint: "Si desmarcas un rol, ese perfil dejará de ver la información de esta pieza.",
    unlinked: "Sin pieza técnica asociada",
    emptyNotes: "Sin notas operativas.",
  },
  en: {
    subtitle: "VISUAL LIBRARY",
    title: "Piece photos and access control",
    titleShort: "New visual record",
    description:
      "Upload photos, assign a visible name, and define which roles can read each piece record from the database.",
    displayName: "Visible name",
    technicalPiece: "Linked technical piece",
    notes: "Notes",
    photos: "Photos",
    access: "Roles with access",
    create: "Create record",
    creating: "Saving...",
    noEntries: "No visual records have been created yet.",
    uploadedBy: "Created by",
    delete: "Delete record",
    saving: "Saving...",
    save: "Save changes",
    linkedPiece: "Technical piece",
    uploadedPhotos: "Stored photos",
    refreshError: "Could not load the visual library",
    createError: "Could not create the visual record",
    updateError: "Could not update the visual record",
    deleteError: "Could not delete the visual record",
    createSuccess: "Visual record saved to the database",
    updateSuccess: "Visual record updated",
    deleteSuccess: "Visual record deleted",
    rolesHint: "If you uncheck a role, that profile will stop seeing this piece information.",
    unlinked: "No linked technical piece",
    emptyNotes: "No operational notes.",
  },
};

const ROLE_OPTIONS = [
  ROLE_KEYS.ADMIN,
  ROLE_KEYS.OPERATOR,
  ROLE_KEYS.FP,
  ROLE_KEYS.BACHILLER,
];

function createEntryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `piece-media-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function sanitizeFileSegment(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "pieza";
}

const IMAGE_FILE_PATTERN = /\.(avif|bmp|gif|heic|heif|jpeg|jpg|png|svg|tif|tiff|webp)$/i;

function isImageFile(file) {
  if (!file) return false;
  if (String(file.type ?? "").startsWith("image/")) return true;
  return IMAGE_FILE_PATTERN.test(String(file.name ?? ""));
}

function PersistedPhoto({ photo }) {
  const [previewUrl, setPreviewUrl] = useState(photo?.inlineDataUrl ?? photo?.url ?? "");

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    const loadPreview = async () => {
      if (!photo?.key) {
        setPreviewUrl(photo?.inlineDataUrl ?? photo?.url ?? "");
        return;
      }

      const { data, error } = await insforge.storage.from(BUCKET_NAME).download(photo.key);

      if (error || !data || !active) {
        setPreviewUrl(photo?.inlineDataUrl ?? photo?.url ?? "");
        return;
      }

      objectUrl = URL.createObjectURL(data);
      setPreviewUrl(objectUrl);
    };

    void loadPreview();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [photo]);

  if (!previewUrl) {
    return null;
  }

  return <img alt={photo?.name ?? "piece"} className="h-28 w-full rounded-2xl object-cover" src={previewUrl} />;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}

function PieceMediaCard({
  catalog,
  copy,
  deleting,
  editing,
  entry,
  lang,
  onDelete,
  onUpdate,
}) {
  const [draftName, setDraftName] = useState(entry.display_name);
  const [draftNotes, setDraftNotes] = useState(entry.notes ?? "");
  const [draftRoles, setDraftRoles] = useState(Array.isArray(entry.access_roles) ? entry.access_roles : []);
  const linkedPiece = catalog.find((item) => item.id === entry.piece_id);

  return (
    <article className="rounded-[28px] border border-[#dee2e6] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-[#2c3440] dark:bg-[#13171d]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <input
            className="w-full rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 font-['Space_Grotesk'] text-lg font-semibold text-[#1a1a1a] outline-none dark:border-[#2c3440] dark:bg-[#11161d] dark:text-white"
            onChange={(event) => setDraftName(event.target.value)}
            value={draftName}
          />
          <p className="text-sm text-[#64748b] dark:text-[#aab6c6]">
            {copy.uploadedBy}: {entry.created_by_name || entry.created_by_user_id || "—"}
          </p>
          <p className="text-sm text-[#64748b] dark:text-[#aab6c6]">
            {copy.linkedPiece}: {linkedPiece ? `${linkedPiece.id} — ${linkedPiece.name}` : copy.unlinked}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-[#dee2e6] px-4 py-3 text-sm font-semibold text-[#1a1a1a] dark:border-[#2c3440] dark:text-white"
            disabled={editing}
            onClick={() =>
              onUpdate(entry.id, {
                display_name: draftName.trim(),
                notes: draftNotes.trim(),
                access_roles: draftRoles,
              })
            }
            type="button"
          >
            {editing ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
            {editing ? copy.saving : copy.save}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-[#7f1d1d] bg-[#2b1216] px-4 py-3 text-sm font-semibold text-[#fecaca]"
            disabled={deleting}
            onClick={() => onDelete(entry)}
            type="button"
          >
            {deleting ? <LoaderCircle className="animate-spin" size={16} /> : <Trash2 size={16} />}
            {copy.delete}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">
              {copy.notes}
            </span>
            <textarea
              className="min-h-[120px] w-full rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none dark:border-[#2c3440] dark:bg-[#11161d] dark:text-white"
              onChange={(event) => setDraftNotes(event.target.value)}
              value={draftNotes}
            />
          </label>

          <div>
            <span className="mb-3 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">
              {copy.access}
            </span>
            <div className="grid gap-3 md:grid-cols-2">
              {ROLE_OPTIONS.map((role) => {
                const selected = draftRoles.includes(role);

                return (
                  <button
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      selected
                        ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-[#dee2e6] bg-[#f8f9fa] text-[#1a1a1a] dark:border-[#2c3440] dark:bg-[#191f27] dark:text-white"
                    }`}
                    key={`${entry.id}-${role}`}
                    onClick={() =>
                      setDraftRoles((current) =>
                        current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
                      )
                    }
                    type="button"
                  >
                    {getRoleLabel(role, lang)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">
            {copy.uploadedPhotos}
          </p>
          {entry.photos?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {entry.photos.map((photo) => (
                <PersistedPhoto key={photo.key || photo.url} photo={photo} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#cfd4da] p-4 text-sm text-[#64748b] dark:border-[#3a4658] dark:text-[#aab6c6]">
              {copy.emptyNotes}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function PiecesPage() {
  const { lang, profile } = useAppContext();
  const copy = COPY[lang];
  // Referencias a inputs ocultos para abrir selector de archivos/carpeta desde UI custom.
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [catalog, setCatalog] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [editingId, setEditingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  // Formulario principal de creación de ficha visual.
  const [form, setForm] = useState({
    display_name: "",
    technical_name: "",
    piece_id: "",
    notes: "",
    access_roles: [ROLE_KEYS.ADMIN, ROLE_KEYS.OPERATOR],
  });

  const catalogOptions = useMemo(
    () => catalog.map((item) => ({ value: item.id, label: `${item.id} — ${item.name}` })),
    [catalog],
  );

  const selectedFileGroups = useMemo(() => {
    // Agrupa imágenes por carpeta origen para soportar subida masiva por pieza.
    const grouped = selectedFiles.reduce((acc, item) => {
      const key = item.folder || "__single__";
      acc[key] = acc[key] ? [...acc[key], item] : [item];
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([left], [right]) => {
        if (left === "__single__") return 1;
        if (right === "__single__") return -1;
        return left.localeCompare(right, lang);
      })
      .map(([groupKey, files]) => ({
        groupKey,
        label: groupKey === "__single__" ? (lang === "es" ? "Imágenes sueltas" : "Single images") : groupKey,
        files,
      }));
  }, [lang, selectedFiles]);

  const nextCatalogId = useMemo(() => {
    // Genera el siguiente identificador técnico tipo PIEZA-### de forma local.
    const max = catalog.reduce((acc, item) => {
      const match = String(item?.id ?? "").match(/PIEZA-(\d+)/i);
      if (!match) return acc;
      const value = Number(match[1] ?? 0);
      return Number.isFinite(value) ? Math.max(acc, value) : acc;
    }, 0);
    return `PIEZA-${String(max + 1).padStart(3, "0")}`;
  }, [catalog]);

  const loadLibrary = async () => {
    // Carga paralela de catálogo técnico y biblioteca visual persistida.
    setLoading(true);
    setStatus("");

    const [catalogResponse, entriesResponse] = await Promise.all([
      insforge.database.from("part_reference_catalog").select("*").order("id", { ascending: true }),
      insforge.database.from("piece_media_entries").select("*").order("created_at", { ascending: false }),
    ]);

    if (catalogResponse.error || entriesResponse.error) {
      setStatus(copy.refreshError);
      setLoading(false);
      return;
    }

    setCatalog(catalogResponse.data ?? []);
    setEntries(entriesResponse.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadLibrary();
  }, []);

  useEffect(() => {
    // Asegura que el input de carpeta mantenga atributos no estándar entre renderizados.
    const input = folderInputRef.current;
    if (!input) return;

    // React no siempre conserva atributos no estándar del selector de carpetas.
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
    input.setAttribute("mozdirectory", "");
    input.multiple = true;
  }, []);

  useEffect(() => {
    // Asegura que cada archivo seleccionado tenga una URL local para previsualización.
    setSelectedFiles((current) =>
      current.map((item) => {
        if (!item?.file) return item;
        if (item.previewUrl) return item;
        return { ...item, previewUrl: URL.createObjectURL(item.file) };
      }),
    );

    return () => {
      // Libera URLs de previsualización al desmontar para evitar fugas de memoria.
      setSelectedFiles((current) => {
        current.forEach((item) => {
          if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
        });
        return current;
      });
    };
  }, []);

  const getFileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;

  const getFolderLabel = (file) => {
    const relative = String(file?.webkitRelativePath ?? "");
    if (!relative) return "";
    const parts = relative.split("/").filter(Boolean);
    return parts.length > 1 ? parts[0] : "";
  };

  const sanitizeTechnicalName = (value) => String(value ?? "").trim().replace(/\s+/g, " ");

  const handleFiles = (files) => {
    // Acepta solo imágenes válidas y evita duplicar la misma selección.
    const next = Array.from(files ?? []).filter((file) => isImageFile(file));
    if (!next.length) return;
    setSelectedFiles((current) => {
      const existingKeys = new Set(current.map((item) => item.key));
      const merged = [...current];
      next.forEach((file) => {
        const key = getFileKey(file);
        if (existingKeys.has(key)) return;
        merged.push({
          key,
          file,
          folder: getFolderLabel(file),
          previewUrl: URL.createObjectURL(file),
        });
      });
      return merged;
    });
  };

  const removeSelectedFile = (keyToRemove) => {
    // Elimina una imagen de la cola de subida y libera memoria de la previsualización.
    setSelectedFiles((current) => {
      const next = current.filter((item) => item.key !== keyToRemove);
      const removed = current.find((item) => item.key === keyToRemove);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return next;
    });
  };

  const handleRoleToggle = (role) => {
    // Toggle de permisos por rol para visibilidad de la ficha visual.
    setForm((current) => ({
      ...current,
      access_roles: current.access_roles.includes(role)
        ? current.access_roles.filter((entry) => entry !== role)
        : [...current.access_roles, role],
    }));
  };

  const handleCreate = async () => {
    if (!form.display_name.trim()) {
      setStatus(copy.createError);
      return;
    }

    setSaving(true);
    setStatus("");

    const resolveOrCreateCatalogPiece = async (technicalName) => {
      // Reutiliza pieza existente por nombre técnico o crea una nueva en catálogo.
      const normalizedTechnicalName = sanitizeTechnicalName(technicalName);
      if (!normalizedTechnicalName) return "";

      const existing = catalog.find((item) => String(item?.name ?? "").toLowerCase() === normalizedTechnicalName.toLowerCase());
      if (existing?.id) return existing.id;

      const insertCatalog = await insforge.database
        .from("part_reference_catalog")
        .insert([{ id: nextCatalogId, name: normalizedTechnicalName }])
        .select()
        .maybeSingle();

      if (insertCatalog.error) {
        return "";
      }

      return String(insertCatalog.data?.id ?? nextCatalogId);
    };

    const createdByUserId = profile?.user_id ?? "";
    const createdByName = profile?.display_name ?? profile?.user_email ?? "Admin";

    const folderGroups = selectedFiles.reduce((acc, item) => {
      const folder = item.folder || "";
      const key = folder || "__single__";
      acc[key] = acc[key] ? [...acc[key], item] : [item];
      return acc;
    }, {});

    const groupKeys = Object.keys(folderGroups);
    const isFolderUpload = groupKeys.some((key) => key !== "__single__");

    const tasks = isFolderUpload
      ? groupKeys
          .filter((key) => key !== "__single__")
          .map((folderName) => ({
            technicalName: folderName,
            files: folderGroups[folderName],
          }))
      : [
          {
            technicalName: form.technical_name.trim() || form.display_name.trim(),
            files: folderGroups.__single__ ?? [],
          },
        ];

    for (const task of tasks) {
      const technicalName = sanitizeTechnicalName(task.technicalName);
      if (!technicalName) {
        continue;
      }

      const resolvedPieceId = (await resolveOrCreateCatalogPiece(technicalName)) || "";
      if (!resolvedPieceId) {
        setSaving(false);
        setStatus(copy.createError);
        return;
      }

      // Evita crear fichas duplicadas para la misma pieza técnica.
      const existingEntry = await insforge.database
        .from("piece_media_entries")
        .select("id")
        .eq("piece_id", resolvedPieceId)
        .maybeSingle();

      if (existingEntry.data?.id) {
        continue;
      }

      const entryId = createEntryId();
      const uploadedPhotos = [];

      for (const { file } of task.files) {
        // Subida a storage; si falla, conserva fallback inline para no perder evidencia visual.
        const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
        const storageFolder = sanitizeFileSegment(resolvedPieceId || technicalName);
        const key = `piece-library/${storageFolder}/${entryId}-${Date.now()}-${sanitizeFileSegment(file.name.replace(`.${extension}`, ""))}.${extension}`;
        const { data, error } = await insforge.storage.from(BUCKET_NAME).upload(key, file);

        if (error || !data) {
          const inlineDataUrl = await readFileAsDataUrl(file).catch(() => "");

          uploadedPhotos.push({
            inlineDataUrl,
            mimeType: file.type,
            name: file.name,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            url: "",
          });
          continue;
        }

        uploadedPhotos.push({
          key: data.key,
          mimeType: data.mimeType,
          name: file.name,
          size: data.size,
          uploadedAt: data.uploadedAt,
          url: data.url,
        });
      }

      const insertPayload = {
        id: entryId,
        piece_id: resolvedPieceId,
        display_name: technicalName,
        notes: form.notes.trim(),
        access_roles: form.access_roles,
        photos: uploadedPhotos,
        created_by_user_id: createdByUserId,
        created_by_name: createdByName,
      };

      const { error } = await insforge.database.from("piece_media_entries").insert(insertPayload);

      if (error) {
        setSaving(false);
        setStatus(copy.createError);
        return;
      }
    }

    setForm({
      display_name: "",
      technical_name: "",
      piece_id: "",
      notes: "",
      access_roles: [ROLE_KEYS.ADMIN, ROLE_KEYS.OPERATOR],
    });
    setSelectedFiles([]);
    setStatus(copy.createSuccess);
    setSaving(false);
    await loadLibrary();
  };

  const handleUpdate = async (entryId, nextValues) => {
    // Actualiza metadatos de una ficha existente sin recrear el registro.
    setEditingId(entryId);
    setStatus("");

    const { error } = await insforge.database
      .from("piece_media_entries")
      .update({
        display_name: nextValues.display_name,
        notes: nextValues.notes,
        access_roles: nextValues.access_roles,
      })
      .eq("id", entryId);

    setEditingId("");

    if (error) {
      setStatus(copy.updateError);
      return;
    }

    setStatus(copy.updateSuccess);
    await loadLibrary();
  };

  const handleDelete = async (entry) => {
    // Borra primero recursos de storage y luego el registro SQL.
    setDeletingId(entry.id);
    setStatus("");

    for (const photo of entry.photos ?? []) {
      if (photo?.key) {
        await insforge.storage.from(BUCKET_NAME).remove(photo.key);
      }
    }

    const { error } = await insforge.database.from("piece_media_entries").delete().eq("id", entry.id);

    setDeletingId("");

    if (error) {
      setStatus(copy.deleteError);
      return;
    }

    setStatus(copy.deleteSuccess);
    await loadLibrary();
  };

  return (
    <div className="flex h-full flex-col gap-8 p-4 md:p-8">
      <div className="space-y-2">
        <p className="font-['Space_Grotesk'] text-xs font-bold uppercase tracking-[0.3em] text-[#64748b] dark:text-[#8ea0b7]">
          {copy.subtitle}
        </p>
        <h1 className="font-['Space_Grotesk'] text-[30px] font-bold leading-[1.2] text-[#1a1a1a] dark:text-white">
          {copy.title}
        </h1>
        <p className="max-w-4xl text-sm leading-6 text-[#64748b] dark:text-[#aab6c6]">{copy.description}</p>
      </div>

      <section className="rounded-[28px] border border-[#dee2e6] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-[#2c3440] dark:bg-[#13171d]">
        {/* Bloque de creación de nueva ficha visual */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] dark:border-[#2c3440] dark:bg-[#191f27]">
            <ImagePlus size={18} />
          </div>
          <div>
            <p className="font-['Space_Grotesk'] text-lg font-semibold text-[#1a1a1a] dark:text-white">{copy.titleShort}</p>
            <p className="text-sm text-[#64748b] dark:text-[#aab6c6]">{copy.rolesHint}</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">
              {copy.displayName}
            </span>
            <input
              className="w-full rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none dark:border-[#2c3440] dark:bg-[#11161d] dark:text-white"
              onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))}
              placeholder={lang === "es" ? "Ej. Tornillo largo zona A3" : "e.g. Long screw A3 rack"}
              value={form.display_name}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">
              {copy.technicalPiece}
            </span>
            <input
              className="w-full rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none dark:border-[#2c3440] dark:bg-[#11161d] dark:text-white"
              list="piece-tech-catalog"
              onChange={(event) => setForm((current) => ({ ...current, technical_name: event.target.value, piece_id: "" }))}
              placeholder={lang === "es" ? "Escribe un nombre técnico nuevo o elige uno existente" : "Type a new technical name or pick an existing one"}
              value={form.technical_name}
            />
            <datalist id="piece-tech-catalog">
              {catalog.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.id}
                </option>
              ))}
            </datalist>
          </label>

          <label className="block xl:col-span-2">
            <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">
              {copy.notes}
            </span>
            <textarea
              className="min-h-[120px] w-full rounded-2xl border border-[#dee2e6] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none dark:border-[#2c3440] dark:bg-[#11161d] dark:text-white"
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder={lang === "es" ? "Describe la pieza, el ángulo o las advertencias de uso." : "Describe the piece, angle, or operational warnings."}
              value={form.notes}
            />
          </label>

          <div className="block xl:col-span-2">
            {/* Zona de carga custom: drag & drop + botones de selección manual */}
            <span className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">
              {copy.photos}
            </span>
            <div
              className="group cursor-pointer rounded-2xl border border-dashed border-[#cfd4da] bg-[#f8f9fa] px-4 py-8 text-center text-sm text-[#64748b] transition hover:bg-white dark:border-[#3a4658] dark:bg-[#11161d] dark:text-[#aab6c6] dark:hover:bg-[#151b22]"
              onClick={() => folderInputRef.current?.click?.()}
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleFiles(event.dataTransfer?.files);
              }}
              role="button"
              tabIndex={0}
            >
              <input
                accept="image/*"
                multiple
                onChange={(event) => {
                  handleFiles(event.target.files);
                  event.target.value = "";
                }}
                ref={fileInputRef}
                type="file"
                className="hidden"
              />
              <input
                accept="image/*"
                multiple
                onChange={(event) => {
                  handleFiles(event.target.files);
                  event.target.value = "";
                }}
                type="file"
                className="hidden"
                ref={folderInputRef}
              />
              <p className="font-semibold text-[#1a1a1a] dark:text-white">
                {lang === "es"
                  ? "Arrastra una carpeta o imágenes aquí"
                  : "Drag a folder or images here"}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  className="rounded-full border border-[#dee2e6] bg-white px-3 py-1.5 text-xs font-semibold text-[#1a1a1a] transition hover:bg-[#f3f4f6] dark:border-[#2c3440] dark:bg-[#0f141a] dark:text-white dark:hover:bg-[#191f27]"
                  onClick={(event) => {
                    event.stopPropagation();
                    fileInputRef.current?.click?.();
                  }}
                  type="button"
                >
                  {lang === "es" ? "Seleccionar imágenes" : "Pick images"}
                </button>
                <button
                  className="rounded-full border border-[#dee2e6] bg-white px-3 py-1.5 text-xs font-semibold text-[#1a1a1a] transition hover:bg-[#f3f4f6] dark:border-[#2c3440] dark:bg-[#0f141a] dark:text-white dark:hover:bg-[#191f27]"
                  onClick={(event) => {
                    event.stopPropagation();
                    folderInputRef.current?.click?.();
                  }}
                  type="button"
                >
                  {lang === "es" ? "Seleccionar carpeta" : "Pick folder"}
                </button>
              </div>
              {selectedFileGroups.length ? (
                // Previsualización de cola de subida, separada por carpeta (pieza).
                <div className="mt-5 space-y-3 text-left">
                  {selectedFileGroups.map((group) => (
                    <div className="space-y-3" key={group.groupKey}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">
                          {group.label}
                        </p>
                        <span className="text-xs text-[#64748b] dark:text-[#8ea0b7]">
                          {group.files.length} {group.files.length === 1 ? (lang === "es" ? "imagen" : "image") : (lang === "es" ? "imágenes" : "images")}
                        </span>
                      </div>
                      {group.files.map((item) => (
                        <div
                          className="flex items-center gap-4 rounded-2xl border border-[#dee2e6] bg-white p-3 dark:border-[#2c3440] dark:bg-[#0f141a]"
                          key={item.key}
                        >
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[#dee2e6] bg-[#f3f4f6] dark:border-[#2c3440] dark:bg-[#191f27]">
                            {item.previewUrl ? (
                              <img alt={item.file.name} className="h-full w-full object-cover" src={item.previewUrl} />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#1a1a1a] dark:text-white">{item.file.name}</p>
                            <p className="mt-1 text-xs text-[#64748b] dark:text-[#8ea0b7]">
                              {Math.round(item.file.size / 1024)} KB
                            </p>
                          </div>
                          <button
                            aria-label={lang === "es" ? "Quitar imagen" : "Remove image"}
                            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] text-[#1a1a1a] transition hover:bg-[#eef2f5] dark:border-[#2c3440] dark:bg-[#191f27] dark:text-white dark:hover:bg-[#222a35]"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeSelectedFile(item.key);
                            }}
                            type="button"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="xl:col-span-2">
            <span className="mb-3 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#64748b] dark:text-[#8ea0b7]">
              {copy.access}
            </span>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {ROLE_OPTIONS.map((role) => {
                const selected = form.access_roles.includes(role);

                return (
                  <button
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      selected
                        ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-[#dee2e6] bg-[#f8f9fa] text-[#1a1a1a] dark:border-[#2c3440] dark:bg-[#191f27] dark:text-white"
                    }`}
                    key={role}
                    onClick={() => handleRoleToggle(role)}
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={15} />
                      {getRoleLabel(role, lang)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            className="inline-flex items-center gap-3 rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            disabled={saving}
            onClick={handleCreate}
            type="button"
          >
            {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}
            {saving ? copy.creating : lang === "es" ? "Enviar" : "Send"}
          </button>
        </div>
      </section>

      <section className="grid gap-4">
        {/* Listado de fichas ya creadas en la base de datos */}
        {loading ? (
          <div className="rounded-[28px] border border-[#dee2e6] bg-white p-6 text-sm text-[#64748b] dark:border-[#2c3440] dark:bg-[#13171d] dark:text-[#aab6c6]">
            {copy.creating}
          </div>
        ) : null}

        {entries.map((entry) => (
          <PieceMediaCard
            catalog={catalog}
            copy={copy}
            deleting={deletingId === entry.id}
            editing={editingId === entry.id}
            entry={entry}
            key={entry.id}
            lang={lang}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        ))}
      </section>
    </div>
  );
}
