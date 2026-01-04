export const requireAdminPassword = (request: Request) => {
  const required = process.env.ENJOYRECORD_ADMIN_PASSWORD;
  if (!required) {
    return { ok: true as const };
  }

  const provided = request.headers.get("x-admin-password")?.trim();
  if (!provided) {
    return { ok: false as const, status: 401, error: "Missing admin password." };
  }

  if (provided !== required) {
    return { ok: false as const, status: 403, error: "Invalid admin password." };
  }

  return { ok: true as const };
};
