# Bezpečnostné zmeny a následné kroky

## Implementované v aktuálnej iterácii

1. **Obmedzenie API na localhost:** Express binduje na `127.0.0.1`; port sa nastavuje cez `PORT` (predvolené `3000`). API zostáva bez autentifikácie a nie je určené na vzdialené zdieľané nasadenie.
2. **Electron navigácia a sandbox:** renderer používa sandbox, bez Node integrácie a s izolovaným kontextom. Produkčné navigácie sú obmedzené na aplikáciu; HTTPS externé odkazy sa otvárajú v predvolenom prehliadači.
3. **Content Security Policy:** centrálna CSP sa poskytuje serverovou hlavičkou aj HTML meta tagom. Vývojové zdroje Vite/HMR sú odlíšené od produkcie.
4. **Activity log — obmedzenie:** odstránená je falošná pevná identita; log zobrazuje skutočné lokálne záznamy a označuje sa výslovne ako upraviteľný. Autor verzie je lokálne zadaný a neoverený. Záznamy nie sú autentifikované ani nemenné, a preto nejde o dôkazný alebo dôveryhodný bezpečnostný audit.
5. **Bezpečnejšia obnova záloh:** kontrola formátu, nebezpečných kľúčov, limitov veľkosti a počtu projektov, odstránenie zastaraných kľúčov pri overwrite a rollback uložených hodnôt pri chybe zápisu.
6. **CSV formula injection:** všetky exportované bunky sa citujú, escapujú úvodzovky a vzorce začínajúce po whitespace/control znakoch sa neutralizujú.

## Zostávajúce odporúčania

Tieto návrhy neboli súčasťou implementovanej bezpečnostnej iterácie. Pred realizáciou je vhodné určiť rozsah nasadenia a požadovanú úroveň integrity dát.

1. **Dôveryhodný audit trail:** ak je potrebný bezpečnostný audit, zaviesť autentifikáciu a identitu používateľa, serverové append-only úložisko, autorizáciu, časové pečiatky generované serverom a exportovateľný auditný záznam. Klientsky log neprezentovať ako nemenný.
2. **Zjednotenie dátovej vrstvy:** rozhodnúť, či produkčným úložiskom bude localStorage/offline režim alebo PostgreSQL API. Odstrániť nejednoznačnosť medzi klientskymi dátami a samostatnými serverovými tabuľkami/API.
3. **Robustnosť úložiska:** centralizovať prístup k `localStorage`, ošetriť kvóty a poškodené JSON dáta s viditeľnou chybou a pridať obnoviteľný režim pri zlyhaní úložiska.
4. **Migrácie a kompatibilita záloh:** verzovať schémy dát, zaviesť explicitné migrácie záloh a testovať importy naprieč vydaniami vrátane duplicitných ID a konfliktov.
5. **Automatické zálohy a neuložené zmeny:** definovať politiku automatických snapshotov, indikáciu neuložených zmien, retenciu a bezpečné obnovenie po páde.
6. **Väčšie dátové objemy:** vyhodnotiť migráciu z localStorage na IndexedDB alebo serverové úložisko podľa očakávanej veľkosti projektov, životného cyklu záloh a požiadaviek na multi-user prístup.
7. **Regresné pokrytie:** rozšíriť testy na Electron navigačné pravidlá, hlavičky CSP v HTTP odpovediach, Vite HTML CSP, poškodené/starnúce zálohy a rollback pri zlyhaní viacerých druhov úložiska.
