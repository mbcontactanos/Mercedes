import { Navigate } from "react-router-dom";
import { useAppContext } from "../../context/useAppContext.js";

export default function PaginaInicio() {
  const { roleConfig } = useAppContext();

  return <Navigate replace to={roleConfig.desktopDefaultRoute} />;
}
