import { projectCategorizationQuestions } from "./projectCategorizationData";

const translations = [
  {
    id: "cat-1-data-type",
    blockTitle: "1. Type of data processed",
    question: "What type of data does the application process?",
    subQuestions: ["Does the application contain personal information (PII) or banking data?", "Does it process internal or business-critical data whose disclosure would have a direct financial or regulatory impact?", "Does it work exclusively with public or non-critical data?"],
    guidance: "PII, payment or banking data requires at least L2. Exclusively public data allows L1.",
    options: [
      ["public", "Only public or non-critical data", "Data is publicly accessible and contains no sensitive information. Disclosure causes no harm."],
      ["internal-pii", "Personal information (PII), internal or financially sensitive data", "Ordinary user personal information, internal company records, orders or accounting records."],
      ["high-value-banking", "Banking, health (HIPAA) or highly classified data", "Payment cards (PCI DSS), passwords and keys, medical records or critical trade secrets."]
    ]
  },
  {
    id: "cat-2-criticality",
    blockTitle: "2. Availability and integrity criticality",
    question: "How critical is the application's availability and integrity?",
    subQuestions: ["Could an availability or integrity failure threaten critical infrastructure?", "Does the application perform high-value transactions or serve as a trusted identity system for other applications?", "Is it an ordinary web or mobile application without a direct impact on physical safety?"],
    guidance: "Threats to critical infrastructure or high-value transactions point to L3.",
    options: [
      ["standard-app", "Ordinary web / mobile application", "No direct impact on critical services, physical safety or company liquidity."],
      ["trusted-identity", "Trusted identity system / significant transactions", "The application is an SSO/IdP for other systems or processes significant business and financial transactions."],
      ["critical-infra", "Critical infrastructure / exceptionally high-value transactions", "An availability or integrity failure would directly threaten critical infrastructure, human safety or government operations."]
    ]
  },
  {
    id: "cat-3-regulations",
    blockTitle: "3. Regulatory and contractual requirements",
    question: "What regulatory or contractual requirements apply to the project?",
    subQuestions: ["Does the project require compliance with PCI DSS, GDPR, DORA or other sector regulations?"],
    guidance: "Regulations such as GDPR, PCI DSS, DORA and NIS2 require protection against modern attacks (L2 or L3).",
    options: [
      ["none-minimal", "No specific sector regulations", "The project is not subject to strict regulatory audits or international security standards."],
      ["gdpr-dora-pci", "Compliance with GDPR, PCI DSS, NIS2, DORA or ISO 27001", "The project is subject to personal data protection, cybersecurity and financial oversight requirements."],
      ["strict-financial-defense", "Strict banking / military / nuclear sector standards", "Mandatory formal security audit, Common Criteria certification or central bank requirements for L3."]
    ]
  },
  {
    id: "cat-4-trust",
    blockTitle: "4. Assurance and verification",
    question: "What level of assurance must the application demonstrate?",
    subQuestions: ["Is independent verification with source-code access and formal threat modelling required?", "Are automated scanning and penetration testing without code access sufficient?", "Are defence-in-depth architecture and multiple independent assessments required?"],
    guidance: "L1 can be automated externally. L2 requires threat modelling and code review. L3 requires in-depth defence in depth.",
    options: [
      ["automated-scans", "Automated scanning and black-box testing are sufficient", "Basic external vulnerability assessment using tools and penetration tests without an in-depth code audit."],
      ["code-review-threat-model", "Independent verification with code access and threat modelling", "A hybrid approach: architectural analysis, code audit and manual verification of controls."],
      ["defense-in-depth", "Defence-in-depth architecture and multiple independent audits", "Strict verification at every layer, formal mathematical proofs and redundant independent certifications."]
    ]
  },
  {
    id: "cat-5-practical-resources",
    blockTitle: "5. Practical verification resources",
    question: "What verification resources are available to the project?",
    subQuestions: ["Is there access to source code, documentation, configuration and key personnel?", "Is verification planned solely as black-box testing without access to internal resources?"],
    guidance: "Without access to source code and architects, full L2 or L3 compliance cannot be achieved.",
    options: [
      ["black-box-only", "Black-box testing only (no access to internal resources)", "The auditor or team has no access to the code repository, backend configuration or developers. Only L1 is feasible."],
      ["full-access-code", "Full access to the code repository, documentation and team", "The team can access source code, architecture, CI/CD pipelines and developers."]
    ]
  }
];

export const englishCategorizationQuestions = projectCategorizationQuestions.map(question => {
  const translation = translations.find(item => item.id === question.id);
  if (!translation) throw new Error(`Missing English categorization question: ${question.id}`);
  return {
    ...question,
    ...translation,
    options: question.options.map(option => {
      const translated = translation.options.find(item => item[0] === option.id);
      if (!translated) throw new Error(`Missing English categorization option: ${option.id}`);
      return { ...option, label: translated[1], description: translated[2] };
    }),
  };
});
