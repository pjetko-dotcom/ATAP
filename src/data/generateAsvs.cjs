const fs = require('fs');

const chapters = [
  "Architecture, Design and Threat Modeling",
  "Authentication",
  "Session Management",
  "Access Control",
  "Validation, Sanitization and Encoding",
  "Stored Cryptography",
  "Error Handling and Logging",
  "Data Protection",
  "Communications",
  "Malicious Code",
  "Business Logic",
  "File and Resources",
  "API and Web Service",
  "Configuration",
  "GraphQL",
  "Cloud and Serverless",
  "Microservices"
];

const requirements = [];

let idCounter = 1;
for (let i = 0; i < chapters.length; i++) {
  const chapterNum = i + 1;
  const numReqs = Math.floor(Math.random() * 5) + 18; // 18-22 reqs per chapter (approx 340 total)
  
  for (let j = 1; j <= numReqs; j++) {
    const level = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
    requirements.push({
      id: `V${chapterNum}.${j}`,
      chapterId: chapterNum,
      title: `Verify that ${chapters[i].toLowerCase()} requirement ${j} is properly implemented and documented.`,
      description: `Detailed description for requirement V${chapterNum}.${j} to ensure enterprise-grade security compliance.`,
      level: level,
      status: "N/A", // Default unassessed
      traceability: [],
      notes: ""
    });
  }
}

const fileContent = `
export interface ASVSChapter {
  id: number;
  name: string;
}

export interface ASVSRequirement {
  id: string;
  chapterId: number;
  title: string;
  description: string;
  level: number;
  status: "Implemented" | "Partial" | "Missing" | "N/A";
  traceability: { id: string; color: string }[];
  notes: string;
}

export const asvsChapters: ASVSChapter[] = ${JSON.stringify(chapters.map((name, i) => ({ id: i + 1, name })), null, 2)};

export const asvsRequirements: ASVSRequirement[] = ${JSON.stringify(requirements, null, 2)};
`;

fs.writeFileSync('src/data/asvsData.ts', fileContent);
console.log('Generated asvsData.ts');
