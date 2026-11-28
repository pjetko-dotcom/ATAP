# AVERT - Application Security Assessment Platform

A professional, enterprise-grade application for conducting automated threat analysis, tracking security requirements, and modeling architecture using standard industry methodologies (**OWASP ASVS 5.0** and **Microsoft STRIDE**).

**AVERT** stands for **Application Security Assessment Platform**. It brings architecture modeling, STRIDE threat analysis, risk assessment, OWASP ASVS verification, findings, reports, and backups into one workspace.

Aplikácia je navrhnutá pre duálne nasadenie: ako **moderná webová full-stack aplikácia**, tak aj ako **100% offline desktopová aplikácia pre Windows (Electron)**.

---

## 📚 Kompletná Dokumentácia a Sprievodcovia

V aplikácii otvorte **Pomoc a dokumentácia** v ľavom menu. Dvojjazyčná príručka funguje aj offline, obsahuje rozbaľovacie témy a odkazy medzi nimi a vysvetľuje celý postup od kontextu cez STRIDE, riziká a ASVS až po export. Pri otvorenom projekte ponúka aj odkazy späť do jeho sekcií. Názvy 17 kapitol ASVS zostávajú v angličtine.

Open **Help & Documentation** in the left navigation for the offline-capable Slovak/English guide. Its expandable, cross-linked topics cover the complete assessment workflow, including all 17 ASVS chapters. When opened from a project, it links back to that project's sections.

V repozitári sú pripravené podrobné sprievodcovské dokumenty:

* **[🖥️ Návod na Build Electron aplikácie pre Windows 11 (BUILD_ELECTRON.md)](./BUILD_ELECTRON.md)**:
  * Podrobný postup krok za krokom pre Windows 11 (predpoklady, Node.js, `npm run electron:build`).
  * Generovanie NSIS inštalátora (`Setup.exe`) a samostatnej prenosnej verzie (`Portable.exe`).
  * Riešenie varovaní Windows SmartScreen a riešenie problémov s procesmi.

* **[📦 Sprievodca Migráciou Projektu a Vývojárskou Architektúrou (MIGRATION_AND_DEVELOPMENT.md)](./MIGRATION_AND_DEVELOPMENT.md)**:
  * Postup pri prenose projektu na iný počítač, do nového Git repozitára alebo na CI/CD server.
  * Kompletná schéma adresárov a súborov.
  * Architektúra perzistencie (LocalStorage, JSON import/export, lokálny activity log, Drizzle ORM).
  * Duálne smerovanie (`HashRouter` pre offline desktop vs. `BrowserRouter` pre web).

