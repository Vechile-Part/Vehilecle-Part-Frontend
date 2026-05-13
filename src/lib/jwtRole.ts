export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isJwtRoleClaimKey(keyLower: string): boolean {
  return keyLower === "role" || keyLower.endsWith("/claims/role") || keyLower.endsWith("/role");
}

export function roleStringImpliesStaff(role: string): boolean {
  const x = role.trim().toLowerCase();
  return x === "staff" || x === "2";
}

export function roleStringImpliesAdmin(role: string): boolean {
  const x = role.trim().toLowerCase();
  return x === "admin" || x === "1";
}

export function roleStringImpliesCustomer(role: string): boolean {
  const x = role.trim().toLowerCase();
  return x === "customer" || x === "3";
}

export function getRolesFromToken(token: string): string[] {
  const p = parseJwtPayload(token);
  if (!p) return [];
  const out: string[] = [];
  for (const k of Object.keys(p)) {
    const kl = k.toLowerCase();
    if (!isJwtRoleClaimKey(kl)) continue;
    const raw = p[k];
    if (Array.isArray(raw)) out.push(...raw.map(String));
    else if (typeof raw === "string" || typeof raw === "number") out.push(String(raw));
  }
  return out;
}

export function isStaffToken(token: string): boolean {
  return getRolesFromToken(token).some(roleStringImpliesStaff);
}

export function isAdminToken(token: string): boolean {
  return getRolesFromToken(token).some(roleStringImpliesAdmin);
}

export function isCustomerToken(token: string): boolean {
  return getRolesFromToken(token).some(roleStringImpliesCustomer);
}

/** Primary app shell persona from JWT (Admin before Staff before Customer). */
export function getShellRoleFromToken(token: string | null): "admin" | "staff" | "customer" | null {
  if (!token || !token.includes(".")) return null;
  const roles = getRolesFromToken(token);
  if (roles.some(roleStringImpliesAdmin)) return "admin";
  if (roles.some(roleStringImpliesStaff)) return "staff";
  if (roles.some(roleStringImpliesCustomer)) return "customer";
  return null;
}

export function safeInternalPath(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("..")) return fallback;
  return next;
}
