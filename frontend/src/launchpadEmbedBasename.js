/** @generated Launchpad — runtime router basename for /embedded/<port> and /iframe-preview/<port>. */
export function resolveLaunchpadRouterBasename() {
  if (typeof window === "undefined") return "/";
  try {
    const p = window.location.pathname;
    const embed = p.match(/^\/(embedded|iframe-preview)\/(\d{1,5})(?:\/|$)/);
    if (embed) return `/${embed[1]}/${embed[2]}`;
    const apps = p.match(/^\/apps\/[^/]+/);
    if (apps) return apps[0];
  } catch {
    /* ignore */
  }
  return "/";
}
