/**
 * ASVS Verification Guidance Utility
 * Provides detailed, practical verification instructions, code inspection tips, 
 * and testing methods for OWASP ASVS 5.0 security controls.
 */

import { reportText, type ReportLanguage } from "./reportLanguage";

export interface VerificationGuide {
  method: "Code Review (SAST)" | "Dynamic Testing (DAST)" | "Architecture Audit" | "Configuration Check";
  keyQuestion: string;
  whatToInspect: string[];
  exampleTest: string;
  expectedEvidence: string;
  owaspReference?: string;
}

export function getVerificationGuide(req: { id: string; title: string; description: string; chapterId?: number }, language: ReportLanguage = "sk"): VerificationGuide {
  const text = (req.id + " " + req.title + " " + req.description).toLowerCase();
  const t = (sk: string, en: string) => reportText(language, sk, en);

  // 1. XPath Injection (V1.2.7)
  if (text.includes("xpath")) {
    return {
      method: "Code Review (SAST)",
      keyQuestion: t("Je používateľský vstup bezpečne parametrizovaný alebo ošetrený pred odoslaním do XPath dopytu?", "Is user input safely parameterized or sanitized before it is sent to an XPath query?"),
      whatToInspect: [
        t("Hľadajte v kóde volania typu XPath, XmlDocument.SelectNodes, Evaluate alebo XPathNavigator.", "Find XPath, XmlDocument.SelectNodes, Evaluate or XPathNavigator calls in the code."),
        t("Overte, že používateľský vstup sa neprípája priamo spájaním reťazcov (string concatenation) do XPath výrazu.", "Verify that user input is not concatenated directly into XPath expressions."),
        t("Skontrolujte použitie predkompilovaných XPath výrazov alebo bezpečné mapovanie premenných.", "Check for precompiled XPath expressions or safe variable binding.")
      ],
      exampleTest: t("Vložte do vstupného poľa reťazec ' OR '1'='1 alebo ']#xpath. Ak aplikácia vráti neosvetlené dáta alebo XML chybu, ovládací prvok nie je implementovaný.", "Enter ' OR '1'='1 or ']#xpath. Unexpected data or an XML error may indicate that the control is missing."),
      expectedEvidence: t("Ukážka zdrojového kódu s parametrizovaným XPath alebo výstup statického analyzátora (SAST) bez zistení XPath injection.", "Source code with parameterized XPath or a SAST result without XPath injection findings."),
      owaspReference: "OWASP XPath Injection Prevention Cheat Sheet"
    };
  }

  // 2. SQL Injection / Database Injection
  if (text.includes("sql") || text.includes("parameterized queries") || text.includes("nosql") || text.includes("database injection")) {
    return {
      method: "Code Review (SAST)",
      keyQuestion: t("Používajú všetky databázové dopyty ORM, prepared statements alebo parametrizované dopyty?", "Do all database queries use an ORM, prepared statements, or parameterized queries?"),
      whatToInspect: [
        t("Skontrolujte databázové dopyty v ORM (Prisma, Drizzle, Hibernate, Entity Framework, Knex).", "Inspect ORM database queries (Prisma, Drizzle, Hibernate, Entity Framework, Knex)."),
        t("Uistite sa, že sa nepoužívajú šablónové reťazce (template literals) ako `SELECT * FROM users WHERE id = ${req.query.id}`.", "Ensure template literals such as `SELECT * FROM users WHERE id = ${req.query.id}` are not used."),
        t("Pre surové SQL (raw SQL) preverte prítomnosť zástupných symbolov (?, $1, :param).", "Check raw SQL for placeholders (?, $1, :param).")
      ],
      exampleTest: t("Skúste poslať ' OR 1=1 -- v parametroch dopytu a overte, že databáza zaobchádza s hodnotou výhradne ako s reťazcom.", "Send ' OR 1=1 -- in query parameters and verify the database treats it only as a string."),
      expectedEvidence: t("Kódové súbory s ORM/prepared statements a výsledok SAST skenu bez SQLi.", "ORM or prepared-statement source code and a SAST scan without SQL injection findings."),
      owaspReference: "OWASP Query Parameterization Cheat Sheet"
    };
  }

  // 3. XSS & Output Encoding / Sanitization
  if (text.includes("xss") || text.includes("output encoding") || text.includes("escaping") || text.includes("sanitized") || text.includes("wysiwyg") || text.includes("html")) {
    return {
      method: "Dynamic Testing (DAST)",
      keyQuestion: t("Je neoverený používateľský vstup kontextovo kódovaný alebo sanitovaný pred vykreslením v prehliadači?", "Is untrusted user input contextually encoded or sanitized before browser rendering?"),
      whatToInspect: [
        t("Skontrolujte v React/Vue/Angular miesta s `dangerouslySetInnerHTML`, `v-html` alebo neotestované DOM manipulácie.", "Inspect React/Vue/Angular uses of `dangerouslySetInnerHTML`, `v-html` and untested DOM manipulation."),
        t("Pre WYSIWYG a HTML vstup preverte použitie preverenej knižnice na sanitáciu (napr. DOMPurify, sanitize-html).", "For WYSIWYG and HTML input, check for a trusted sanitization library such as DOMPurify or sanitize-html."),
        t("Overte, že kódovanie zohľadňuje HTML, atributový, JavaScript a URL kontext.", "Verify encoding accounts for HTML, attribute, JavaScript and URL contexts.")
      ],
      exampleTest: t("Testovací vektor: `<script>alert(1)</script>` alebo `<img src=x onerror=alert(1)>`. Vstup musí byť v DOM zobrazený ako neškodný text.", "Test with `<script>alert(1)</script>` or `<img src=x onerror=alert(1)>`. Input must appear in the DOM as harmless text."),
      expectedEvidence: t("Snímka obrazovky bezpečného vykreslenia a konfigurácia sanitizačnej knižnice v kóde.", "Screenshot of safe rendering and sanitization library configuration."),
      owaspReference: "OWASP Cross Site Scripting Prevention Cheat Sheet"
    };
  }

  // 4. Command Injection & Dynamic Code Execution
  if (text.includes("command injection") || text.includes("os command") || text.includes("eval()") || text.includes("exec")) {
    return {
      method: "Code Review (SAST)",
      keyQuestion: t("Je vylúčené vykonávanie OS príkazov prostredníctvom neovereného vstupu?", "Is execution of OS commands through untrusted input prevented?"),
      whatToInspect: [
        t("Vyhľadajte volania shellu: `child_process.exec()`, `system()`, `eval()`, `execScript()`, `Runtime.getRuntime().exec()`.", "Find shell calls such as `child_process.exec()`, `system()`, `eval()`, `execScript()` and `Runtime.getRuntime().exec()`."),
        t("Ak je systémové volanie nevyhnutné, uistite sa, že nepoužíva shell (`shell: false`) a argumenty sa odovzdávajú ako pole (array).", "When a system call is necessary, ensure it does not use a shell (`shell: false`) and passes arguments as an array.")
      ],
      exampleTest: t("Otestujte vstupy znakmi ako `; ls -la`, `| dir`, `$(id)`. Systém ich nesmie interpretovať ako separátory príkazov.", "Test input containing `; ls -la`, `| dir` or `$(id)`. The system must not interpret these as command separators."),
      expectedEvidence: t("Kód bez použitia `eval()` / nedôveryhodného shell príkazu.", "Code without `eval()` or untrusted shell commands."),
      owaspReference: "OWASP OS Command Injection Defense Cheat Sheet"
    };
  }

  // 5. Passwords & Credentials (V6.x)
  if (text.includes("password") || text.includes("credential") || text.includes("brute force") || text.includes("mfa")) {
    return {
      method: "Configuration Check",
      keyQuestion: t("Spĺňajú heslá a autentifikačné mechanizmy moderné štandardy odporúčané OWASP/NIST?", "Do passwords and authentication mechanisms meet current OWASP and NIST recommendations?"),
      whatToInspect: [
        t("Skontrolujte minimálnu dĺžku hesla (aspoň 8–12 znakov), povoľte špeciálne znaky a unicode bez skracovania.", "Check minimum password length (at least 8–12 characters) and allow special characters and Unicode without truncation."),
        t("Overte hešovanie pomocou Argon2id, bcrypt alebo PBKDF2 s vysokým nákladovým faktorom (cost factor).", "Verify hashing using Argon2id, bcrypt or PBKDF2 with a high cost factor."),
        t("Skontrolujte anti-automation / rate-limiting pravidlá pri prihlasovaní.", "Check login anti-automation and rate-limiting rules.")
      ],
      exampleTest: t("Pokus o prihlásenie 10x s nesprávnym heslom – overte aktiváciu captcha, lockoutu alebo spomalenia odpovede.", "Attempt ten logins with an incorrect password and verify CAPTCHA, lockout or response throttling."),
      expectedEvidence: t("Konfigurácia autentifikačnej knižnice a bezpečnostná politika hesiel.", "Authentication library configuration and password security policy."),
      owaspReference: "OWASP Authentication Cheat Sheet"
    };
  }

  // 6. Cookies & Session Management (V3.3, V7.x)
  if (text.includes("cookie") || text.includes("session") || text.includes("inactivity") || text.includes("logout")) {
    return {
      method: "Dynamic Testing (DAST)",
      keyQuestion: t("Sú relácie chránené prísnymi príznakmi cookies a vypršaním platnosti na strane servera?", "Are sessions protected by strict cookie flags and server-side expiration?"),
      whatToInspect: [
        t("Skontrolujte hlavičky `Set-Cookie`: musia obsahovať `HttpOnly`, `Secure`, `SameSite=Lax` alebo `Strict`.", "Check `Set-Cookie` headers for `HttpOnly`, `Secure` and `SameSite=Lax` or `Strict`."),
        t("Overte, že pri odhlásení dochádza k invalidácii relácie na strane servera (server-side session revocation).", "Verify that logout invalidates the session server-side."),
        t("Skontrolujte časový limit nečinnosti (inactivity timeout) a absolútny časový limit relácie.", "Check inactivity and absolute session timeouts.")
      ],
      exampleTest: t("Skontrolujte relácie v DevTools (Application -> Cookies) a skúste použiť starý session token po odhlásení.", "Inspect sessions in DevTools (Application -> Cookies) and try using an old session token after logout."),
      expectedEvidence: t("Snímka HTTP hlavičiek `Set-Cookie` a serverové vyhodnotenie exspirácie tokenu.", "Screenshot of `Set-Cookie` headers and server-side token expiry checks."),
      owaspReference: "OWASP Session Management Cheat Sheet"
    };
  }

  // 7. Authorization & Access Control (V8.x)
  if (text.includes("authorization") || text.includes("access control") || text.includes("tenant") || text.includes("role")) {
    return {
      method: "Architecture Audit",
      keyQuestion: t("Vymáha server overenie oprávnení pri každej požiadavke na chránený zdroj (deny by default)?", "Does the server enforce authorization for every request to a protected resource (deny by default)?"),
      whatToInspect: [
        t("Skontrolujte middleware pre autorizáciu na serverových API trasách.", "Inspect authorization middleware on server API routes."),
        t("Uistite sa, že ID používateľa / organizácie sa berie z overeného JWT/session tokenu a nie z modifikovateľného URL parametra (IDOR vulnerability).", "Ensure user or organization IDs come from a verified JWT or session token rather than a modifiable URL parameter (IDOR)."),
        t("Overte, že predvolený prístup je zamietnutý (deny-by-default).", "Verify access is denied by default.")
      ],
      exampleTest: t("Skúste zmeniť ID používateľa v URL/body požiadavky na ID iného používateľa (IDOR test). Ak server vráti 403 Forbidden, kontrola funguje.", "Change the user ID in the URL or request body to another user's ID (IDOR test). A 403 Forbidden response indicates the control works."),
      expectedEvidence: t("Serverový autorizačný middleware a RBAC/ABAC kód.", "Server-side authorization middleware and RBAC/ABAC code."),
      owaspReference: "OWASP Authorization Cheat Sheet"
    };
  }

  // 8. File Upload & File Handling (V5.x)
  if (text.includes("file") || text.includes("upload") || text.includes("path traversal") || text.includes("filename")) {
    return {
      method: "Code Review (SAST)",
      keyQuestion: t("Sú nahrávané súbory overované podľa typu, veľkosti a ukladané mimo spustiteľného adresára?", "Are uploaded files validated by type and size and stored outside executable directories?"),
      whatToInspect: [
        t("Skontrolujte overovanie prípon aj MIME typu (content inspection, nie len hlavička).", "Check validation of extensions and MIME types using content inspection, not just headers."),
        t("Uistite sa, že súbory sa ukladajú s vygenerovaným náhodným názvom (UUID) bez zachovania pôvodného zadaného názvu.", "Ensure files are saved under generated random names (UUIDs), not the supplied filenames."),
        t("Overte, že adresár pre súbory nemá povolené vykonávanie kódov (execution permissions disabled).", "Verify that code execution is disabled in the file storage directory.")
      ],
      exampleTest: t("Skúste nahrať súbor `.php` / `.jsp` / `.exe` premenovaný na `.png` alebo súbor s cesto `../../etc/passwd`.", "Try uploading a `.php`, `.jsp` or `.exe` file renamed to `.png`, or a file with path `../../etc/passwd`."),
      expectedEvidence: t("Kód spracovania nahraných súborov a pravidlá úložiska.", "Upload-handling code and storage rules."),
      owaspReference: "OWASP File Upload Cheat Sheet"
    };
  }

  // 9. HTTP Headers & CORS (V3.4, V3.5)
  if (text.includes("header") || text.includes("cors") || text.includes("csp") || text.includes("hsts")) {
    return {
      method: "Configuration Check",
      keyQuestion: t("Obsahuje serverové rozhranie bezpečnostné hlavičky (CSP, HSTS, X-Content-Type-Options)?", "Does the server provide security headers (CSP, HSTS, X-Content-Type-Options)?"),
      whatToInspect: [
        t("Skontrolujte HTTP odpovede na prítomnosť `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY/SAMEORIGIN`.", "Check HTTP responses for `Content-Security-Policy`, `Strict-Transport-Security` and `X-Frame-Options: DENY/SAMEORIGIN`."),
        t("Pre CORS overte, že `Access-Control-Allow-Origin` nie je nastavené na `*` pri overovaných požiadavkách.", "For CORS, verify that `Access-Control-Allow-Origin` is not set to `*` for authenticated requests.")
      ],
      exampleTest: t("Spustite bezpečnostný sken hlavičiek (napr. cez Mozilla Observatory / curl -I) a skontrolujte prítomnosť hlavičiek.", "Run a security header scan (for example Mozilla Observatory or curl -I) and check the headers."),
      expectedEvidence: t("Výpis HTTP hlavičiek serverovej odpovede.", "Server response HTTP headers."),
      owaspReference: "OWASP Secure Headers Project"
    };
  }

  // 10. OAuth & Token Security (V9.x, V10.x)
  if (text.includes("oauth") || text.includes("jwt") || text.includes("token") || text.includes("openid")) {
    return {
      method: "Architecture Audit",
      keyQuestion: t("Sú žetóny (tokens) podpísané silným algoritmom (RS256/ES256) a overované voči exspirácii a audiencii?", "Are tokens signed with a strong algorithm (RS256/ES256) and validated for expiration and audience?"),
      whatToInspect: [
        t("Skontrolujte validáciu JWT: algoritmus, podpis, exspiráciu (`exp`), vydavateľa (`iss`) a príjemcu (`aud`).", "Check JWT validation: algorithm, signature, expiration (`exp`), issuer (`iss`) and audience (`aud`)."),
        t("Uistite sa, že alg `none` je nepovolený.", "Ensure the `none` algorithm is disallowed."),
        t("Pre OAuth code flow preverte použitie PKCE (`code_verifier`).", "Check PKCE (`code_verifier`) in OAuth authorization code flow.")
      ],
      exampleTest: t("Skúste poslať token s vymazaným podpisom alebo vypršaným časom `exp`. Server ho musí zamietnuť.", "Send a token with its signature removed or an expired `exp`. The server must reject it."),
      expectedEvidence: t("Kód overovania tokenov v backendovom middleware.", "Token validation code in backend middleware."),
      owaspReference: "OWASP JSON Web Token Cheat Sheet"
    };
  }

  // 11. Generic fallback based on requirement level or chapter
  return {
    method: req.chapterId && req.chapterId <= 3 ? "Code Review (SAST)" : "Architecture Audit",
    keyQuestion: t(`Je bezpečnostná kontrola '${req.title}' zdokumentovaná, otestovaná a vynútená na úrovni kódu/architektúry?`, `Is the '${req.title}' security control documented, tested, and enforced in code or architecture?`),
    whatToInspect: [
      t("Overte architektúru a kód zodpovedný za tento bezpečnostný riadiaci prvok.", "Inspect the architecture and code responsible for this security control."),
      t("Skontrolujte, či existuje dokumentácia, konfigurácia alebo automatizovaný test pre danú funkciu.", "Check for documentation, configuration or an automated test for this feature."),
      t("Využite relevantný OWASP Cheat Sheet pre podrobný návod na implementáciu.", "Use the relevant OWASP Cheat Sheet for detailed implementation guidance.")
    ],
    exampleTest: t(`Otestujte hraničné stavy a neštandardné vstupy pre ${req.id} v testovacom prostredí.`, `Test boundary cases and unusual inputs for ${req.id} in a test environment.`),
    expectedEvidence: t("Kódová evidencia, snímka konfigurácie alebo protokol z bezpečnostného testu.", "Code evidence, a configuration screenshot or a security test report."),
    owaspReference: "OWASP ASVS Verification Guide"
  };
}