* **[👩‍💻 Vývojársky sprievodca (DEVELOPMENT_GUIDE.md)](./DEVELOPMENT_GUIDE.md)**:
  * Overený postup od čerstvého klonu po spustenie, testy a build.
  * Štruktúra zdrojového kódu, lokálne úložisko, databázové hranice a vydávanie verzií.
  * [Vizuálna mapa komponentov](./DEVELOPMENT_GUIDE.md#component-map), dátový tok a vysvetlenie použitých technológií.

* **[🔐 Bezpečnostné následné kroky (SECURITY_FOLLOW_UPS.md)](./SECURITY_FOLLOW_UPS.md)**:
  * Záznam realizovaných bezpečnostných opatrení a otvorených odporúčaní na ďalšie iterácie.

* **[🧭 Produktový a dizajnový manuál (PRODUCT_DESIGN_MANUAL.md)](./PRODUCT_DESIGN_MANUAL.md)**:
  * Názvoslovie, metodika, dátové väzby, metriky a pravidlá UX/accessibility.

* **[🧩 UX odporúčania (UX_RECOMMENDATIONS.md)](./UX_RECOMMENDATIONS.md)**:
  * Prioritizované návrhy na zlepšenie používateľského flow.

* **[✅ Bezpečnostný checklist buildov a releasov (RELEASE_SECURITY_CHECKLIST.md)](./RELEASE_SECURITY_CHECKLIST.md)**:
  * Kontroly zdrojov, závislostí, buildov, Electron konfigurácie a distribúcie.

---

## 🚀 Rýchly Štart (Quick Start)

> **Požiadavka na prostredie** (zdroj pravdy: `engines` v `package.json`):
> * **Host / Build / Dev:** Node.js `>= 22.12.0` a npm `>= 10.0.0`.
> * **Desktop Runtime:** Electron 45 obsahuje vlastný Node.js runtime. Koncový používateľ vo Windows 11 nepotrebuje Node.js.

### 1. Inštalácia závislostí
```bash
npm ci
```

### 2. Spustenie vo vývojovom režime

* **Webový režim (Vite + Express):**
  ```bash
  npm run dev
  # Beží na http://localhost:3000
  ```

* **Desktopový režim (Electron + Vite Live Reload):**
  ```bash
  npm run electron:dev
  # Otvorí natívne Electron okno s integrovanými DevTools
  ```

### 3. Zostavenie Desktop Aplikácie pre Windows 11 (.exe)
```bash
npm run electron:build
```
Výsledné inštalačné balíčky a portable súbory nájdete v priečinku `release/`:
* `AVERT - Application Security Assessment Platform Setup <verzia>.exe` (NSIS inštalátor)
* `AVERT - Application Security Assessment Platform <verzia>.exe` (portable verzia)

Číslo verzie sa berie z `package.json`; názvy súborov sa menia podľa neho. Podrobnosti o vývoji a aktuálnych príkazoch nájdete v [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md).

---

## 🛡️ Kľúčové Funkcie Platformy

### Verzia 1.3.1

JSON zálohy obsahujú aj zistenia a ich stavy. K dispozícii je samostatný statický build pre Apache v podadresári `/avert/`.

### Verzia 1.3.0

Dvojjazyčná príručka pre začiatočníkov s prehľadom modelovania hrozieb, STRIDE, analýzy rizík, ASVS, všetkých kapitol ASVS a jednotlivých obrazoviek. Obsahuje odkazy medzi témami, praktický postup a upozornenia na hranice automatických návrhov a zálohovania.

### Verzia 1.2.1

Zjednotený vzhľad posuvníkov a slovenská terminológia „zistenia a nedostatky“ v rozhraní, nápovede a reportoch.

### Verzia 1.2.0 — jazyk reportu

Na stránke exportu možno vybrať slovenčinu alebo angličtinu pre tlačiteľný report, hlavičky Excelu a CSV. Výber nemení uložený projekt. Názvy kapitol a oficiálne požiadavky ASVS zostávajú v angličtine. Používateľské údaje (vrátane poznámok, dôvodov triáže a hrozieb) ani niektoré už uložené automaticky vytvorené texty sa neprekladajú; pri anglickom výstupe ich treba prípadne doplniť v angličtine. Jazyk rozhrania a nápovedy sa týmto výberom nemení.

CSV zachováva rovnaké poradie a význam stĺpcov, ale ich názvy závisia od zvoleného jazyka; integrácie vyžadujúce anglické hlavičky majú zvoliť English. CSV zistení používa jazyk rozhrania, nie samostatný jazyk reportu.

Samostatný prepínač s vlajkou v navigácii mení jazyk rozhrania bez obnovenia stránky a ukladá voľbu v lokálnom úložisku. Prepína sa navigácia, sprievodcovia, pracovný priestor ASVS a triáž, návody na overenie, model architektúry, register hrozieb, zistenia, zálohovanie, verziové dialógy, export aj nápoveda. Názov „ASVS 5.0 Chapters“ a oficiálny obsah ASVS zostávajú v angličtine. Používateľský obsah, názvy uložených zón a historické záznamy sa automaticky neprekladajú; v pôvodnom jazyku môžu zostať aj predtým uložené automaticky vytvorené texty. Rýchly export z ASVS používa jazyk rozhrania, zatiaľ čo stránka reportov má vlastný výber.

### Verzia 1.1
- Pridané vyznačenie stavu pokroku analýzy a prepojené kroky Kontext / DFD / STRIDE / ASVS / Zistenia.
- Pridaný stav uloženia a viditeľné chyby lokálneho úložiska.
- Threat Register má filter neoverených architektonických návrhov a hromadné označenie review.
- DFD obsahuje klávesové presúvanie, zoom-to-fit, zameranie prekrývajúcich sa prvkov a preskúmanie upozornení.
- ASVS, hrozby a architektúra sú prepojené obojsmernými odkazmi na súvisiace záznamy.

- **OWASP ASVS 5.0 Workspace:** Kompletná integrácia všetkých 17 kapitol a 350+ bezpečnostných požiadaviek pokrývajúcich úrovne L1 až L3 s mapovaním na komponenty architektúry a správou výnimiek.
- **STRIDE Threat Modeling:** Analýza systémovej architektúry podľa metodiky Microsoft STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).
- **Threat Register & 4×4 Matica Rizík:** Matica štyroch úrovní pravdepodobnosti a štyroch úrovní dopadu (Likelihood × Impact) s filtrovaním hrozieb podľa kategórie a stavu mitigácie.
- **Findings & Gap Analysis:** Automatizované porovnanie implementácie voči ASVS 5.0 a detekcia chýbajúcich alebo čiastočných kontrol.
- **Architecture Model:** Vizuálne modelovanie komponentov, trust zón a dátových tokov s abecedným výberom technológií a protokolov. TLS toky môžu evidovať NIST cipher suite, samostatnú výmenu kľúčov/KEM a odvodený PQC stav návrhu. Kliknutím na šípku sa otvorí editor toku; plátno podporuje posúvanie aj zoom. Voliteľná DFD kontrola poskytuje nezáväzné upozornenia bez blokovania práce. Paralelné spojenia sú vizuálne rozlíšené, prekrytia a prekážky označené a toky cez hranice zón vytvárajú STRIDE návrhy na kontrolu.
- **Audit Trail & Správa Verzií:** Sledovanie histórie zmien, snapshoty stavov a bezpečný import/export dát do JSON formátu.
- **Excel & CSV Export:** Excel obsahuje voliteľný súhrn, ASVS požiadavky a STRIDE register (zvolený hárok hrozieb môže byť prázdny). CSV požiadaviek je odlišné od CSV zistení. Vážené pokrytie počíta Partial ako 0,5 a ignoruje Pending/N/A. Exporty sú snímkou údajov; po zmene projektu ich treba vytvoriť znovu.
- **Reporty a zálohy:** Tlačiteľný PDF report sumarizuje všetkých 17 kapitol ASVS. Ide o výstup aplikácie, nie o certifikáciu ani oficiálne potvrdenie OWASP. JSON zálohy obsahujú aj samostatný zoznam zistení a ich stavy. CSV zistení slúži na prezeranie, nie na obnovu.

