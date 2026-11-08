import { asvsRequirements } from "../data/asvsData";

export interface ThreatAsvsSuggestion {
  id: string;
  sectionName: string;
  description: string;
}

const STRIDE_SECTION_PRIORITIES: Record<string, string[]> = {
  Spoofing: ["V6.2", "V6.3", "V6.5", "V7.2", "V7.5", "V9.1", "V10.1"],
  Tampering: ["V1.2", "V1.3", "V2.2", "V2.3", "V4.2", "V5.2", "V8.2"],
  Repudiation: ["V16.2", "V16.3", "V16.4", "V16.5"],
  "Information Disclosure": ["V3.3", "V11.2", "V12.1", "V13.4", "V14.2", "V16.5"],
  "Denial of Service": ["V2.4", "V4.1", "V5.2", "V15.4", "V17.2", "V17.3"],
  "Elevation of Privilege": ["V6.3", "V8.2", "V8.3", "V9.1", "V10.3", "V15.3"],
};

const STOP_WORDS = new Set([
  "about", "after", "also", "and", "are", "attacker", "before", "between", "could",
  "from", "have", "into", "over", "that", "their", "there", "these", "this", "through",
  "under", "used", "using", "when", "where", "which", "with", "would", "your",
]);

const TERM_EXPANSIONS: Array<[RegExp, string]> = [
  [/\bxss\b/gi, "cross site scripting output encoding sanitization"],
  [/\bsql\b/gi, "database query injection"],
  [/\bcsrf\b/gi, "cross site request forgery"],
  [/\bbrute[\s-]?force\b/gi, "password credential anti-automation rate-limiting authentication"],
  [/\bcredential stuffing\b/gi, "credential password anti-automation rate-limiting"],
  [/\bhijack(?:ing)?\b/gi, "session cookie token"],
  [/\b(?:ddos|dos)\b/gi, "denial service resource rate-limiting availability"],
  [/\bprivilege escalation\b/gi, "authorization access control"],
  [/\bleak(?:age|ing)?\b/gi, "disclosure sensitive information"],
];

function tokenize(value: string): Set<string> {
  return new Set(
    value.toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 2 && !STOP_WORDS.has(token))
  );
}

const requirementTokens = asvsRequirements.map(requirement =>
  tokenize(`${requirement.title} ${requirement.sectionName || ""} ${requirement.description}`)
);
const tokenFrequency = new Map<string, number>();
for (const tokens of requirementTokens) {
  for (const token of tokens) tokenFrequency.set(token, (tokenFrequency.get(token) || 0) + 1);
}

export function suggestThreatAsvsRequirements(
  stride: string,
  title: string,
  description: string,
  limit = 5
): ThreatAsvsSuggestion[] {
  const searchText = TERM_EXPANSIONS.reduce(
    (text, [pattern, expansion]) => text.replace(pattern, expansion),
    `${title} ${description}`
  );
  const queryTokens = tokenize(searchText);
  if (!queryTokens.size || limit <= 0) return [];

  const priorities = STRIDE_SECTION_PRIORITIES[stride] || [];
  const scored = asvsRequirements.map((requirement, index) => {
    const titleTokens = tokenize(requirement.title);
    const sectionTokens = tokenize(requirement.sectionName || "");
    const descriptionTokens = tokenize(requirement.description);
    let score = 0;

    for (const token of queryTokens) {
      const frequency = tokenFrequency.get(token) || 0;
      const inverseDocumentFrequency = Math.log(1 + asvsRequirements.length / (frequency + 1));
      if (titleTokens.has(token)) score += inverseDocumentFrequency * 2;
      if (sectionTokens.has(token)) score += inverseDocumentFrequency * 1.5;
      if (descriptionTokens.has(token)) score += inverseDocumentFrequency;
    }

    const priority = priorities.indexOf(requirement.sectionId || "");
    if (priority >= 0) score += 0.3 / (priority + 1);

    return { requirement, score };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.requirement.id.localeCompare(b.requirement.id));

  const sectionCounts = new Map<string, number>();
  const suggestions: ThreatAsvsSuggestion[] = [];
  for (const { requirement } of scored) {
    const sectionId = requirement.sectionId || requirement.id;
    const sectionCount = sectionCounts.get(sectionId) || 0;
    if (sectionCount >= 2) continue;

    suggestions.push({
      id: requirement.id,
      sectionName: requirement.sectionName || requirement.chapterName || "",
      description: requirement.description,
    });
    sectionCounts.set(sectionId, sectionCount + 1);
    if (suggestions.length >= limit) break;
  }

  return suggestions;
}
