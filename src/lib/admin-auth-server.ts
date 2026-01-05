export const requireAdminPassword = (request: Request) => {
  const required = process.env.ENJOYRECORD_ADMIN_PASSWORD?.trim();
  if (!required) {
    return {
      ok: false as const,
      status: 500,
      error: "Admin password not configured. Please set ENJOYRECORD_ADMIN_PASSWORD in your .env file."
    };
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
