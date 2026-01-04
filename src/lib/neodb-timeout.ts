export const isNeoDBTimeout = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  if (error instanceof Error) {
    if (error.name === "AbortError") return true;
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause && typeof cause === "object") {
      const code = (cause as { code?: string }).code;
      if (code === "UND_ERR_CONNECT_TIMEOUT") return true;
    }
    if (error.message.includes("UND_ERR_CONNECT_TIMEOUT")) return true;
  }
  return false;
};