### Produktové označenie a kompatibilita

Aplikácia sa od verzie 1.0 označuje ako AVERT. Identifikátor Electron `com.atap.threatanalysis`, existujúci priečinok používateľských dát a kľúče `atap_*` v lokálnom úložisku zostávajú zámerne nezmenené. Aktuálna verzia načíta aj staršie JSON zálohy formátu 1.0, ktoré však zistenia neobsahujú. Pri prepísaní takou zálohou zostanú existujúce zistenia nezmenené; pri obnove ako nový projekt chýbajú. Nové zálohy používajú formát 1.1 a staršie verzie aplikácie ich nemusia načítať.

---

## ⚙️ Prehľad NPM Skriptov

| Skript | Príkaz | Popis |
| :--- | :--- | :--- |
| `dev` | `npm run dev` | Spustí lokálny dev server na porte 3000 |
| `build` | `npm run build` | Vytvorí produkčný webový build v `dist/` |
| `build:websupport` | `npm run build:websupport` | Vytvorí statické súbory a `.htaccess` pre `/avert/` v `public/` |
| `lint` | `npm run lint` | Skontroluje integritu TypeScript typov (`tsc --noEmit`) |
| `test` | `npm test` | Spustí testy záloh, exportu, DFD geometrie a STRIDE synchronizácie |
| `clean` | `npm run clean` | Vyčistí priečinky `dist/`, `server.cjs` a `release/` |
| `electron:dev` | `npm run electron:dev` | Vývojový režim pre desktop s Vite hot-reloadom |
| `electron:preview` | `npm run electron:preview` | Otestuje produkčný lokálny build v Electrone |
| `electron:build` | `npm run electron:build` | Zabalí aplikáciu do `.exe` inštalátora a portable verzie |

---

## Nasadenie na Websupport

Na počítači s Node.js a npm podľa požiadaviek vyššie spustite `npm ci` a `npm run build:websupport`. Nahrajte **obsah** vygenerovaného `public/` cez SFTP do adresára `avert/` v koreňovom adresári existujúceho webu. Nahrajte aj skrytý súbor `.htaccess`; niektorí SFTP klienti ho štandardne nezobrazujú. `public/` je ignorovaný Gitom a je určený iba pre vygenerovaný web. Build ho automaticky nemaže; pred novým buildom prípadne odstráňte len zastarané vygenerované súbory, nie používateľské dáta. Nastavenia v [`deploy/websupport.htaccess`](./deploy/websupport.htaccess) predpokladajú `/avert/`, Apache s `mod_rewrite`, `mod_headers` a povolenými príslušnými direktívami `.htaccess`.

