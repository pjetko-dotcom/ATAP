import { reportText, type ReportLanguage } from "../utils/reportLanguage";

export interface CategorizationQuestionOption {
  id: string;
  label: string;
  description?: string;
  suggestedLevel: "1" | "2" | "3";
  isIndicator?: boolean; // if true, pushes towards L2 or L3
}

export interface CategorizationQuestion {
  id: string;
  order: number;
  blockTitle: string;
  question: string;
  subQuestions: string[];
  guidance: string;
  options: CategorizationQuestionOption[];
}

export const projectCategorizationQuestions: CategorizationQuestion[] = [
  {
    id: "cat-1-data-type",
    order: 1,
    blockTitle: "1. Typ spracúvaných dát",
    question: "Aký typ dát aplikácia spracúva?",
    subQuestions: [
      "Obsahuje aplikácia osobné údaje (PII), alebo bankové údaje?",
      "Spracúva aplikácia interné alebo obchodne kritické dáta, ktorých únik by mal priamy finančný alebo regulačný dopad?",
      "Pracuje aplikácia výhradne s verejnými alebo nekritickými dátami?"
    ],
    guidance: "Spracúvanie PII, platobných alebo bankových údajov vyžaduje minimálne L2. Výlučne verejné dáta umožňujú L1.",
    options: [
      {
        id: "public",
        label: "Výhradne verejné alebo nekritické dáta",
        description: "Dáta sú verejne prístupné bez citlivých informácií. Únik nespôsobí škodu.",
        suggestedLevel: "1",
        isIndicator: false
      },
      {
        id: "internal-pii",
        label: "Osobné údaje (PII), interné alebo finančne citlivé dáta",
        description: "Bežné osobné údaje používateľov, interné firemné záznamy, objednávky alebo účtovné doklady.",
        suggestedLevel: "2",
        isIndicator: true
      },
      {
        id: "high-value-banking",
        label: "Bankové, zdravotné (HIPAA) alebo prísne utajované dáta",
        description: "Platobné karty (PCI DSS), heslá a kľúče, zdravotná dokumentácia alebo kritické obchodné tajomstvá.",
        suggestedLevel: "3",
        isIndicator: true
      }
    ]
  },
  {
    id: "cat-2-criticality",
    order: 2,
    blockTitle: "2. Kritickosť z pohľadu dostupnosti a integrity",
    question: "Aká je kritickosť aplikácie z pohľadu dostupnosti a integrity?",
    subQuestions: [
      "Mohla by porucha dostupnosti alebo integrity aplikácie ohroziť kritickú infraštruktúru?",
      "Ide o aplikáciu, ktorá vykonáva transakcie s vysokou hodnotou alebo je dôveryhodným identitným systémom pre iné aplikácie?",
      "Je to bežná webová alebo mobilná aplikácia bez priameho dosahu na fyzickú bezpečnosť?"
    ],
    guidance: "Ohrozenie kritickej infraštruktúry alebo transakcie s vysokou hodnotou smerujú projekt do L3.",
    options: [
      {
        id: "standard-app",
        label: "Bežná webová / mobilná aplikácia",
        description: "Aplikácia bez priameho dopadu na kritické služby, fyzickú bezpečnosť či likviditu spoločnosti.",
        suggestedLevel: "1",
        isIndicator: false
      },
      {
        id: "trusted-identity",
        label: "Dôveryhodný identitný systém / významné transakcie",
        description: "Aplikácia slúži ako SSO/IdP pre iné systémy alebo spracováva významné obchodné a finančné transakcie.",
        suggestedLevel: "2",
        isIndicator: true
      },
      {
        id: "critical-infra",
        label: "Kritická infraštruktúra / transakcie s mimoriadnou hodnotou",
        description: "Zlyhanie dostupnosti alebo integrity by priamo ohrozilo kritickú infraštruktúru, bezpečnosť osôb alebo chod štátu.",
        suggestedLevel: "3",
        isIndicator: true
      }
    ]
  },
  {
    id: "cat-3-regulations",
    order: 3,
    blockTitle: "3. Regulačné a zmluvné požiadavky",
    question: "Aké regulačné alebo zmluvné požiadavky sa na projekt vzťahujú?",
    subQuestions: [
      "Vyžaduje projekt súlad s PCI DSS, GDPR, DORA alebo inými sektorovými reguláciami?"
    ],
    guidance: "Regulácie ako GDPR, PCI DSS, DORA či NIS2 vyžadujú obranu proti moderným útokom (L2 alebo L3).",
    options: [
      {
        id: "none-minimal",
        label: "Bez špecifických sektorových regulácií",
        description: "Na projekt sa nevzťahujú prísne regulačné audity ani medzinárodné bezpečnostné normy.",
        suggestedLevel: "1",
        isIndicator: false
      },
      {
        id: "gdpr-dora-pci",
        label: "Súlad s GDPR, PCI DSS, NIS2, DORA alebo ISO 27001",
        description: "Projekt podlieha legislatívnym požiadavkám na ochranu osobných údajov, kybernetickú bezpečnosť a finančný dohľad.",
        suggestedLevel: "2",
        isIndicator: true
      },
      {
        id: "strict-financial-defense",
        label: "Prísne normy pre bankový / vojenský / jadrový sektor",
        description: "Mandatórny formálny audit bezpečnosti, certifikácia Common Criteria alebo požiadavky centrálnej banky na L3.",
        suggestedLevel: "3",
        isIndicator: true
      }
    ]
  },
  {
    id: "cat-4-trust",
    order: 4,
    blockTitle: "4. Miera dôveryhodnosti a verifikácie",
    question: "Akú mieru dôveryhodnosti musí aplikácia preukázať?",
    subQuestions: [
      "Je potrebné, aby aplikácia prešla nezávislým overením s prístupom k zdrojovému kódu a formálnym threat modelingom?",
      "Postačuje automatizované skenovanie a penetračné testovanie bez prístupu ku kódu?",
      "Je vyžadovaná defense-in-depth architektúra a viacnásobné nezávislé hodnotenia?"
    ],
    guidance: "L1 je plne automatizovateľné z vonku. L2 vyžaduje threat modeling a code review. L3 vyžaduje hĺbkový defense-in-depth.",
    options: [
      {
        id: "automated-scans",
        label: "Postačuje automatizované skenovanie a black-box testovanie",
        description: "Základné overenie vonkajších zraniteľností pomocou nástrojov a penetračného testu bez hĺbkového auditu kódu.",
        suggestedLevel: "1",
        isIndicator: false
      },
      {
        id: "code-review-threat-model",
        label: "Nezávislé overenie s prístupom ku kódu a threat modelingu",
        description: "Preukázanie bezpečnosti hybridným prístupom: analýza architektúry, audit kódu a manuálne overenie kontrol.",
        suggestedLevel: "2",
        isIndicator: true
      },
      {
        id: "defense-in-depth",
        label: "Defense-in-depth architektúra a viacnásobné nezávislé audity",
        description: "Prísna verifikácia na všetkých vrstvách, formálne matematické dôkazy a redundantné nezávislé certifikácie.",
        suggestedLevel: "3",
        isIndicator: true
      }
    ]
  },
  {
    id: "cat-5-practical-resources",
    order: 5,
    blockTitle: "5. Praktické možnosti overenia v projekte",
    question: "Aké sú praktické možnosti overenia v rámci projektu?",
    subQuestions: [
      "Je k dispozícii prístup k zdrojovému kódu, dokumentácii, konfigurácii a kľúčovým osobám?",
      "Plánuje sa overenie realizovať len black-box testovaním (bez prístupu k interným zdrojom)?"
    ],
    guidance: "Bez prístupu k zdrojovému kódu a architektom nie je možné dosiahnuť plný L2 ani L3 súlad.",
    options: [
      {
        id: "black-box-only",
        label: "Len black-box testovanie (bez prístupu k interným zdrojom)",
        description: "Audítor/tím nemá prístup k repozitáru kódu, backend konfiguráciám ani vývojárom. Realizovateľné je iba L1.",
        suggestedLevel: "1",
        isIndicator: false
      },
      {
        id: "full-access-code",
        label: "Plný prístup k repozitáru kódu, dokumentácii a tímu",
        description: "Tím disponuje prístupom k zdrojovým kódom, architektúre, CI/CD pipeline a vývojárom.",
        suggestedLevel: "2",
        isIndicator: true
      }
    ]
  }
];

