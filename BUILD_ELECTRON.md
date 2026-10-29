# 🖥️ Návod na Build a Spustenie Electron Desktop Aplikácie (Windows 11)

Tento dokument obsahuje podrobný návod krok za krokom (**Step-by-Step**) na prípravu vývojového prostredia, spustenie vo vývojovom režime a vytvorenie finálnych inštalačných balíčkov (`.exe`) aplikácie **ATAP (Application Threat Analysis Platform)** pre operačný systém **Windows 11**.

---

## 📋 1. Predpoklady a Príprava Systému (Prerequisites)

Pred spustením buidovacieho procesu sa uistite, že máte na počítači s Windows 11 nainštalované nasledujúce nástroje:

### A. Node.js a NPM (Hostiteľské / Build Prostredie)
* **Aktuálna LTS verzia:** Node.js **26.13.0 LTS**. Projekt vyžaduje `node: >= 22.12.0`; použiť možno podporovanú LTS verziu Node.js.
* **⚠️ Kľúčový architektonický rozdiel (Host Node vs. Electron Runtime):**
  > **DÔLEŽITÉ UPOZORNENIE:** Výsledná Electron aplikácia **NEPOUŽÍVA externý Node.js** nainštalovaný vo Windows 11. 
  > Desktopový framework **Electron 45** (aktuálna verzia `45.1.0`) v sebe integruje **vlastný vstavaný Node.js 24.22.x** a vlastné Chromium jadro.
  > 
  > Hostiteľský **Node.js 26 LTS** na vašom počítači slúži **výhradne pre vývojárske nástroje (Vite bundler, TypeScript kompilátor, esbuild, electron-builder) a CI/CD build proces**, prípadne pre beh standalone Express 5 backend servera. Koncový používateľ Windows 11 aplikácie **nemusí mať Node.js nainštalovaný vôbec**.

