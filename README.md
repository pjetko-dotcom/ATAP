# ATAP - Application Threat Analysis & Modeling Platform

A professional, enterprise-grade application for conducting automated threat analysis, tracking security requirements, and modeling architecture using standard industry methodologies (**OWASP ASVS 5.0** and **Microsoft STRIDE**).

Aplikácia je navrhnutá pre duálne nasadenie: ako **moderná webová full-stack aplikácia**, tak aj ako **100% offline desktopová aplikácia pre Windows (Electron)**.

---

## 📚 Kompletná Dokumentácia a Sprievodcovia

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

* **[🔐 Bezpečnostné následné kroky (SECURITY_FOLLOW_UPS.md)](./SECURITY_FOLLOW_UPS.md)**:
  * Záznam realizovaných bezpečnostných opatrení a otvorených odporúčaní na ďalšie iterácie.

---

## 🚀 Rýchly Štart (Quick Start)

> **Požiadavka na prostredie:**
> * **Host / Build / Dev:** Projekt vyžaduje Node.js `>= 22.12.0`; odporúčaná je najnovšia LTS verzia, aktuálne **Node.js 26.13.0**, a npm 10 alebo novší.
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
* `release/ATAP Threat Analysis Platform Setup 5.2.0.exe` (NSIS Installer)
* `release/ATAP Threat Analysis Platform 5.2.0.exe` (Standalone Portable)

### GUI / malé obrazovky (verzia 5.2.0)
* Hlavička analýzy sa na užších viewportoch rozdelí na riadky; sekundárne akcie sú v ponuke **Viac**, aby neodišli mimo obrazovku.
* ASVS používa kompaktné karty pod 1280 px vrátane úpravy stavu, dôkazu, metodiky a mapovania komponentov. Na širokých obrazovkách zostáva tabuľkový pohľad.
* Triážne otázky sú rozbaľovacie a naraz možno otvoriť detail jednej otázky.
* Fonty sú systémové a lokálne, takže vizuál nepotrebuje načítať Google Fonts ani sieťové pripojenie.
* Táto sada zmien je verzovaná ako **5.2.0**; vydanie **5.1.0** zostáva dostupné ako rollback referencia.

---

## 🛡️ Kľúčové Funkcie Platformy

- **OWASP ASVS 5.0 Workspace:** Kompletná integrácia všetkých 17 kapitol a 350+ bezpečnostných požiadaviek pokrývajúcich úrovne L1 až L3 s mapovaním na komponenty architektúry a správou výnimiek.
- **STRIDE Threat Modeling:** Analýza systémovej architektúry podľa metodiky Microsoft STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).
- **Threat Register & 5x5 Matica Rizík:** Dynamická matica pravdepodobnosti a dopadu (Likelihood × Impact) s filtrovaním hrozieb podľa kategórie a stavu mitigácie.
- **Findings & Gap Analysis:** Automatizované porovnanie implementácie voči ASVS 5.0 a detekcia chýbajúcich alebo čiastočných kontrol.
- **Architecture Model:** Vizuálne modelovanie komponentov aplikácie, hraníc dôvery (trust boundaries) a dátových tokov.
- **Audit Trail & Správa Verzií:** Sledovanie histórie zmien, snapshoty stavov a bezpečný import/export dát do JSON formátu.
- **Excel & CSV Export:** Generovanie oficiálnych audítorských reportov priamo do zošita Microsoft Excel pomocou `exceljs`.

---

## ⚙️ Prehľad NPM Skriptov

| Skript | Príkaz | Popis |
| :--- | :--- | :--- |
| `dev` | `npm run dev` | Spustí lokálny dev server na porte 3000 |
| `build` | `npm run build` | Vytvorí produkčný webový build v `dist/` |
| `lint` | `npm run lint` | Skontroluje integritu TypeScript typov (`tsc --noEmit`) |
| `test` | `npm test` | Spustí cielené testy záloh, CSV sanitizácie a CSP |
| `clean` | `npm run clean` | Vyčistí priečinky `dist/`, `server.cjs` a `release/` |
| `electron:dev` | `npm run electron:dev` | Vývojový režim pre desktop s Vite hot-reloadom |
| `electron:preview` | `npm run electron:preview` | Otestuje produkčný lokálny build v Electrone |
| `electron:build` | `npm run electron:build` | Zabalí aplikáciu do `.exe` inštalátora a portable verzie |

---

## 🔒 Bezpečnostný Profil

* Express API štandardne počúva iba na `127.0.0.1`; pre zmenu portu použite `PORT`. API nie je autentifikované a nie je určené na priame vystavenie do siete.
* Produkčná CSP sa uplatňuje cez serverovú hlavičku a HTML meta tag. Vývoj povoľuje dodatočné Vite/HMR zdroje, ktoré sa do produkčnej CSP nepridávajú.
* Import záloh kontroluje štruktúru a veľkosť (25 MiB, najviac 100 projektov); obnova sa pokúsi vrátiť pôvodné hodnoty pri zlyhaní zápisu.
* CSV export ošetruje všetky bunky proti formula injection a správne escapuje úvodzovky.
* Electron desktopová verzia používa:
  * **Context Isolation:** Zapnutá (`contextIsolation: true`).
  * **Node Integration:** Vypnutá (`nodeIntegration: false`) v renderer procese.
  * **Web Security:** Striktne zapnutá (`webSecurity: true`).
  * **Sandbox & Bezpečná navigácia:** Produkčná navigácia je obmedzená na aplikačnú stránku; HTTPS externé odkazy sa otvárajú v systémovom prehliadači.
* Activity log sa uchováva lokálne a možno ho upraviť. Nejde o dôveryhodný ani nemenný bezpečnostný audit; ďalšie kroky sú popísané v [SECURITY_FOLLOW_UPS.md](./SECURITY_FOLLOW_UPS.md).

---

Podrobné informácie nájdete v **[BUILD_ELECTRON.md](./BUILD_ELECTRON.md)** a **[MIGRATION_AND_DEVELOPMENT.md](./MIGRATION_AND_DEVELOPMENT.md)**.
