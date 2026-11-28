export type GuideText = { sk: string; en: string };

export interface GuideTopic {
  id: string;
  title: GuideText;
  intro: GuideText;
  steps: GuideText[];
  related: string[];
  route?: string;
}

export const guideTopics: GuideTopic[] = [
  {
    id: "start",
    title: { sk: "Začíname a prehľad projektu", en: "Getting started and the dashboard" },
    intro: {
      sk: "Jedna analýza predstavuje jeden hodnotený systém. Začnite rozsahom a kontextom, pokračujte architektúrou, hrozbami a overením ASVS, potom pripravte zistenia a report. K jednotlivým krokom sa vracajte pri zmene systému.",
      en: "One analysis represents one system under assessment. Start with scope and context, then model the architecture, assess threats and verify ASVS controls before reviewing findings and exporting a report. Revisit these steps when the system changes.",
    },
    steps: [
      { sk: "Na Prehľade vyberte Nová analýza, zadajte názov, typ systému a cieľovú úroveň ASVS. Šablóna iba predvyplní údaje, nevykoná hodnotenie.", en: "On the Dashboard, choose New Analysis and enter the name, system type and target ASVS level. A template only prefills fields; it does not perform an assessment." },
      { sk: "Ukážkový projekt obsahuje vzorové údaje a hrozby; nepovažujte ich za výsledky vlastného systému. Nové analýzy začínajú bez ukážkových hrozieb.", en: "The sample project contains example data and threats, not results for your own system. New analyses start without sample threats." },
      { sk: "Prehľad a indikátory priebehu pomáhajú s orientáciou, ale samy o sebe nedokazujú úplnosť alebo bezpečnosť. Pred hodnotením sa dohodnite s vlastníkom na hraniciach a dôkazoch.", en: "The dashboard and progress indicators help navigation but do not prove completeness or security. Agree the boundaries and evidence with the system owner before assessment." },
    ],
    related: ["concepts", "context", "storage"],
  },
  {
    id: "concepts",
    title: { sk: "Základy: modelovanie hrozieb, riziko a ASVS", en: "Fundamentals: threat modeling, risk and ASVS" },
    intro: {
      sk: "Modelovanie hrozieb je systematické uvažovanie o tom, čo chránime, ako systém funguje, čo sa môže pokaziť a ako riziko znížiť. Hrozba je možný scenár; zraniteľnosť je slabina, ktorá ho môže umožniť; riziko vyjadruje pravdepodobnosť a dopad.",
      en: "Threat modeling is a systematic way to ask what we protect, how a system works, what can go wrong and how to reduce risk. A threat is a possible scenario; a vulnerability is a weakness that may enable it; risk expresses likelihood and impact.",
    },
    steps: [
      { sk: "STRIDE pomáha hľadať scenáre, napríklad vydávanie sa za iného používateľa. Riziková matica pomáha určiť priority; hodnotenie je odborný odhad, nie presná predpoveď.", en: "STRIDE helps identify scenarios, such as impersonating a user. The risk matrix helps prioritize them; its result is an informed estimate, not a precise prediction." },
      { sk: "OWASP ASVS je súbor požiadaviek na overenie bezpečnosti aplikácií. Požiadavka je kontrola, ktorú treba posúdiť a podložiť dôkazom; jej splnenie môže znižovať riziko, ale nesúvisí automaticky s každou hrozbou.", en: "OWASP ASVS is a set of application-security verification requirements. Each requirement is a control to assess and support with evidence; fulfilling it may reduce risk, but it does not automatically address every threat." },
      { sk: "Príklad: pri prihlasovaní hrozí zneužitie účtu. Zdokumentujte scenár a dopad, navrhnite MFA a obmedzenie pokusov, prepojte vhodné kontroly ASVS a overte ich testom. Následne posúďte zostávajúce riziko.", en: "Example: an account may be compromised through login. Record the scenario and impact, propose MFA and login throttling, link relevant ASVS controls and verify them with a test. Then reassess the remaining risk." },
      { sk: "Automatické návrhy sú iba podnety na kontrolu, nie potvrdené zraniteľnosti. Report aplikácie nie je certifikácia OWASP ani dôkaz, že je systém bezpečný.", en: "Automatic suggestions are review prompts, not confirmed vulnerabilities. An application-generated report is not OWASP certification or proof that a system is secure." },
    ],
    related: ["stride", "risk", "asvs"],
  },
  {
    id: "context",
    title: { sk: "Kontext aplikácie a kategorizácia", en: "Application context and categorization" },
    intro: {
      sk: "Kontext vysvetľuje účel systému, používateľov a citlivosť údajov. Pomáha rozhodnúť, ktoré hrozby a požiadavky sú v danom rozsahu dôležité.",
      en: "Context describes the system purpose, users and data sensitivity. It helps determine which threats and requirements matter within the chosen scope.",
    },
    steps: [
      { sk: "Vyplňte obchodný účel, klasifikáciu údajov, požiadavky na súlad, typy používateľov a prístupnosť z internetu; potom kontext uložte.", en: "Enter the business purpose, data classification, compliance requirements, user types and internet exposure; then save the context." },
      { sk: "V kategorizácii odpovedzte na otázky a použite odporúčanie ako pomôcku pri výbere úrovne L1–L3. Konečné rozhodnutie a zdôvodnenie patria hodnotiteľovi a vlastníkovi systému.", en: "Answer the categorization questions and use the recommendation to inform the L1–L3 choice. The assessor and system owner remain responsible for the final decision and rationale." },
      { sk: "Zaznamenajte hranice hodnotenia a predpoklady: ktoré prostredia, rozhrania a tretie strany sú zahrnuté alebo vylúčené. Pri zmenách kontext aktualizujte.", en: "Record the assessment boundaries and assumptions: which environments, interfaces and third parties are included or excluded. Update context when they change." },
    ],
    related: ["start", "architecture", "asvs"],
    route: "context",
  },
  {
    id: "architecture",
    title: { sk: "Model architektúry a dátové toky", en: "Architecture model and data flows" },
    intro: {
      sk: "DFD (diagram dátových tokov) zobrazuje komponenty, smer prenášaných údajov a zóny dôvery. Hranica dôvery je miesto, kde sa mení úroveň kontroly alebo dôvery, napríklad internet → interné API.",
      en: "A DFD (data-flow diagram) shows components, the direction of data and trust zones. A trust boundary is where the level of control or trust changes, for example internet → internal API.",
    },
    steps: [
      { sk: "Pridajte a pomenujte komponenty a zóny. Tokom spojte zdroj a cieľ; vyplňte typ údajov, klasifikáciu, protokol, šifrovanie a autentifikáciu odosielateľa podľa známeho návrhu.", en: "Add and name components and zones. Connect source to destination with a flow; record data type, classification, protocol, encryption and sender authentication according to the known design." },
      { sk: "Tok medzi rôznymi zónami vytvorí v registri návrhy STRIDE. Prezrite ich, upravte alebo označte ako overené; chýbajúci návrh neznamená, že hrozba neexistuje. Vlastné hrozby doplňte ručne.", en: "A flow between different zones creates STRIDE suggestions in the register. Review, edit or mark them reviewed; the absence of a suggestion does not mean there is no threat. Add your own threats manually." },
      { sk: "Kontrola návrhu upozorňuje na možné problémy, ale neblokuje prácu. Výber TLS a PQC zaznamenáva návrh, nie dôkaz nasadenia; skutočnú konfiguráciu treba overiť. Odstránenie komponentu odstráni aj jeho toky.", en: "Design review flags potential issues but does not block editing. TLS and PQC selections record design intent, not deployment evidence; verify the actual configuration. Removing a component also removes its flows." },
      { sk: "Plátno podporuje posúvanie a priblíženie; tok možno otvoriť kliknutím alebo klávesmi Enter/Space. Komponenty možno prepojiť s požiadavkami ASVS a hrozbami.", en: "The canvas supports scrolling and zooming; open a flow by clicking it or pressing Enter/Space. Components can be linked to ASVS requirements and threats." },
    ],
    related: ["stride", "risk", "asvs"],
    route: "architecture",
  },
  {
    id: "stride",
    title: { sk: "Analýza STRIDE", en: "STRIDE analysis" },
    intro: {
      sk: "STRIDE je pomôcka na hľadanie rôznych typov hrozieb. Pri každej hranici alebo komponente sa pýtajte, kto môže vykonať akciu, čo získa a aké existujú ochrany.",
      en: "STRIDE is a prompt for exploring different threat types. At each boundary or component, ask who could act, what they could achieve and which protections exist.",
    },
    steps: [
      { sk: "S — Spoofing: vydávanie sa za inú identitu. T — Tampering: neoprávnená zmena údajov. R — Repudiation: popretie vykonanej akcie.", en: "S — Spoofing: impersonating an identity. T — Tampering: unauthorized data modification. R — Repudiation: denying an action." },
      { sk: "I — Information Disclosure: únik informácií. D — Denial of Service: obmedzenie dostupnosti. E — Elevation of Privilege: získanie vyšších oprávnení.", en: "I — Information Disclosure: exposing information. D — Denial of Service: degrading availability. E — Elevation of Privilege: gaining unauthorized privileges." },
      { sk: "Obrazovka STRIDE poskytuje príklady a zobrazuje súvisiace hrozby z registra. Konkrétne scenáre, pravdepodobnosť a mitigácie spravujte v registri; kategória sama neurčuje riziko.", en: "The STRIDE screen provides examples and shows related register entries. Manage concrete scenarios, likelihood and treatments in the register; a category alone does not determine risk." },
    ],
    related: ["concepts", "architecture", "risk"],
    route: "stride",
  },
  {
    id: "asvs",
    title: { sk: "Pracovný priestor ASVS", en: "ASVS workspace" },
    intro: {
      sk: "ASVS 5.0 rozdeľuje požiadavky do 17 kapitol a úrovní L1–L3. Vybraná úroveň vymedzuje rozsah; vyššia úroveň znamená prísnejšie overovanie, nie automatické potvrdenie bezpečnosti.",
      en: "ASVS 5.0 groups requirements into 17 chapters and levels L1–L3. The selected level defines scope; a higher level means more demanding verification, not automatic assurance.",
    },
    steps: [
      { sk: "Vyberte cieľovú úroveň a kapitolu alebo sekciu. Pri každej požiadavke prezrite anglický originál a návod na overenie, prepojte relevantný komponent a zaznamenajte dôkaz alebo odkaz.", en: "Choose a target level and chapter or section. Read each original English requirement and its verification guidance, link a relevant component and record evidence or a reference." },
      { sk: "Implemented znamená splnené a overené; Partial čiastočne splnené; Missing chýbajúce; N/A odôvodnene neaplikovateľné. Nezamieňajte chýbajúci dôkaz za potvrdené splnenie.", en: "Implemented means fulfilled and verified; Partial means partly fulfilled; Missing means absent; N/A means justified as not applicable. Do not treat missing evidence as proof of implementation." },
      { sk: "Technologická triáž pomáha vylúčiť nepoužívané oblasti označením N/A. Najprv overte rozsah a dôvod; pri zmene technológií odpovede znovu posúďte. Triáž nenahrádza odborné posúdenie.", en: "Technology triage can mark unused areas N/A. Check the scope and reason first, and revisit answers when technologies change. Triage does not replace professional judgment." },
      { sk: "Kláves / zameria vyhľadávanie ASVS, šípky vyberajú kapitoly a Escape vymaže hľadaný text. Filtre sa ukladajú pre jednotlivé analýzy.", en: "Press / to focus ASVS search, use arrow keys to select chapters and Escape to clear the search. Filters are stored per analysis." },
      { sk: "Pokrytie = (Implemented + 0,5 × Partial) / (Implemented + Partial + Missing), zaokrúhlené na percentá; N/A, nevyhodnotené a vyššie úrovne sa nezapočítavajú. Bez vyhodnotených kontrol je 0 %. Percento nie je bezpečnostné skóre celého systému.", en: "Coverage = (Implemented + 0.5 × Partial) / (Implemented + Partial + Missing), rounded to percent; N/A, unevaluated and higher-level requirements are excluded. With no evaluated controls it is 0%. This is not a security score for the whole system." },
    ],
    related: ["concepts", "chapters", "findings", "risk"],
    route: "asvs",
  },
  {
    id: "chapters",
    title: { sk: "ASVS: prehľad 17 kapitol", en: "ASVS: overview of the 17 chapters" },
    intro: {
      sk: "Názvy kapitol zostávajú v angličtine. Stručné vysvetlenia nižšie sú orientačné; presné požiadavky a podsekcie nájdete v pracovnom priestore ASVS.",
      en: "Chapter names remain in English. The brief explanations below are introductory; use the ASVS workspace for the exact requirements and subsections.",
    },
    steps: [],
    related: ["asvs", "risk"],
    route: "asvs",
  },
  {
    id: "risk",
    title: { sk: "Register hrozieb a analýza rizika", en: "Threat register and risk assessment" },
    intro: {
      sk: "Register zhromažďuje scenáre, ich pravdepodobnosť, dopad a spôsob riešenia. Popíšte aktéra, cieľ, cestu útoku a dôsledok tak, aby iný človek scenár vedel posúdiť.",
      en: "The register collects scenarios, their likelihood, impact and treatment. Describe the actor, target, attack path and consequence so another person can review the scenario.",
    },
    steps: [
      { sk: "Pridajte vlastnú hrozbu alebo skontrolujte návrh z DFD. Vyberte STRIDE, dotknuté komponenty a relevantné ASVS odkazy; návrhy odkazov sú heuristické a treba ich overiť.", en: "Add a manual threat or review a DFD suggestion. Choose its STRIDE category, affected components and relevant ASVS references; suggested references are heuristic and must be checked." },
      { sk: "Matica 4×4 násobí pravdepodobnosť 1–4 a dopad 1–4: 1 = Very Low, 2–3 = Low, 4–7 = Medium, 8–11 = High, 12–16 = Critical. Napríklad 3 × 3 = 9, teda High. Stupnice sú model aplikácie, nie univerzálna norma.", en: "The 4×4 matrix multiplies likelihood 1–4 by impact 1–4: 1 = Very Low, 2–3 = Low, 4–7 = Medium, 8–11 = High, 12–16 = Critical. For example, 3 × 3 = 9, or High. These scales are the application's model, not a universal standard." },
      { sk: "Zapíšte plán mitigácie, určte zodpovednú osobu mimo aplikácie a priebežne prehodnocujte pravdepodobnosť a dopad. Open sa počíta medzi otvorené riziká; Mitigated, Remediated a Accepted zostávajú v registri, ale nie v počte otvorených.", en: "Record a mitigation plan, assign an owner outside the app and reassess likelihood and impact as circumstances change. Open counts as open risk; Mitigated, Remediated and Accepted remain in the register but not the open count." },
      { sk: "Ak riziko prijímate, zdokumentujte dôvod a schválenie podľa pravidiel organizácie. Aplikácia sama nezabezpečuje schvaľovací proces ani automaticky neprepočítava pôvodné a zvyškové riziko ako samostatné hodnoty.", en: "If accepting risk, document the reason and approval according to your organization's process. The application does not itself enforce approvals or separately calculate inherent and residual risk." },
    ],
    related: ["architecture", "stride", "asvs", "export"],
    route: "threats",
  },
  {
    id: "findings",
    title: { sk: "Zistenia a nedostatky", en: "Findings and gaps" },
    intro: {
      sk: "Zistenie je zaznamenaný výsledok hodnotenia; nedostatok je chýbajúca alebo čiastočne splnená kontrola. Zistenia pomáhajú plánovať nápravu, ale nie sú automaticky potvrdenými zraniteľnosťami.",
      en: "A finding is a recorded assessment result; a gap is a missing or partially satisfied control. Findings help plan remediation but are not automatically confirmed vulnerabilities.",
    },
    steps: [
      { sk: "Najprv v ASVS nastavte stav požiadaviek a dôkazy. Tlačidlo Vytvoriť analýzu nedostatkov vytvorí zistenia z požiadaviek Missing a Partial; nekontroluje architektúru ani nevyhľadáva zraniteľnosti.", en: "First set ASVS requirement statuses and evidence. Generate Gap Analysis creates findings from Missing and Partial requirements; it does not scan the architecture or discover vulnerabilities." },
      { sk: "Po opätovnom vytvorení sa zachová stav zodpovedajúceho existujúceho zistenia; položky, ktoré už nie sú Missing alebo Partial, zo zoznamu zmiznú. Ak potrebujete históriu zistení, pred zmenami exportujte ich CSV.", en: "Regeneration preserves the status of a matching existing finding; items no longer Missing or Partial disappear from the list. Export findings to CSV before changes if you need their history." },
      { sk: "Predvolená závažnosť vychádza z úrovne ASVS (L1 Low, L2 Medium, L3 High), nie z individuálnej analýzy rizika. Posúďte prioritu v kontexte registra hrozieb; zistenia možno exportovať do CSV.", en: "Default severity comes from the ASVS level (L1 Low, L2 Medium, L3 High), not an individual risk assessment. Review priority in the context of the threat register; findings can be exported to CSV." },
    ],
    related: ["asvs", "risk", "audit", "export"],
    route: "findings",
  },
  {
    id: "export",
    title: { sk: "Export reportov", en: "Report export" },
    intro: {
      sk: "Export slúži na zdieľanie výsledkov; pred odovzdaním skontrolujte rozsah, údaje, dôkazy a citlivosť obsahu. Report nie je náhradou zálohy projektu.",
      en: "Exports share assessment results; review scope, data, evidence and sensitivity before distribution. A report is not a substitute for a project backup.",
    },
    steps: [
      { sk: "PDF pre manažérov: na stránke exportu otvorte náhľad a v tlačovom dialógu zvoľte uloženie do PDF. Report používa uloženú cieľovú úroveň ASVS pracovnej verzie a aktuálne údaje, nie archívny snapshot; filtre tabuľkového exportu sa naň nevzťahujú.", en: "PDF for managers: open the preview on the export page and choose save as PDF in the print dialog. The report uses the saved working-version ASVS target level and current data, not an archived snapshot; spreadsheet filters do not apply." },
      { sk: "PDF sumarizuje kapitoly a počty otvorených hrozieb; detail registra hrozieb je v Exceli. Zobrazuje najviac osem požiadaviek Missing a Partial podľa stavu, úrovne a ID, nie podľa individuálneho rizika ani stavu zistenia. Pomlčka namiesto pokrytia znamená, že nebola vyhodnotená žiadna požiadavka; predvolené alebo ukážkové údaje sú označené.", en: "The PDF summarizes chapters and counts of open threats; threat register details are in Excel. It shows at most eight Missing and Partial requirements ordered by status, level and ID, not individual risk or finding status. A dash instead of coverage means no requirements were evaluated; default or demonstration data is identified." },
      { sk: "Excel (.xlsx) pre audítorov: vyberte súhrn, detail požiadaviek a/alebo register hrozieb. Zvolený hárok hrozieb je prázdny, ak register neobsahuje záznamy. Čitateľná výška riadkov umožňuje zobraziť dlhší text; pri kompaktnej ho môže byť potrebné rozbaliť.", en: "Excel (.xlsx) for auditors: choose the summary, requirements detail and/or threat register. The selected threat sheet is empty when there are no threats. Comfortable row height allows longer text to be shown; compact rows may need expanding." },
      { sk: "CSV požiadaviek ASVS na stránke exportu obsahuje riadky požiadaviek, nie register hrozieb ani stavy zistení. Samostatné CSV v sekcii Zistenia a nedostatky obsahuje vytvorený zoznam zistení, ich závažnosť a stav. CSV nie je obnoviteľná záloha.", en: "Requirements CSV on the export page contains ASVS requirement rows, not the threat register or findings statuses. Separate CSV in Findings & Gaps contains the generated findings list, severity and status. CSV is not a restorable backup." },
      { sk: "Úroveň ASVS na stránke exportu obmedzí detail aj súhrn Excelu; filter iba nedostatkov obmedzí len detail požiadaviek a CSV na Missing a Partial. Súhrn pokrýva celý zvolený rozsah a register hrozieb sa týmito filtrami neobmedzuje. Náhľad riadkov zodpovedá detailu, nie súhrnu.", en: "The export-page ASVS level limits Excel detail and summary; gaps-only limits only requirements detail and CSV to Missing and Partial. The summary covers the whole selected scope and the threat register is not restricted by these filters. The row preview reflects detail, not the summary." },
      { sk: "Rýchly export v ASVS používa cieľovú úroveň a jazyk rozhrania, nie filtre kapitoly, stavu či vyhľadávania. Jazyk PDF, Excelu a CSV požiadaviek na stránke exportu sa vyberá samostatne; hlavičky CSV zistení sa riadia jazykom rozhrania. Používateľské texty a názvy kapitol ASVS sa neprekladajú. Integrácie vyžadujúce anglické hlavičky CSV musia zvoliť angličtinu.", en: "Quick export in ASVS uses the target level and interface language, not chapter, status or search filters. PDF, Excel and requirements CSV use the independent report-language selector; findings CSV headers follow the interface language. User text and ASVS chapter names are not translated. Integrations needing English CSV headers must select English." },
      { sk: "Všetky reporty sú snímkou údajov pri exporte. Po zmenách ich vytvorte znovu; úprava buniek v Exceli neprepočíta súhrn. JSON záloha slúži na obnovu, ale neobsahuje samostatný zoznam zistení a jeho stavy.", en: "All reports are snapshots at export time. Generate them again after changes; editing Excel cells does not recalculate its summary. JSON backup is for restoration, but excludes the separate findings list and its statuses." },
    ],
    related: ["asvs", "findings", "storage"],
    route: "export",
  },
  {
    id: "audit",
    title: { sk: "Auditná stopa a verzie", en: "Activity log and versions" },
    intro: {
      sk: "Auditná stopa zobrazuje lokálne zaznamenané aktivity a poznámky. Je uložená v prehliadači, dá sa upraviť a nie je autentifikovaným ani nezmeniteľným auditným logom.",
      en: "The activity log shows locally recorded actions and notes. It is stored in the browser, can be edited and is neither authenticated nor immutable.",
    },
    steps: [
      { sk: "Pridávajte užitočné poznámky bez tajomstiev a pri významných zmenách vytvorte finálnu verziu. História umožňuje zobraziť uložené snapshoty; porovnanie verzií zobrazuje rozdiely oproti inému stavu.", en: "Add useful notes without secrets and create a final version at significant milestones. History lets you view saved snapshots; version comparison shows differences from another state." },
      { sk: "Historický snapshot je určený na prezeranie; pre ďalšiu prácu sa vráťte k aktívnej verzii. Verzia ani auditná stopa nenahrádzajú externú zálohu alebo riadené schvaľovanie.", en: "Historical snapshots are for viewing; return to the active version to continue working. Neither versions nor the activity log replace an external backup or controlled approval process." },
    ],
    related: ["findings", "export", "storage"],
    route: "audit",
  },
  {
    id: "storage",
    title: { sk: "Zálohy, súkromie a jazyk", en: "Backups, privacy and language" },
    intro: {
      sk: "Pracovné údaje sú prevažne v lokálnom úložisku prehliadača alebo Electron aplikácie. Medzi zariadeniami, prehliadačmi a webovou/desktopovou verziou sa automaticky nesynchronizujú.",
      en: "Workspace data is primarily stored in browser or Electron local storage. It is not automatically synchronized across devices, browsers or the web and desktop versions.",
    },
    steps: [
      { sk: "Pomocou Záloha a obnova pravidelne exportujte JSON a bezpečne ho uložte; pred importom skontrolujte zvolený spôsob obnovy. JSON zahŕňa kontext, architektúru, ASVS, hrozby a verzie, ale nie samostatný zoznam zistení ani jeho stavy; tie exportujte do CSV. CSV nie je možné spätne obnoviť ako JSON zálohu.", en: "Use Backup & Restore to export JSON regularly and store it safely; check the restore mode before importing. JSON includes context, architecture, ASVS, threats and versions, but not the separate findings list or its statuses; export those to CSV. CSV cannot be restored as a JSON backup." },
      { sk: "Zálohy a reporty môžu obsahovať citlivú architektúru, dôkazy a hrozby: šifrujte ich a obmedzte prístup. Obnovu si bezpečne vyskúšajte predtým, než sa na zálohu spoľahnete.", en: "Backups and reports can contain sensitive architecture, evidence and threats: encrypt them and restrict access. Test restoration safely before relying on a backup." },
      { sk: "Prepínač s vlajkou mení SK/EN rozhranie bez zmeny uložených údajov. Jazyk exportu sa vyberá samostatne; existujúce poznámky, historické záznamy a používateľské texty sa neprekladajú.", en: "The flag switch changes the SK/EN interface without changing stored data. Report language is selected separately; existing notes, historical records and user text are not translated." },
      { sk: "Lokálny profil a auditný záznam nie sú autentifikácia ani nezmeniteľný audit. Vývojové API nemá autentifikáciu; nevystavujte ho nedôveryhodnej sieti bez ďalších ochranných opatrení.", en: "The local profile and activity log are not authentication or an immutable audit. The development API is unauthenticated; do not expose it to an untrusted network without additional safeguards." },
      { sk: "Globálne vyhľadávanie otvoríte Ctrl/Cmd+K; navigáciu na počítači možno pripnúť. Príručka funguje aj offline, externé zdroje vyžadujú internet.", en: "Open global search with Ctrl/Cmd+K; desktop navigation can be pinned. The guide works offline, while external references require internet access." },
    ],
    related: ["start", "audit", "export"],
  },
];

