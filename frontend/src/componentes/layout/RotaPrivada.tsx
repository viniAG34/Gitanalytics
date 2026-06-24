import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function RotaPrivada() {
  const estaAutenticado = useAuthStore((s) => s.estaAutenticado);

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