export interface CategorizationEvaluationResult {
  recommendedLevel: "1" | "2" | "3";
  levelName: string;
  rationale: string[];
  guidanceText: string;
}

export function evaluateProjectCategorization(
  answers: Record<string, string>,
  language: ReportLanguage = "sk"
): CategorizationEvaluationResult {
  const t = (sk: string, en: string) => reportText(language, sk, en);
  const chosenOptions: CategorizationQuestionOption[] = [];

  projectCategorizationQuestions.forEach((q) => {
    const chosenId = answers[q.id];
    if (chosenId) {
      const opt = q.options.find((o) => o.id === chosenId);
      if (opt) chosenOptions.push(opt);
    }
  });

  const rationale: string[] = [];

  // Check if black-box only was selected
  const isBlackBoxOnly = answers["cat-5-practical-resources"] === "black-box-only";

  const hasL3Data = answers["cat-1-data-type"] === "high-value-banking";
  const hasL3Criticality = answers["cat-2-criticality"] === "critical-infra";
  const hasL3Regulation = answers["cat-3-regulations"] === "strict-financial-defense";
  const hasL3Trust = answers["cat-4-trust"] === "defense-in-depth";

  const hasL2Data = answers["cat-1-data-type"] === "internal-pii" || hasL3Data;
  const hasL2Criticality = answers["cat-2-criticality"] === "trusted-identity" || hasL3Criticality;
  const hasL2Regulation = answers["cat-3-regulations"] === "gdpr-dora-pci" || hasL3Regulation;
  const hasL2Trust = answers["cat-4-trust"] === "code-review-threat-model" || hasL3Trust;

  let recommendedLevel: "1" | "2" | "3" = "1";

  if (hasL3Data || hasL3Criticality || hasL3Regulation || hasL3Trust) {
    if (isBlackBoxOnly) {
      recommendedLevel = "1";
      rationale.push(
        t("Aplikácia má charakteristiky L3, avšak kvôli obmedzeniu iba na black-box overenie (otázka 5) nie je možné overiť požiadavky L2/L3 vyžadujúce kontrolu kódu. Odporúča sa zabezpečiť prístup ku kódu pre L3.", "The application has L3 characteristics, but black-box-only testing (question 5) cannot verify L2/L3 requirements that require code review. Obtain code access for L3.")
      );
    } else {
      recommendedLevel = "3";
      if (hasL3Criticality) rationale.push(t("Kritická infraštruktúra alebo transakcie mimoriadnej hodnoty vyžadujú najvyššiu záruku (L3).", "Critical infrastructure or exceptionally high-value transactions require the highest assurance (L3)."));
      if (hasL3Data) rationale.push(t("Spracovanie prísne chránených bankových, zdravotných alebo štátnych tajomstiev vyžaduje L3.", "Processing highly protected banking, health or state secrets requires L3."));
      if (hasL3Regulation) rationale.push(t("Sektorové regulácie a vojensko-bankové audity vyžadujú úroveň L3.", "Sector regulations and military or banking audits require L3."));
      if (hasL3Trust) rationale.push(t("Požadovaná defense-in-depth architektúra a viacnásobná verifikácia zodpovedá L3.", "Required defence-in-depth architecture and multiple verifications correspond to L3."));
    }
  } else if (hasL2Data || hasL2Criticality || hasL2Regulation || hasL2Trust) {
    if (isBlackBoxOnly) {
      recommendedLevel = "1";
      rationale.push(
        t("Aplikácia spracúva citlivé dáta (L2), ale overenie je obmedzené iba na black-box bez kódu. Pre dosiahnutie L2 je potrebný hybridný audit.", "The application processes sensitive data (L2), but verification is limited to black-box testing without code. A hybrid audit is needed for L2.")
      );
    } else {
      recommendedLevel = "2";
      if (hasL2Data) rationale.push(t("Spracovanie osobných údajov (PII) a interných dát je štandardom pre úroveň L2.", "Processing personal information (PII) and internal data is typical for L2."));
      if (hasL2Regulation) rationale.push(t("Súlad s GDPR, PCI DSS, DORA alebo NIS2 je priamo naviazaný na úroveň L2.", "GDPR, PCI DSS, DORA or NIS2 compliance is directly linked to L2."));
      if (hasL2Criticality) rationale.push(t("Dôveryhodný identitný systém / dôležité transakcie vyžadujú L2.", "A trusted identity system or important transactions require L2."));
    }
  } else {
    recommendedLevel = "1";
    rationale.push(t("Aplikácia pracuje výhradne s verejnými alebo nekritickými dátami bez prísnych regulácií, preto je L1 plne postačujúca a nákladovo najefektívnejšia.", "The application uses only public or non-critical data without strict regulations, so L1 is sufficient and most cost-effective."));
  }

  const levelNames: Record<"1" | "2" | "3", string> = {
    "1": t("ASVS Level 1 (Základná bezpečnosť / Automatizovateľná)", "ASVS Level 1 (Basic security / Automatable)"),
    "2": t("ASVS Level 2 (Odporúčané pre väčšinu aplikácií s PII / B2B / E-commerce)", "ASVS Level 2 (Recommended for most PII / B2B / e-commerce applications)"),
    "3": t("ASVS Level 3 (Kritické systémy / Banky / Zdravotníctvo / Infraštruktúra)", "ASVS Level 3 (Critical systems / Banking / Healthcare / Infrastructure)")
  };

  const guidanceText =
    t("Pozitívne odpovede na otázky v prvých troch blokoch (citlivé dáta, vysoká kritickosť, regulácia) posúvajú projekt smerom k L2 alebo L3. Ak projekt spracúva len verejné dáta a nemá špeciálne regulačné nároky, L1 je takmer vždy postačujúca a nákladovo efektívna voľba. L3 by malo byť vyhradené len pre aplikácie, kde by zlyhanie malo katastrofálne následky, a jeho zavedenie si vyžaduje explicitné obchodné zdôvodnenie.", "Positive answers in the first three areas (sensitive data, high criticality, regulation) move the project toward L2 or L3. For public data without special regulatory requirements, L1 is almost always sufficient and cost-effective. L3 should be reserved for applications whose failure would have catastrophic consequences and requires explicit business justification.");

  return {
    recommendedLevel,
    levelName: levelNames[recommendedLevel],
    rationale,
    guidanceText
  };
}
