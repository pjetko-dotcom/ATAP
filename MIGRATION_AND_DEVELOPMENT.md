# 📦 Sprievodca Migráciou Projektu a Vývojárskou Architektúrou (ATAP)

Tento dokument slúži ako kompletný manuál pre vývojárov, systémových administrátorov a DevOps inžinierov v prípade, že potrebujete projekt **ATAP (Application Threat Analysis Platform)** preniesť na nový počítač, do nového Git repozitára, na CI/CD server alebo pokračovať vo vývoji v inom vývojovom prostredí.

---

## 📑 Obsah

1. [Rýchly štart pri migrácii na nový počítač](#1-rýchly-štart-pri-migrácii-na-nový-počítač)
2. [Systémové požiadavky](#2-systémové-požiadavky)
3. [Čo prenášať a čo ignorovať (.gitignore)](#3-čo-prenášať-a-čo-ignorovať-gitignore)
4. [Konfigurácia premenných prostredia (.env)](#4-konfigurácia-premenných-prostredia-env)
5. [Prehľad technického stacku](#5-prehľad-technického-stacku)
6. [Architektúra aplikácie a perzistencia dát](#6-architektúra-aplikácie-a-perzistencia-dát)
7. [Dvojitý režim fungovania (Web vs. Electron)](#7-dvojitý-režim-fungovania-web-vs-electron)
8. [Štruktúra priečinkov a súborov](#8-štruktúra-priečinkov-a-súborov)
9. [Prehľad všetkých NPM skriptov](#9-prehľad-všetkých-npm-skriptov)
10. [Bezpečnostné štandardy a pravidlá kódu](#10-bezpečnostné-štandardy-a-pravidlá-kódu)
11. [Časté otázky a riešenie problémov pri migrácii](#11-časté-otázky-a-riešenie-problémov-pri-migrácii)

---

## 1. Rýchly štart pri migrácii na nový počítač

Ak ste práve stiahli alebo naklonovali projekt na nový počítač, postupujte podľa týchto krokov:

```bash
# 1. Klonovanie alebo rozbalenie repozitára
git clone <URL_VASEHO_REPOZITARA> atap-threat-modeling
cd atap-threat-modeling

# 2. Vytvorenie lokálneho .env súboru (voliteľné pre offline desktop, potrebné pre AI funkcie)
cp .env.example .env

# 3. Inštalácia všetkých závislostí
npm ci

# 4. Kontrola typovej integrity kódu
npm run lint

# 5. Spustenie vývojového web servera
npm run dev

# ALEBO spustenie v Electron vývojovom režime
npm run electron:dev
```

Aplikácia bude dostupná na `http://localhost:3000` (alebo v natívnom Electron okne).

---

## 2. Systémové požiadavky

| Komponent | Minimálna verzia | Odporúčaná verzia | Poznámka |
| :--- | :--- | :--- | :--- |
| **Operačný systém** | Windows 10/11, macOS 12+, Ubuntu 20.04+ | Windows 11 (64-bit) | Podporuje cross-platform build a lokálne balíčkovanie |
| **Node.js (Host / Build)**| `>= 22.12.0` | **`26.13.0 LTS`** | Relevantný pre tooling, CI a Express server. |
| **Electron Runtime** | `^45.1.0` | **`45.1.0`** | Obsahuje vlastný Node.js runtime. Koncový používateľ nepotrebuje inštalovať Node.js. |
| **NPM** | `>= 10.0.0` | `10.9+` | Dodávané automaticky s Node.js |
| **Git** | `>= 2.30.0` | Najnovšia stabilná | Pre správu verzií |
| **RAM** | 4 GB | 8 GB+ | Pre plynulý build s Electron Builderom a bundling assetov |
| **Miesto na disku** | 2 GB | 5 GB | Vrátane `node_modules` a inštalačných balíčkov `release/` |

---

## 3. Čo prenášať a čo ignorovať (.gitignore)

Pri prenose projektu medzi počítačmi alebo zálohovaní **prenášajte iba zdrojový kód**. Nikdy neprenášajte nasledujúce priečinky (vytvoria sa nanovo príkazom `npm install` a `npm run build`):

### ❌ NEPRENÁŠAŤ (vylúčené v `.gitignore`):
* `node_modules/` (objemné závislosti, viazané na konkrétny OS)
* `dist/` (kompilovaný frontend a server)
* `release/` (vygenerované inštalátory a `.exe` súbory)
* `.env` (lokálne tajné kľúče - prenášajte iba `.env.example`)
* `.DS_Store`, `Thumbs.db` (systémové súbory OS)

###  PRENÁŠAŤ (kľúčové zdrojové súbory):
* `package.json` a `package-lock.json` (zaručujú identické verzie balíčkov)
* `tsconfig.json` a `vite.config.ts`
* `index.html`
* `server.ts`
* `src/` (všetky React komponenty, typy, kontexty, utility a dáta ASVS)
* `electron/` (`main.cjs` a `preload.cjs`)
* `assets/` (ikony a statické obrázky)
* Všetky dokumentačné súbory (`README.md`, `BUILD_ELECTRON.md`, `MIGRATION_AND_DEVELOPMENT.md`)

---

## 4. Konfigurácia premenných prostredia (.env)

Projekt obsahuje šablónu `.env.example`. Skonfigurujte súbor `.env` v koreňovom adresári:

```env
# GEMINI_API_KEY: Voliteľný kľúč pre AI generovanie analýz alebo asistenciu
GEMINI_API_KEY="vas_gemini_api_kluc"

# APP_URL: URL adresa hostingu pri nasadení v cloude (pre lokálny beh nie je nutné)
APP_URL="http://localhost:3000"

# DATABASE_URL: Pri použití PostgreSQL databázy (voliteľné, predvolene beží lokálny offline režim)
# DATABASE_URL="postgresql://user:password@localhost:5432/atap_db"
```

> **DÔLEŽITÉ:** Pre standalone offline beh v Electron aplikácii **nie sú potrebné žiadne premenné prostredia**. Aplikácia funguje 100% offline bez nutnosti externej databázy alebo internetového pripojenia.

---

## 5. Prehľad technického stacku a porovnanie verzií

Nasledujúci prehľad uvádza technický stack aplikácie spolu so zhodnotením aktuálnych stabilných major verzií v ekosystéme:

| Komponent | Verzia v projekte | Aktuálna stabilná verzia | Hodnotenie a architektonický kontext |
| :--- | :--- | :--- | :--- |
| **Node.js LTS** | `>= 22.12.0` | **26.13.0 LTS** | Relevantný pre host/build a server. |
| **Electron** | `^45.1.0` | **45.1.0** | Electron 45 integruje Chromium a vlastný Node.js runtime. |
| **React** | `^19.3.1` | **19.3.x (19.3.1)** | Najnovšia stabilná verzia React 19 s modernou správou stavu a hookmi. |
| **TypeScript** | `^7.0.2` | **7.0.2** | Aktuálna stabilná verzia TypeScriptu. |
| **Vite** | `^8.3.5` | **8.3.5** | Vite 8 je súčasná major generácia bundleru. |
| **Tailwind CSS** | `^4.3.3` | **4.3.3** | CSS v4 s priamou integráciou cez `@tailwindcss/vite`. |
| **Express** | `^5.3.0` | **5.3.0** | Express 5 je aktuálna major verzia. |
| **Smerovanie (Routing)** | `react-router-dom` 7.x | `7.x` | Podpora pre `HashRouter` (Electron) aj `BrowserRouter` (Web). |
| **Export a Reporting** | `exceljs` 4.x, `file-saver` 2.x | Aktuálne stabilné | Generovanie binárnych zošitov Excel (.xlsx) a CSV reportov. |
| **Databázová vrstva** | Drizzle ORM + `pg` | Aktuálne stabilné | Voliteľná vrstva pre pripojenie k PostgreSQL databáze. |

---

## 6. Architektúra aplikácie a perzistencia dát

### A. Ukladanie dát (Persistence Model)
1. **Lokálne úložisko (LocalStorage & State):**
   * Všetky analýzy, stav OWASP ASVS 5.0 požiadaviek (Implemented, Partial, Missing, N/A), STRIDE hrozby, matica rizík (5x5 Risk Matrix), kontext aplikácie a audit log sú uložené lokálne.
   * Dáta pretrvávajú medzi reštartmi aplikácie aj reštartmi počítača.
2. **Správa verzií a audit (Audit Trail):**
   * Modul `src/context/AnalysisVersionContext.tsx` a `src/utils/backupRestore.ts` sledujú históriu zmien, vytváranie snapshotov verzií a auditné záznamy.
3. **Zálohovanie a Prenosnosť dát (JSON Export/Import):**
   * Užívateľ môže kedykoľvek vyexportovať kompletný stav projektu do štruktúrovaného `.json` súboru a naimportovať ho na inom počítači alebo inom inštalovanom klientovi.
4. **Excel a CSV Export:**
   * Nástroj `src/utils/exportToExcel.ts` umožňuje generovať oficiálne audítorské reporty pre manažment a compliance tímy.

### B. OWASP ASVS 5.0 Databáza
* Aplikácia obsahuje plnú implementáciu OWASP ASVS verzie 5.0.
* Všetkých **17 kapitol** a **350+ bezpečnostných požiadaviek** (L1, L2, L3) je embedovaných priamo v kóde v `src/data/asvsData.ts`.
* Nevyžaduje sa žiadne sťahovanie z internetu – systém je okamžite po spustení pripravený na audit.

---

## 7. Dvojitý režim fungovania (Web vs. Electron)

Aplikácia je navrhnutá s duálnou podporou:

### 1. Webový režim (`http://` / `https://`)
* Spustenie: `npm run dev` alebo nasadenie v cloude (`npm run build && npm run start`).
* `App.tsx` automaticky deteguje sieťový protokol a použije štandardný `BrowserRouter`.
* Vhodné pre tímové nasadenie na internom serveri alebo firemnom intranete.

### 2. Electron Desktop režim (`file://`)
* Spustenie: `npm run electron:preview` alebo nainštalovaný `.exe` balíček.
* `App.tsx` deteguje protokol `file:` alebo Electron User-Agent a automaticky aktivuje `HashRouter` (aby nedochádzalo k chybám pri lokálnej navigácii súborového systému).
* Vo `vite.config.ts` je nastavené `base: './'`, čo zaisťuje správne relatívne linkovanie CSS a JS balíčkov.
* V `electron/main.cjs` sú implementované bezpečnostné pravidlá:
  - `nodeIntegration: false` (ochrana pred XSS útokmi)
  - `contextIsolation: true`
  - `webSecurity: true`
  - Blokovanie neautorizovanej navigácie a otváranie externých odkazov výhradne v predvolenom prehliadači OS cez `shell.openExternal`.

### 3. Oddelenie Runtimov (Host Node.js 26 LTS vs. Electron Vstavaný Node.js)
* **Hostiteľský systém (Developer stanica / CI):**
  - Beží na **Node.js 26.13.0 LTS („Lithium“)** s podporou do apríla 2029.
  - Zabezpečuje spúšťanie Vite dev servera, bundling statických súborov, TypeScript kompiláciu (`tsc`), linting a balíčkovanie cez `electron-builder`.
  - V prípade full-stack režimu hostiteľský Node.js spúšťa Express 5 backend server.
* **Klientsky desktopový runtime (Koncový používateľ vo Windows 11):**
  - **Electron nepoužíva externý systémový Node.js hostiteľa.**
  - Electron 45 integruje vlastný dedikovaný runtime **Node.js 24.22.x** priamo v binárnom balíčku spolu s Chromium jadrom.
  - Vďaka tomu je desktopová aplikácia plne izolovaná a koncový používateľ nemusí mať v operačnom systéme nainštalované žiadne Node.js prostredie.

---

## 8. Štruktúra priečinkov a súborov

```
atap-threat-modeling/
├── .env.example              # Vzor konfigurácie prostredia
├── .gitignore                # Zoznam ignorovaných súborov pre Git
├── BUILD_ELECTRON.md         # Podrobný návod na build pre Windows 11
├── MIGRATION_AND_DEVELOPMENT.md # Tento sprievodca architektúrou a migráciou
├── README.md                 # Hlavná dokumentácia projektu
├── index.html                # Vstupný HTML bod aplikácie
├── metadata.json             # Metadáta projektu
├── package.json              # Definícia balíčkov, skriptov a Electron konfigurácie
├── server.ts                 # Full-stack Express server (pre webové nasadenie)
├── tsconfig.json             # Konfigurácia TypeScript kompilátora
├── vite.config.ts            # Vite konfigurácia (Tailwind v4, base './', port 3000)
│
├── electron/                 # Electron Desktop vrstva
│   ├── main.cjs              # Hlavný proces Electronu (okná, menu, bezpečnosť)
│   └── preload.cjs           # Bezpečný IPC bridge (contextBridge)
│
├── src/                      # Zdrojový kód React aplikácie
│   ├── main.tsx              # React bootstrap súbor
│   ├── App.tsx               # Hlavný smerovač (HashRouter vs BrowserRouter)
│   ├── index.css             # Globálne štýly a import Tailwind CSS v4
│   │
│   ├── components/           # UI Komponenty a obrazovky
│   │   ├── ASVSWorkspace.tsx       # OWASP ASVS 5.0 pracovný priestor
│   │   ├── ThreatRegister.tsx      # Register hrozieb a 5x5 matica rizík
│   │   ├── StrideModel.tsx         # Microsoft STRIDE modelovacie rozhranie
│   │   ├── ArchitectureModel.tsx   # Modelovanie architektúry a dátových tokov
│   │   ├── ApplicationContext.tsx  # Kontext aplikácie a regulačné požiadavky
│   │   ├── FindingsAndGaps.tsx     # Automatická analýza medzier a nálezov
│   │   ├── Export.tsx              # Exportné centrum (JSON, Excel, CSV)
│   │   ├── AuditTrail.tsx          # Záznam auditu a história verzií
│   │   ├── Dashboard.tsx           # Hlavný prehľadový panel
│   │   ├── Layout.tsx              # Hlavné navigačné rozloženie
│   │   ├── AnalysisLayout.tsx      # Rozloženie konkrétnej analýzy so sidebarom
│   │   └── ErrorBoundary.tsx       # Záchytná bezpečnostná obrazovka chýb
│   │
│   ├── context/              # Globálny stav (React Context)
│   │   └── AnalysisVersionContext.tsx # Správa verzií analýz a stavu
│   │
│   ├── data/                 # Statické dátové modely
│   │   ├── asvsData.ts             # 350+ požiadaviek ASVS 5.0 rozdelených do 17 kapitol
│   │   └── projectCategorizationData.ts # Klasifikácia kritickosti a domén
│   │
│   ├── db/                   # Databázová vrstva (Drizzle ORM)
│   │   ├── schema.ts               # Schéma tabuliek pre PostgreSQL
│   │   └── drizzle.config.ts       # Konfigurácia Drizzle migrácie
│   │
│   ├── types/                # TypeScript typové definície
│   │   └── ...                     # Rozhrania pre analýzy, hrozby, ASVS položky
│   │
│   └── utils/                # Pomocné funkcie a exportéry
│       ├── backupRestore.ts        # Záloha, obnova a validácia JSON
│       ├── exportToExcel.ts        # Excel XLSX/CSV generátor
│       └── verificationGuide.ts    # Nápoveda a metodika pre verifikáciu
│
└── release/                  # Vytvorí sa po builde: inštalačné .exe balíčky
```

---

## 9. Prehľad všetkých NPM skriptov

| Skript | Príkaz | Účel |
| :--- | :--- | :--- |
| `dev` | `npm run dev` | Spustí full-stack vývojový server Express + Vite na porte 3000. |
| `build` | `npm run build` | Zostaví produkčný frontend do `dist/` a skompiluje `server.cjs`. |
| `start` | `npm run start` | Spustí produkčný Express server z `dist/server.cjs`. |
| `lint` | `npm run lint` | Vykoná striktnú typovú kontrolu celého projektu (`tsc --noEmit`). |
| `clean` | `npm run clean` | Vymaže dočasné priečinky `dist/`, `server.cjs` a `release/`. |
| `electron:dev` | `npm run electron:dev` | Spustí vývojový server a natívne Electron okno s DevTools. |
| `electron:preview`| `npm run electron:preview`| Zostaví aplikáciu a spustí Electron nad lokálnym `dist/index.html`. |
| `electron:build` | `npm run electron:build` | **Vytvorí inštalátor (`Setup.exe`) a standalone portable `.exe` pre Windows.** |

---

## 10. Bezpečnostné štandardy a pravidlá kódu

1. **Typová bezpečnosť (TypeScript):**
   * Žiadne potlačené typy (`any` sa minimalizuje). Pred odovzdaním kódu vždy spustite `npm run lint`.
2. **Bezpečnosť Electron prostredia:**
   * Nikdy nezapínajte `nodeIntegration: true` v `webPreferences`.
   * Všetka komunikácia medzi renderer procesom (React) a hlavným procesom (Node.js) musí prebiehať výhradne cez explicitné funkcie v `electron/preload.cjs`.
3. **Žiadna telemetria a ochrana súkromia:**
   * Aplikácia neodosiela žiadne telemetrické dáta, analytiku ani záznamy o hrozbách na externé servery.
   * Dáta o bezpečnostných slabinách sú prísne dôverné a zostávajú na počítači používateľa.

---

## 11. Časté otázky a riešenie problémov pri migrácii

### Otázka 1: "Chcem projekt preniesť do nového Git repozitára. Ako na to?"
Postup:
```bash
# V priečinku projektu vymažte starý .git (ak existuje) alebo nastavte nový remote:
git remote remove origin
git remote add origin https://github.com/VASA_ORGANIZACIA/atap.git
git branch -M main
git add .
git commit -m "Initial commit of ATAP platform"
git push -u origin main
```

### Otázka 2: "Po `npm install` na Windows hlási chyby node-gyp alebo python."
Všetky základné závislosti v projekte sú čistý JavaScript/TypeScript. Ak by niektorý voliteľný natívny modul vyžadoval zostavenie C++ nástrojmi:
* Nainštalujte Visual Studio Build Tools:
  ```powershell
  winget install Microsoft.VisualStudio.2022.BuildTools
  ```
* Avšak štandardný `npm install` s balíčkami z `package.json` funguje bez nutnosti kompilácie C++.

### Otázka 3: "Ako zmeniť verziu alebo názov aplikácie v inštalátore?"
V súbore `package.json` upravte polia:
* `"version": "5.1.0"` (zmeňte na vami požadované číslo verzie)
* `"build": { "productName": "Váš Názov Aplikácie" }`

---

**Projekt je plne pripravený na prenos a okamžitý lokálny alebo tímový vývoj.**
V prípade otázok postupujte podľa návodu `BUILD_ELECTRON.md` pre zostavenie finálneho `.exe`.
