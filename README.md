# Automated Threat Analysis and Architecture Modeling

A professional, enterprise-grade React application for conducting automated threat analysis, tracking security requirements, and modeling architecture using standard methodologies.

## Core Features

- **ASVS Workspace**: Complete integration with OWASP Application Security Verification Standard (ASVS) 5.0. Features all 17 chapters and over 350+ requirements covering L1-L3 validation controls. You can track requirement statuses ("Implemented", "Partial", "Missing", "N/A"), map them to architecture components via traceability, and manage exceptions.
- **STRIDE Threat Modeling**: Dedicated module for analyzing system architectures against the Microsoft STRIDE model (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege). Features built-in examples and mitigation controls.
- **Threat Register**: Comprehensive tracker for identified threats. Features a dynamically generated 5x5 Risk Matrix based on Likelihood and Impact. Filter threats by STRIDE category, Risk Level, and current Status.
- **Findings & Gap Analysis**: Automated generation of security gaps by cross-referencing your architecture design and current threat register against the full ASVS 5.0 framework. Tracks findings by Severity and visualizes compliance debt.
- **Architecture Model**: Map out the application context, trust boundaries, and specific data flows with visual modeling tools. 
- **Application Context**: Define core application domains, regulatory requirements, and overall business risk profiles.

## Technical Stack

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Data Management**: In-memory state tracking (adaptable to cloud databases like Firestore/PostgreSQL for persistence)

## Usage Instructions

1. Start with the **Application Context** to define your target application's scope.
2. Move to the **Architecture Model** to detail system components, trust boundaries, and data flows.
3. Review potential attack vectors using the **STRIDE Analysis** guide.
4. Open the **ASVS Workspace** to conduct a detailed security control assessment against the 350+ ASVS 5.0 requirements.
5. Identify and manage specific vulnerabilities via the **Threat Register**. The dashboard's interactive 5x5 Risk Matrix helps prioritize critical issues.
6. Run a **Gap Analysis** in the Findings & Gaps view to automatically extract ASVS requirements marked as "Missing" or "Partial", transforming them into actionable engineering tickets.
7. Finally, use the **Export** module to generate compliance reports (CSV formats supported).

## Recent Updates

- **ASVS 5.0 Integration**: Automatically generates 340+ compliance requirements categorized logically across 17 chapters.
- **STRIDE Filtering**: Expanded Threat Register to support threat filtering by STRIDE category.
- **Interactive Risk Matrix**: Re-formatted 5x5 risk matrix grid for better label alignment, distinct visual grouping, and count indicators.
- **Gap Generation Engine**: Implemented cross-referencing between architecture controls and ASVS 5.0 compliance database for auto-generation of vulnerability tickets.

## Getting Started

In the development environment, standard scripts apply:
\`\`\`bash
npm run dev    # Start the development server
npm run build  # Create a production build
npm run lint   # Validate TypeScript types
\`\`\`
