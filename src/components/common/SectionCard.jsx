/**
 * SectionCard Component
 * 
 * Este componente proporciona un contenedor estandarizado para las secciones de la aplicación,
 * incluyendo un encabezado con título, subtítulo y una acción opcional.
 * 
 * @param {string} title - El título principal de la sección.
 * @param {string} subtitle - Un subtítulo descriptivo opcional.
 * @param {React.ReactNode} action - Un elemento de acción (botón, etc.) que se muestra a la derecha.
 * @param {React.ReactNode} children - El contenido principal de la tarjeta.
 * @param {string} className - Clases CSS adicionales para personalizar el contenedor.
 */
export default function SectionCard({ title, subtitle, action, children, className = "" }) {
  return (
    // Contenedor principal con bordes redondeados, sombra suave y soporte para modo oscuro
    <section className={`rounded-[24px] border border-[#d7dde4] bg-[#f5f7f9] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-[#2c3440] dark:bg-[#13171d] ${className}`}>
      
      {/* Encabezado de la sección: Se adapta de columna en móvil a fila en escritorio */}
      <div className="flex flex-col gap-3 border-b border-[#d7dde4] pb-5 md:flex-row md:items-end md:justify-between dark:border-[#2c3440]">
        <div>
          {/* Etiqueta de marca fija en la parte superior */}
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#64748b] dark:text-[#8ea0b7]">Mercedes Vitoria OPS</p>
          
          {/* Título dinámico de la sección */}
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#1a1a1a] dark:text-white">{title}</h2>
          
          {/* Subtítulo dinámico con limitación de ancho para legibilidad */}
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b] dark:text-[#aab6c6]">{subtitle}</p>
        </div>
        
        {/* Renderizado condicional de la acción (si se proporciona) */}
        {action}
      </div>
      
      {/* Contenedor del contenido principal de la sección */}
      <div className="mt-6">{children}</div>
    </section>
  );
}
