# 🖥️ Návod na Build a Spustenie Electron Desktop Aplikácie (Windows 11)

Tento dokument obsahuje návod na prípravu vývojového prostredia, spustenie a vytvorenie inštalačných balíčkov (`.exe`) aplikácie **ATAP (Application Threat Analysis Platform)** pre Windows.

---

## 📋 1. Predpoklady a Príprava Systému (Prerequisites)

Pred spustením build procesu nainštalujte nástroje uvedené nižšie.

### A. Node.js a NPM (Hostiteľské / Build Prostredie)
* **Požiadavka projektu:** Node.js `>= 22.12.0` a npm `>= 10.0.0` (zdroj pravdy: `engines` v `package.json`).
* **Rozdiel medzi build a desktop runtime:**
  > Node.js na vývojárskom počítači sa používa na nástroje, build a Express server. Electron je pribalený do desktopovej aplikácie, takže koncový používateľ nepotrebuje samostatnú inštaláciu Node.js.

* **Stiahnutie Node.js pre Windows 11:** Oficiálna stránka [nodejs.org](https://nodejs.org/) alebo cez Windows Package Manager (`winget`):
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```
* **Overenie inštalácie** v termináli (PowerShell alebo CMD):
  ```powershell
  node -v
  # Vypíše podporovanú verziu >=22.12.0
  npm -v
  # Vypíše verziu npm (10.9.x alebo novšiu)
  ```

Verzie závislostí spravujú `package.json` a `package-lock.json`; dokumentácia úmyselne neopakuje ich pohyblivý zoznam.

Python nie je potrebný na vývoj, testy ani Electron build. Staré root-level Python patch skripty neboli súčasťou aplikácie a boli odstránené.

### B. Git pre Windows
* **Stiahnutie:** [git-scm.com](https://git-scm.com/download/win) alebo:
  ```powershell
  winget install Git.Git
  ```
* **Overenie:**
  ```powershell
  git --version
  ```

### C. PowerShell Execution Policy
Ak PowerShell odmieta spustiť `npm.ps1` pre execution policy, použite `npm.cmd` alebo upravte používateľskú execution policy podľa pravidiel vášho systému. Na zmenu systémových bezpečnostných nastavení nemusia byť potrebné ani vhodné administrátorské práva.

Príklad pre aktuálneho používateľa (iba ak to povoľujú pravidlá zariadenia):
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
| `ATAP Threat Analysis Platform Setup <verzia>.exe` | **NSIS Inštalátor** | Štandardný Windows inštalátor. Verzia v názve sa berie z `package.json`. |
| `ATAP Threat Analysis Platform <verzia>.exe` | **Portable Verzia** | Samostatný jedno-súborový program. Názov obsahuje verziu z `package.json`. |
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
