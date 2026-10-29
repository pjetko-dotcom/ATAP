export function getContentSecurityPolicy(development: boolean, includeFrameAncestors = true): string {
  const directives = [
    "default-src 'self' file:",
    `script-src 'self'${development ? " 'unsafe-eval' 'unsafe-inline'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' https://generativelanguage.googleapis.com${development ? " http://localhost:3000 http://127.0.0.1:3000 ws://localhost:3000 ws://127.0.0.1:3000 ws://127.0.0.1:24678" : ""}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (includeFrameAncestors) directives.push("frame-ancestors 'none'");

  return directives.join("; ");
}