* **Stiahnutie Node.js pre Windows 11:** Oficiálna stránka [nodejs.org](https://nodejs.org/) alebo cez Windows Package Manager (`winget`):
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```
* **Overenie inštalácie** v termináli (PowerShell alebo CMD):
  ```powershell
  node -v
  # Vypíše napr. v26.13.0 (alebo podporovanú LTS verziu >=22.12.0)
  npm -v
  # Vypíše verziu npm (10.9.x alebo novšiu)
  ```

### B. Prehľad Verzií Komponentov a Stav Ekosystému
Pre zachovanie prehľadu uvádzame porovnanie základných verzií projektu s najnovšími stabilnými verziami v ekosystéme:

| Komponent | Verzia v projekte | Aktuálna stabilná verzia | Architektonický kontext a zhodnotenie |
| :--- | :--- | :--- | :--- |
| **Node.js LTS** | `>= 22.12.0` | **26.13.0 LTS** | Relevantný pre build, tooling, CI a Express server. |
| **Electron** | `^45.1.0` | **45.1.0** | Electron integruje Chromium a vlastný Node.js runtime, nezávislý od hostiteľa. |
| **React** | `^19.3.1` | **19.3.x (19.3.1)** | Aktuálna stabilná vetva React 19 so zlepšenou podporou pre akcie a hooky. |
| **TypeScript** | `^7.0.2` | **7.0.2** | Aktuálna stabilná verzia TypeScriptu. |
| **Vite** | `^8.3.5` | **8.3.5** | Vite 8 je aktuálna major generácia bundleru. |
| **Tailwind CSS** | `^4.3.3` | **4.3.3** | CSS v4 s priamou integráciou cez `@tailwindcss/vite`. |
| **Express** | `^5.3.0` | **5.3.0** | Express 5 s natívnou podporou Promise v routoch. |

### C. Git pre Windows
* **Stiahnutie:** [git-scm.com](https://git-scm.com/download/win) alebo:
  ```powershell
  winget install Git.Git
  ```
* **Overenie:**
  ```powershell
  git --version
  ```

### D. PowerShell Execution Policy (dôležité pre Windows 11)
Ak vám PowerShell odmieta spúšťať npm skripty s chybou `running scripts is disabled on this system`, otvorte PowerShell ako Správca (Administrator) a povoľte lokálne skripty:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🚀 2. Príprava Projektu a Závislostí

1. **Otvorte terminál** (PowerShell, Windows Terminal alebo Git Bash) a prejdite do priečinka projektu:
   ```powershell
   cd C:\cesta\k\projektu\atap-app
   ```

2. **Inštalácia závislostí:**
   Spustite čistú inštaláciu balíčkov definovaných v `package.json`:
   ```powershell
   npm ci
   ```
   *(Poznámka: Balíčky zahŕňajú `electron` aj `electron-builder`, nie je potrebné ich inštalovať globálne).*

---

## 💻 3. Vývojový Režim (Development Mode)

Počas vývoja môžete aplikáciu spustiť v interaktívnom režime s hot-reloadom (zmeny v kóde sa prejavia okamžite bez reštartovania):

```powershell
npm run electron:dev
```

### Čo tento príkaz robí:
1. Spustí lokálny vývojový server Vite na porte `3000`.
2. Pomocou nástroja `wait-on` počká, kým server odpovie na `http://localhost:3000`.
3. Otvorí natívne Electron okno s načítanou aplikáciou a automaticky sprístupní **Chrome DevTools** (F12) na ladenie chýb a konzoly.
4. V development režime sú povolené Vite/HMR CSP zdroje a DevTools; tieto výnimky sa nepoužívajú v produkčnom Electron builde.

---

## 🔍 4. Lokálny Preview Produkčného Buildu (Bez balíčkovania)

Pred samotným vytvorením `.exe` inštalátora je osvedčenou praxou otestovať, ako sa aplikácia správa pri načítaní zo statických súborov cez protokol `file://`:

```powershell
npm run electron:preview
```

Tento príkaz:
1. Vybuduje produkčný frontend do priečinka `dist/` pomocou `vite build` a skompiluje server.
2. Spustí Electron priamo nad súborom `dist/index.html`.
3. Overí, že `HashRouter` a relatívne cesty k assetom fungujú bez chýb pred zabalením.

---

## 📦 5. Vytvorenie Finálnej Aplikácie (.EXE pre Windows 11)

Pre vytvorenie distribuovateľných spustiteľných súborov spustite jediný príkaz:

```powershell
npm run electron:build
```

### Čo sa počas tohto príkazu udeje:
1. **Frontend Build:** `vite build` vytvorí optimalizovaný bundle v priečinku `dist/` s relatívnymi cestami (`base: './'`).
2. **Backend Server Bundle:** `esbuild` pripraví standalone `dist/server.cjs`.
3. **Electron Builder Packaging:** `electron-builder` zoberie obsah `dist/` a `electron/` a vytvorí binárne súbory pre Windows podľa konfigurácie v `package.json`.

### Bezpečnostné obmedzenia
* Produkčná aplikácia povoľuje navigáciu iba na aplikačný HTML súbor. HTTPS externé odkazy sa otvárajú mimo aplikácie v systémovom prehliadači; iné protokoly sú blokované.
* Renderer beží so sandboxom, bez Node integrácie a s izolovaným kontextom. DevTools sú dostupné len počas vývoja.
* Produkčná CSP povoľuje iba deklarované zdroje aplikácie a AI API. Pri pridaní externého zdroja aktualizujte `contentSecurityPolicy.ts` zámerne a otestujte vývojový aj produkčný režim.
* Údaje a audit log sú lokálne v `localStorage`; log je upraviteľný a nepovažuje sa za nemenný bezpečnostný audit.

---

## 📂 6. Výsledné Súbory (Výstup v priečinku `release/`)

Po úspešnom dokončení príkazu nájdete v priečinku `release/` dva typy binárok:

| Súbor | Typ | Určenie |
| :--- | :--- | :--- |
| `ATAP Threat Analysis Platform Setup 5.1.0.exe` | **NSIS Inštalátor** | Štandardný Windows inštalátor so sprievodcom. Vytvorí zástupcu na ploche a v Štart menu, umožňuje odinštalovanie cez Nastavenia Windows. |
| `ATAP Threat Analysis Platform 5.1.0.exe` | **Portable Verzia** | Samostatný jedno-súborový program. **Nevyžaduje inštaláciu ani administrátorské práva**. Môže sa spustiť priamo z USB kľúča alebo sieťového disku. |
| `win-unpacked/` | **Rozbalená verzia** | Rozbalený adresár aplikácie pripravený na okamžité spustenie bez inštalácie (užitočné na rýchle testovanie). |

---

## 🛡️ 7. Windows 11 Upozornenia a Bezpečnostné Aspekty

### A. Upozornenie "Windows Defender SmartScreen chránil váš počítač"
Pretože vygenerovaný `.exe` súbor nie je podpísaný drahým komerčným certifikátom (EV Code Signing Certificate), systém Windows 11 SmartScreen zobrazí varovanie:
1. Kliknite na **Ďalšie informácie** (More info).
2. Kliknite na tlačidlo **Spustiť aj tak** (Run anyway).
*Po podpísaní certifikátom vašej organizácie toto varovanie zmizne.*

### B. Pridanie vlastného Code Signing Certifikátu (Voliteľné)
Ak vlastníte certifikát (`.pfx`), môžete ho zadať do premenných prostredia pred buildom:
```powershell
$env:CSC_LINK="C:\cesta\k\certifikatu.pfx"
$env:CSC_KEY_PASSWORD="vase_heslo_k_certifikatu"
npm run electron:build
```

---

## 🛠️ 8. Riešenie Problémov (Troubleshooting na Windows 11)

### 1. Zaseknutý proces alebo uzamknutý súbor v `release/`
Ak build zlyhá s chybou `EBUSY: resource busy or locked`, znamená to, že predchádzajúca verzia aplikácie stále beží na pozadí:
* Otvorte **Správcu úloh** (`Ctrl + Shift + Esc`) a ukončite procesy s názvom `ATAP Threat Analysis Platform` alebo `electron.exe`.
* Alebo v PowerShell:
  ```powershell
  Stop-Process -Name "electron" -ErrorAction SilentlyContinue
  npm run clean
  npm run electron:build
  ```

### 2. Biela obrazovka po spustení (White Screen)
* Stlačte klávesovú skratku **Ctrl + Shift + I** priamo v bežiacej aplikácii na otvorenie DevTools.
* Skontrolujte kartu **Console**.
* Aplikácia ATAP obsahuje automatickú detekciu protokolu `file://` a v `App.tsx` používa `HashRouter` a vo `vite.config.ts` je nastavené `base: './'`. Ak by sa biela obrazovka objavila, uistite sa, že `dist/index.html` existuje a obsahuje relatívne cesty `<script src="./assets/index-....js">`.

### 3. Port 3000 je obsadený (pri `npm run electron:dev`)
Ak iná služba na vašom počítači používa port 3000:
* Zistite proces:
  ```powershell
  netstat -ano | findstr :3000
  ```
* Ukončite proces podľa PID alebo uvoľnite port.

### 4. Vyčistenie dočasných súborov
Pre kompletný reštart buildu:
```powershell
npm run clean
npm run build
npm run electron:build
```

---

## 🚀 9. Rýchly ťahák (Cheat Sheet)

```powershell
# 1. Inštalácia
npm install

# 2. Vývoj
npm run electron:dev

# 3. Rýchly test buildu
npm run electron:preview

# 4. Finálny balíček pre Windows 11
npm run electron:build
```
