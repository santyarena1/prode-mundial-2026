/** Ruta de respaldo cuando no hay historial del navegador */
export function getBackFallback(pathname: string): string {
  if (pathname === "/") return "/";

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return "/";
    if (pathname === "/admin/dashboard") return "/";
    if (pathname.startsWith("/admin/squads/")) return "/admin/squads";
    if (pathname.startsWith("/admin/participants/")) return "/admin/participants";
    return "/admin/dashboard";
  }

  const dashboardRoutes = [
    "/predictions",
    "/my-predictions",
    "/bonuses",
    "/prizes",
    "/perfil",
    "/squads",
    "/notifications",
  ];
  if (pathname === "/dashboard") return "/";
  if (dashboardRoutes.includes(pathname)) return "/dashboard";
  if (pathname.startsWith("/squads/")) return "/squads";

  return "/";
}

export function shouldShowBackButton(pathname: string): boolean {
  if (pathname === "/") return false;
  if (pathname === "/admin/login") return false;
  return true;
}

export function getBackLabel(pathname: string): string {
  if (pathname.startsWith("/admin") && pathname !== "/admin/dashboard") {
    return "Volver al panel";
  }
  if (
    ["/predictions", "/my-predictions", "/bonuses", "/prizes", "/perfil", "/squads", "/notifications"].includes(pathname)
  ) {
    return "Volver al panel";
  }
  if (pathname.startsWith("/squads/")) return "Volver a grupos";
  if (pathname === "/dashboard") return "Volver al inicio";
  return "Volver";
}