export const guideChapterDescriptions: Record<number, GuideText> = {
  1: { sk: "Kódovanie a sanitizácia vstupov a výstupov vrátane ochrany pred injekciami.", en: "Input and output encoding and sanitization, including injection prevention." },
  2: { sk: "Validácia údajov a pravidlá obchodnej logiky, napríklad kontrola poradia operácií.", en: "Data validation and business-logic rules, such as enforcing operation order." },
  3: { sk: "Bezpečnosť webového rozhrania a spracovania obsahu v prehliadači.", en: "Security of the web frontend and browser-side content handling." },
  4: { sk: "Ochrana API a webových služieb, ich rozhraní a komunikácie.", en: "Protection of APIs, web services, their interfaces and communication." },
  5: { sk: "Bezpečné nahrávanie, spracovanie, ukladanie a sprístupnenie súborov.", en: "Safe upload, processing, storage and delivery of files." },
  6: { sk: "Overovanie identity vrátane správy autentifikátorov a obnovy prístupu.", en: "Identity verification, including authenticator management and account recovery." },
  7: { sk: "Vytváranie, ochrana a ukončovanie používateľských relácií.", en: "Creating, protecting and terminating user sessions." },
  8: { sk: "Autorizačné pravidlá a kontrola prístupu k funkciám a údajom.", en: "Authorization rules and access checks for functions and data." },
  9: { sk: "Vydávanie a overovanie samostatných tokenov a ich obmedzení.", en: "Issuing and validating self-contained tokens and their constraints." },
  10: { sk: "Bezpečné používanie autorizačných a identitných protokolov OAuth a OIDC.", en: "Safe use of OAuth and OIDC authorization and identity protocols." },
  11: { sk: "Kryptografické operácie a správa kľúčov; zamerajte sa aj na ich životný cyklus.", en: "Cryptographic operations and key management, including their lifecycle." },
  12: { sk: "Ochrana údajov pri komunikácii a konfigurácia bezpečného transportu.", en: "Protecting data in transit and configuring secure transport." },
  13: { sk: "Bezpečné nastavenie aplikácie a prostredia vrátane citlivých konfigurácií.", en: "Secure application and environment configuration, including sensitive settings." },
  14: { sk: "Ochrana citlivých údajov pri ukladaní, používaní a sprístupnení.", en: "Protecting sensitive data during storage, use and disclosure." },
  15: { sk: "Bezpečné programovanie a architektonické postupy naprieč aplikáciou.", en: "Secure coding and architectural practices across the application." },
  16: { sk: "Bezpečnostné záznamy a spracovanie chýb bez zbytočného úniku údajov.", en: "Security logging and error handling without unnecessary data exposure." },
  17: { sk: "Bezpečnostné aspekty WebRTC a komunikácie v reálnom čase, ak sa používajú.", en: "Security aspects of WebRTC and real-time communication when used." },
};