Po nasadení vyskúšajte `https://vaša-doména/avert/`, navigáciu a obnovenie vnorených stránok. Nadradené rewrite pravidlá existujúceho webu môžu vyžadovať výnimku pre `/avert/`. Tento balík neobsahuje Express ani databázový server. Node.js je potrebný na **zostavenie**, nie na prevádzku statických súborov.

Apache konfigurácia posiela CSP vrátane zákazu vkladania stránky do rámcov a ďalšie bezpečnostné hlavičky. Hlavička `X-Robots-Tag` žiada neindexovanie a pravidlo vracia HTTP 403 známym robotom podľa `User-Agent`, vrátane bežne identifikovaných AI robotov. Po nasadení overte hlavičky a odpovede servera; lokálny náhľad Vite `.htaccess` nevykonáva.

Pre spolupracujúce roboty doplňte do **existujúceho** súboru `robots.txt` v koreňovom adresári domény (nenahrádzajte jeho ostatné pravidlá):

```text
User-agent: *
Disallow: /avert/
```

`robots.txt` ani blokovanie podľa `User-Agent` nie sú zabezpečením prístupu: robot môže pravidlá ignorovať alebo identitu zmeniť a blokovanie môže zachytiť aj legitímne nástroje. Zakázanie prechádzania navyše nemusí odstrániť už indexované URL. Na ochranu aplikácie nastavte HTTPS a heslovú ochranu adresára; neukladajte citlivé súbory do verejného priečinka.

Dáta sa ukladajú do prehliadača, nie na hosting; používatelia ani zariadenia ich automaticky nezdieľajú. Pravidelne zálohujte JSON a overujte obnovu. Skripty ostatných aplikácií na rovnakej doméne môžu pristupovať k rovnakému úložisku; samostatná subdoména poskytuje lepšiu izoláciu, ale vyžaduje iné nastavenie cesty buildu a routovania.

---

## 🔒 Bezpečnostný Profil

* Express server štandardne počúva na `0.0.0.0:3000` (`HOST` a `PORT` možno nastaviť). API nie je autentifikované; pre lokálne použitie nastavte `HOST=127.0.0.1` a API nevystavujte do nedôveryhodnej siete.
* Produkčná CSP sa uplatňuje cez serverovú hlavičku a HTML meta tag. Vývoj povoľuje dodatočné Vite/HMR zdroje, ktoré sa do produkčnej CSP nepridávajú.
* Import záloh kontroluje štruktúru a veľkosť (25 MiB, najviac 100 projektov); obnova sa pokúsi vrátiť pôvodné hodnoty pri zlyhaní zápisu.
* CSV export ošetruje všetky bunky proti formula injection a správne escapuje úvodzovky.
* Electron desktopová verzia používa:
  * **Context Isolation:** Zapnutá (`contextIsolation: true`).
  * **Node Integration:** Vypnutá (`nodeIntegration: false`) v renderer procese.
  * **Web Security:** Striktne zapnutá (`webSecurity: true`).
  * **Sandbox & Bezpečná navigácia:** Produkčná navigácia je obmedzená na aplikačnú stránku; HTTPS externé odkazy sa otvárajú v systémovom prehliadači.
* Activity log sa uchováva lokálne a možno ho upraviť. Nejde o dôveryhodný ani nemenný bezpečnostný audit; ďalšie kroky sú popísané v [SECURITY_FOLLOW_UPS.md](./SECURITY_FOLLOW_UPS.md).
* Pred zostavením alebo distribúciou overte [bezpečnostný checklist releasu](./RELEASE_SECURITY_CHECKLIST.md); produkčný Express server štandardne počúva na `0.0.0.0` a jeho API nemá autentifikáciu.

---

Podrobné informácie nájdete v **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)**, **[BUILD_ELECTRON.md](./BUILD_ELECTRON.md)**, **[MIGRATION_AND_DEVELOPMENT.md](./MIGRATION_AND_DEVELOPMENT.md)** a [produktovom manuáli](./PRODUCT_DESIGN_MANUAL.md).
