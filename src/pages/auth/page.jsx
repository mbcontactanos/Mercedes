import { useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import MercedesLogo from "../../components/common/MercedesLogo.jsx";
import { useAppContext } from "../../context/useAppContext.js";

/**
 * AuthPage Component
 * 
 * Flow:
 * - Handles user authentication via InsForge SDK.
 * - Integration: uses signIn method from useAppContext which calls InsForge.auth.signInWithPassword.
 * - Snyk: Inputs are controlled components with type-specific validation (email/password).
 */
const COPY = {
  es: {
    banner: "Inicio de sesion seguro",
    title: "Bienvenido de nuevo",
    subtitle: "Inicie sesion en Mercedes Vitoria OPS",
    helper: "Autenticacion real con InsForge y acceso controlado por el panel admin.",
    email: "Correo electronico",
    accessKey: "Contrasena",
    button: "Iniciar Sesion",
    accessOnly: "Solo acceso",
  },
  en: {
    banner: "Secure sign-in",
    title: "Welcome back",
    subtitle: "Sign in to Mercedes Vitoria OPS",
    helper: "Real authentication with InsForge and admin-controlled access.",
    email: "Email address",
    accessKey: "Password",
    button: "Sign In",
    accessOnly: "Access only",
  },
};

export default function AuthPage() {
  const navigate = useNavigate();
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
  const [formState, setFormState] = useState({
    email: "",
    password: "",
  });

  if (authReady && isAuthenticated) {
    return <Navigate replace to="/" />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Basic sanitization: trim inputs
    const cleanEmail = formState.email.trim();
    const cleanPassword = formState.password.trim();

    if (!cleanEmail || !cleanPassword) return;

    const result = await signIn({
      email: cleanEmail,
      password: cleanPassword,
    });

    if (result.ok) {
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] px-4 py-10 text-[#1a1a1a]">
      <div className="w-full max-w-[1440px] rounded-3xl border border-[#dee2e6] bg-white shadow-[0_20px_40px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-[560px] flex-col items-center gap-10 px-12 py-16">
          <MercedesLogo className="h-20 w-20" theme={theme} />

          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="inline-flex rounded-full bg-[#f8f9fa] px-4 py-2 text-xs uppercase tracking-[0.32em] text-[#6c757d]">
                {copy.banner}
              </div>
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
            <div className="mb-8 flex items-center gap-3 rounded-2xl bg-[#f8f9fa] p-4">
              <ShieldCheck className="text-[#1a1a1a]" size={18} />
              <p className="text-sm text-[#495057]">{copy.helper}</p>
            </div>
            <div className="mb-6 rounded-2xl border border-[#dee2e6] bg-[#f8f9fa] px-4 py-3 text-center text-sm font-semibold text-[#495057]">
              {copy.accessOnly}
            </div>

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
                    type="password"
                    value={formState.password}
                  />
                </div>
              </label>

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
