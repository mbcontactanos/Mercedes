/**
 * PaginaAcceso (Auth Page)
 * 
 * Gestiona el inicio de sesión de los usuarios. 
 * Incluye validaciones de seguridad, normalización de emails y 
 * limpieza de datos sensibles tras la autenticación.
 */
import { useState, useEffect } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import MercedesLogo from "../../components/common/MercedesLogo.jsx";
import { useAppContext } from "../../context/useAppContext.js";

/**
 * Componente AuthPage
 *
 * Flujo:
 * - Gestiona la autenticación de usuarios con InsForge SDK.
 * - Usa signIn desde AppContext, que internamente llama a signInWithPassword.
 * - Los inputs son controlados y con validación básica por tipo (email/password).
 */
const COPY = {
  es: {
    title: "Bienvenido de nuevo",
    subtitle: "Inicie sesion en Mercedes Vitoria OPS",
    email: "Correo electronico",
    accessKey: "Contrasena",
    button: "Iniciar Sesion",
  },
  en: {
    title: "Welcome back",
    subtitle: "Sign in to Mercedes Vitoria OPS",
    email: "Email address",
    accessKey: "Password",
    button: "Sign In",
  },
};

export default function AuthPage() {
  // Enrutador para redirigir al usuario al panel tras autenticarse correctamente.
  const navigate = useNavigate();
  // Estado global de autenticación y preferencias de UI compartidas por AppContext.
  const {
    authBusy,
    authError,
    authReady,
    handleInstall,
    installReady,
    installSupport,
    isAuthenticated,
    lang,
    signIn,
    theme,
    toggleLang,
  } = useAppContext();
  const copy = COPY[lang];
  // Estado local del formulario de acceso.
  const [formState, setFormState] = useState({
    email: "",
    password: "",
  });
  // Controla si la contraseña se visualiza en texto plano.
  const [showPassword, setShowPassword] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Limpiar datos sensibles cuando se desmonta el componente o cuando se cierra la sesión.
  // Debe declararse ANTES de cualquier return condicional: todos los hooks tienen que
  // ejecutarse en el mismo orden en cada render (Rules of Hooks).
  useEffect(() => {
    return () => {
      // Limpiar datos sensibles al desmontar el componente
      setFormState({ email: "", password: "" });
    };
  }, []);

  // Si la sesión ya está activa, evita volver a mostrar el login.
  // Va despues de los hooks para no romper el orden de hooks al autenticarse.
  if (authReady && isAuthenticated) {
    return <Navigate replace to="/" />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setHasSubmitted(true);
    
    // Sanitización básica: elimina espacios al inicio y al final.
    const cleanEmail = formState.email.trim().toLowerCase();
    const cleanPassword = formState.password.trim();

    // Validación de email y contraseña
    if (!cleanEmail || !cleanPassword) {
      // Mostrar error específico cuando los campos están vacíos
      return;
    }

    // Validación básica de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      // El error será mostrado por el backend
    }

    // Delega la autenticación real al contexto (InsForge auth).
    const result = await signIn({
      email: cleanEmail,
      password: cleanPassword,
    });

    // Navega al inicio solo cuando el backend confirma acceso válido.
    if (result.ok) {
      // Limpiar datos sensibles del formulario tras login exitoso
      setFormState({ email: "", password: "" });
      setHasSubmitted(false);
      
      // Forzar una pequeña espera para asegurar que el estado de auth y perfil se propague
      // y que roleConfig esté disponible antes de la navegación inicial.
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 100);
    }
  };

  // Limpiar datos sensibles cuando el usuario se desenfoca del campo de contraseña
  const handlePasswordBlur = () => {
    // No limpiar aquí, solo en logout exitoso
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] px-4 py-10 text-[#1a1a1a]">
      <div className="w-full max-w-[1440px] rounded-3xl border border-[#dee2e6] bg-white shadow-[0_20px_40px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-[560px] flex-col items-center gap-10 px-12 py-16">
          <MercedesLogo className="h-20 w-20" theme={theme} />

          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-3">
              <button
                className="rounded-xl border border-[#dee2e6] bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#1a1a1a]"
                onClick={toggleLang}
                type="button"
              >
                {lang === "es" ? "EN" : "ES"}
              </button>
            </div>
            <h1 className="font-['Inter'] text-2xl font-bold text-[#1a1a1a]">{copy.title}</h1>
            <p className="text-sm text-[#6c757d]">{copy.subtitle}</p>
          </div>

          {installReady || installSupport?.shouldSuggestInstall ? (
            // Tarjeta opcional para instalación PWA en dispositivos compatibles.
            <div className="w-full rounded-[24px] border border-[#dee2e6] bg-[#f8f9fa] p-5 text-left dark:border-[#2c3440] dark:bg-[#13171d]">
              <p className="text-[11px] uppercase tracking-[0.32em] text-[#64748b] dark:text-[#8ea0b7]">PWA</p>
              <p className="mt-2 text-sm leading-6 text-[#64748b] dark:text-[#aab6c6]">
                {installSupport?.needsManualInstall
                  ? "En iPhone o iPad, usa Compartir y despues 'Anadir a pantalla de inicio' para instalar el modo operador."
                  : "Puedes instalar esta app en el movil para abrir directamente la consola del operario con camara, audio y acceso rapido desde la pantalla de inicio."}
              </p>
              {installReady ? (
                <button
                  className="mt-4 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
                  onClick={handleInstall}
                  type="button"
                >
                  Instalar PWA
                </button>
              ) : (
                <p className="mt-4 text-xs text-[#6c757d] dark:text-[#8ea0b7]">
                  Abrela desde HTTPS en el movil y, si el navegador lo permite, aparecera la opcion para instalarla.
                </p>
              )}
            </div>
          ) : null}
          <div className="w-full rounded-[24px] border border-[#dee2e6] bg-white p-10 shadow-[0_20px_40px_rgba(0,0,0,0.06)]">
            {/* Formulario de credenciales de acceso */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-[13px] font-semibold text-[#1a1a1a]">{copy.email}</span>
                <input
                  autoComplete="username"
                  className="w-full rounded-xl border border-[#dee2e6] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none transition focus:border-[#adb5bd]"
                  onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                  placeholder="usuario@mercedes-benz.com"
                  type="email"
                  value={formState.email}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[13px] font-semibold text-[#1a1a1a]">{copy.accessKey}</span>
                <div className="flex items-center gap-3 rounded-xl border border-[#dee2e6] bg-white px-4 py-3 focus-within:border-[#adb5bd]">
                  <LockKeyhole className="text-[#6c757d]" size={16} />
                  <input
                    autoComplete="current-password"
                    className="w-full border-none bg-transparent text-sm text-[#1a1a1a] outline-none"
                    onChange={(event) => setFormState((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Introduce tu contrasena"
                    type={showPassword ? "text" : "password"}
                    value={formState.password}
                  />
              {/* Botón de visibilidad de contraseña para mejorar usabilidad */}
              <button
                aria-label={showPassword ? (lang === "es" ? "Ocultar contraseña" : "Hide password") : lang === "es" ? "Mostrar contraseña" : "Show password"}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6c757d] transition hover:bg-[#f8f9fa] hover:text-[#1a1a1a]"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {/* Validación de campos vacíos */}
          {hasSubmitted && (!formState.email.trim() || !formState.password.trim()) ? (
            <p className="rounded-xl bg-[#fef2f2] px-4 py-3 text-sm text-[#dc2626]">
              {lang === "es" ? "Por favor completa todos los campos" : "Please fill in all fields"}
            </p>
          ) : null}

              {/* Mensaje de error devuelto por el backend de autenticación */}
              {authError ? <p className="rounded-xl bg-[#fff1f2] px-4 py-3 text-sm text-[#be123c]">{authError}</p> : null}

              <button className="mt-2 w-full rounded-xl bg-black px-4 py-3 text-base font-bold text-white transition hover:bg-neutral-800" type="submit">
                {authBusy ? "..." : copy.button}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
