/**
 * ASVS Verification Guidance Utility
 * Provides detailed, practical verification instructions, code inspection tips, 
 * and testing methods for OWASP ASVS 5.0 security controls.
 */

export interface VerificationGuide {
  method: "Code Review (SAST)" | "Dynamic Testing (DAST)" | "Architecture Audit" | "Configuration Check";
  keyQuestion: string;
  whatToInspect: string[];
  exampleTest: string;
  expectedEvidence: string;
  owaspReference?: string;
}

export function getVerificationGuide(req: { id: string; title: string; description: string; chapterId?: number }): VerificationGuide {
  const text = (req.id + " " + req.title + " " + req.description).toLowerCase();

  // 1. XPath Injection (V1.2.7)
  if (text.includes("xpath")) {
    return {
      method: "Code Review (SAST)",
      keyQuestion: "Je používateľský vstup bezpečne parametrizovaný alebo ošetrený pred odoslaním do XPath dopytu?",
      whatToInspect: [
        "Hľadajte v kóde volania typu XPath, XmlDocument.SelectNodes, Evaluate alebo XPathNavigator.",
        "Overte, že používateľský vstup sa neprípája priamo spájaním reťazcov (string concatenation) do XPath výrazu.",
        "Skontrolujte použitie predkompilovaných XPath výrazov alebo bezpečné mapovanie premenných."
      ],
      exampleTest: "Vložte do vstupného poľa reťazec ' OR '1'='1 alebo ']#xpath. Ak aplikácia vráti neosvetlené dáta alebo XML chybu, ovládací prvok nie je implementovaný.",
      expectedEvidence: "Ukážka zdrojového kódu s parametrizovaným XPath alebo výstup statického analyzátora (SAST) bez XPath injection nálezov.",
      owaspReference: "OWASP XPath Injection Prevention Cheat Sheet"
    };
  }

  // 2. SQL Injection / Database Injection
  if (text.includes("sql") || text.includes("parameterized queries") || text.includes("nosql") || text.includes("database injection")) {
    return {
      method: "Code Review (SAST)",
      keyQuestion: "Používajú všetky databázové dopyty ORM, prepared statements alebo parametrizované dopyty?",
      whatToInspect: [
        "Skontrolujte databázové dopyty v ORM (Prisma, Drizzle, Hibernate, Entity Framework, Knex).",
        "Uistite sa, že sa nepoužívajú šablónové reťazce (template literals) ako `SELECT * FROM users WHERE id = ${req.query.id}`.",
        "Pre surové SQL (raw SQL) preverte prítomnosť zástupných symbolov (?, $1, :param)."
      ],
      exampleTest: "Skúste poslať ' OR 1=1 -- v parametroch dopytu a overte, že databáza zaobchádza s hodnotou výhradne ako s reťazcom.",
      expectedEvidence: "Kódové súbory s ORM/prepared statements a výsledok SAST skenu bez SQLi.",
      owaspReference: "OWASP Query Parameterization Cheat Sheet"
    };
  }

  // 3. XSS & Output Encoding / Sanitization
  if (text.includes("xss") || text.includes("output encoding") || text.includes("escaping") || text.includes("sanitized") || text.includes("wysiwyg") || text.includes("html")) {
    return {
      method: "Dynamic Testing (DAST)",
      keyQuestion: "Je neoverený používateľský vstup kontextovo kódovaný alebo sanitovaný pred vykreslením v prehliadači?",
      whatToInspect: [
        "Skontrolujte v React/Vue/Angular miesta s `dangerouslySetInnerHTML`, `v-html` alebo neotestované DOM manipulácie.",
        "Pre WYSIWYG a HTML vstup preverte použitie preverenej knižnice na sanitáciu (napr. DOMPurify, sanitize-html).",
        "Overte, že kódovanie zohľadňuje HTML, atributový, JavaScript a URL kontext."
      ],
      exampleTest: "Testovací vektor: `<script>alert(1)</script>` alebo `<img src=x onerror=alert(1)>`. Vstup musí byť v DOM zobrazený ako neškodný text.",
      expectedEvidence: "Snímka obrazovky bezpečného vykreslenia a konfigurácia sanitizačnej knižnice v kóde.",
      owaspReference: "OWASP Cross Site Scripting Prevention Cheat Sheet"
    };
  }

  // 4. Command Injection & Dynamic Code Execution
  if (text.includes("command injection") || text.includes("os command") || text.includes("eval()") || text.includes("exec")) {
    return {
      method: "Code Review (SAST)",
      keyQuestion: "Je vylúčené vykonávanie OS príkazov prostredníctvom neovereného vstupu?",
      whatToInspect: [
        "Vyhľadajte volania shellu: `child_process.exec()`, `system()`, `eval()`, `execScript()`, `Runtime.getRuntime().exec()`.",
        "Ak je systémové volanie nevyhnutné, uistite sa, že nepoužíva shell (`shell: false`) a argumenty sa odovzdávajú ako pole (array)."
      ],
      exampleTest: "Otestujte vstupy znakmi ako `; ls -la`, `| dir`, `$(id)`. Systém ich nesmie interpretovať ako separátory príkazov.",
      expectedEvidence: "Kód bez použitia `eval()` / nedôveryhodného shell príkazu.",
      owaspReference: "OWASP OS Command Injection Defense Cheat Sheet"
    };
  }

  // 5. Passwords & Credentials (V6.x)
  if (text.includes("password") || text.includes("credential") || text.includes("brute force") || text.includes("mfa")) {
    return {
      method: "Configuration Check",
      keyQuestion: "Spĺňajú heslá a autentifikačné mechanizmy moderné štandardy odporúčané OWASP/NIST?",
      whatToInspect: [
        "Skontrolujte minimálnu dĺžku hesla (aspoň 8–12 znakov), povoľte špeciálne znaky a unicode bez skracovania.",
        "Overte hešovanie pomocou Argon2id, bcrypt alebo PBKDF2 s vysokým nákladovým faktorom (cost factor).",
        "Skontrolujte anti-automation / rate-limiting pravidlá pri prihlasovaní."
      ],
      exampleTest: "Pokus o prihlásenie 10x s nesprávnym heslom – overte aktiváciu captcha, lockoutu alebo spomalenia odpovede.",
      expectedEvidence: "Konfigurácia autentifikačnej knižnice a bezpečnostná politika hesiel.",
      owaspReference: "OWASP Authentication Cheat Sheet"
    };
  }

  // 6. Cookies & Session Management (V3.3, V7.x)
  if (text.includes("cookie") || text.includes("session") || text.includes("inactivity") || text.includes("logout")) {
    return {
      method: "Dynamic Testing (DAST)",
      keyQuestion: "Sú relácie chránené prísnymi príznakmi cookies a vypršaním platnosti na strane servera?",
      whatToInspect: [
        "Skontrolujte hlavičky `Set-Cookie`: musia obsahovať `HttpOnly`, `Secure`, `SameSite=Lax` alebo `Strict`.",
        "Overte, že pri odhlásení dochádza k invalidácii relácie na strane servera (server-side session revocation).",
        "Skontrolujte časový limit nečinnosti (inactivity timeout) a absolútny časový limit relácie."
      ],
      exampleTest: "Skontrolujte relácie v DevTools (Application -> Cookies) a skúste použiť starý session token po odhlásení.",
      expectedEvidence: "Snímka HTTP hlavičiek `Set-Cookie` a serverové vyhodnotenie exspirácie tokenu.",
      owaspReference: "OWASP Session Management Cheat Sheet"
    };
  }

  // 7. Authorization & Access Control (V8.x)
  if (text.includes("authorization") || text.includes("access control") || text.includes("tenant") || text.includes("role")) {
    return {
      method: "Architecture Audit",
      keyQuestion: "Vymáha server overenie oprávnení pri každej požiadavke na chránený zdroj (deny by default)?",
      whatToInspect: [
        "Skontrolujte middleware pre autorizáciu na serverových API trasách.",
        "Uistite sa, že ID používateľa / organizácie sa berie z overeného JWT/session tokenu a nie z modifikovateľného URL parametra (IDOR vulnerability).",
        "Overte, že predvolený prístup je zamietnutý (deny-by-default)."
      ],
      exampleTest: "Skúste zmeniť ID používateľa v URL/body požiadavky na ID iného používateľa (IDOR test). Ak server vráti 403 Forbidden, kontrola funguje.",
      expectedEvidence: "Serverový autorizačný middleware a RBAC/ABAC kód.",
      owaspReference: "OWASP Authorization Cheat Sheet"
    };
  }

  // 8. File Upload & File Handling (V5.x)
  if (text.includes("file") || text.includes("upload") || text.includes("path traversal") || text.includes("filename")) {
    return {
      method: "Code Review (SAST)",
      keyQuestion: "Sú nahrávané súbory overované podľa typu, veľkosti a ukladané mimo spustiteľného adresára?",
      whatToInspect: [
        "Skontrolujte overovanie prípon aj MIME typu (content inspection, nie len hlavička).",
        "Uistite sa, že súbory sa ukladajú s vygenerovaným náhodným názvom (UUID) bez zachovania pôvodného zadaného názvu.",
        "Overte, že adresár pre súbory nemá povolené vykonávanie kódov (execution permissions disabled)."
      ],
      exampleTest: "Skúste nahrať súbor `.php` / `.jsp` / `.exe` premenovaný na `.png` alebo súbor s cesto `../../etc/passwd`.",
      expectedEvidence: "Kód spracovania nahraných súborov a pravidlá úložiska.",
      owaspReference: "OWASP File Upload Cheat Sheet"
    };
  }

  // 9. HTTP Headers & CORS (V3.4, V3.5)
  if (text.includes("header") || text.includes("cors") || text.includes("csp") || text.includes("hsts")) {
    return {
      method: "Configuration Check",
      keyQuestion: "Obsahuje serverové rozhranie bezpečnostné hlavičky (CSP, HSTS, X-Content-Type-Options)?",
      whatToInspect: [
        "Skontrolujte HTTP odpovede na prítomnosť `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY/SAMEORIGIN`.",
        "Pre CORS overte, že `Access-Control-Allow-Origin` nie je nastavené na `*` pri overovaných požiadavkách."
      ],
      exampleTest: "Spustite bezpečnostný sken hlavičiek (napr. cez Mozilla Observatory / curl -I) a skontrolujte prítomnosť hlavičiek.",
      expectedEvidence: "Výpis HTTP hlavičiek serverovej odpovede.",
      owaspReference: "OWASP Secure Headers Project"
    };
  }

  // 10. OAuth & Token Security (V9.x, V10.x)
  if (text.includes("oauth") || text.includes("jwt") || text.includes("token") || text.includes("openid")) {
    return {
      method: "Architecture Audit",
      keyQuestion: "Sú žetóny (tokens) podpísané silným algoritmom (RS256/ES256) a overované voči exspirácii a audiencii?",
      whatToInspect: [
        "Skontrolujte validáciu JWT: algoritmus, podpis, exspiráciu (`exp`), vydavateľa (`iss`) a príjemcu (`aud`).",
        "Uistite sa, že alg `none` je nepovolený.",
        "Pre OAuth code flow preverte použitie PKCE (`code_verifier`)."
      ],
      exampleTest: "Skúste poslať token s vymazaným podpisom alebo vypršaným časom `exp`. Server ho musí zamietnuť.",
      expectedEvidence: "Kód overovania tokenov v backendovom middleware.",
      owaspReference: "OWASP JSON Web Token Cheat Sheet"
    };
  }

  // 11. Generic fallback based on requirement level or chapter
  return {
    method: req.chapterId && req.chapterId <= 3 ? "Code Review (SAST)" : "Architecture Audit",
    keyQuestion: `Je bezpečnostná kontrola '${req.title}' zdokumentovaná, otestovaná a vynútená na úrovni kódu/architektúry?`,
    whatToInspect: [
      "Overte architektúru a kód zodpovedný za tento bezpečnostný riadiaci prvok.",
      "Skontrolujte, či existuje dokumentácia, konfigurácia alebo automatizovaný test pre danú funkciu.",
      "Využite relevantný OWASP Cheat Sheet pre podrobný návod na implementáciu."
    ],
    exampleTest: `Otestujte hraničné stavy a neštandardné vstupy pre ${req.id} v testovacom prostredí.`,
    expectedEvidence: "Kódová evidencia, snímka konfigurácie alebo protokol z bezpečnostného testu.",
    owaspReference: "OWASP ASVS Verification Guide"
  };
}
