export function getContentSecurityPolicy(development: boolean): string {
  const directives = [
    "default-src 'self' file:",
    `script-src 'self'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' https://generativelanguage.googleapis.com${development ? " http://localhost:3000 ws://localhost:3000" : ""}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  return directives.join("; ");
}
