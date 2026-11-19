# ATAP Product and Design Manual

## Product identity

**ATAP** means **Application Threat Analysis & Modeling Platform**. It is an offline-capable workspace for application security assessments, combining an architecture data-flow diagram (DFD), Microsoft STRIDE threat modeling, and OWASP ASVS verification.

The UI, help, exports, and release metadata should use the same product name and terminology. Treat generated threat scenarios as prompts for human review, never as confirmed vulnerabilities or proof of security.

## Intended workflow

1. Define application purpose, users, data sensitivity, and compliance scope.
2. Model components, trust zones, and directed data flows.
3. Review DFD-generated STRIDE scenarios and manually assess likelihood, impact, treatment, and evidence.
4. Evaluate the selected ASVS requirement scope and link controls to components or threats.
5. Review gaps, version the assessment, and export a report or backup.

Keep the current project visible in navigation. Preserve entered data when moving between these steps, and make the next useful action clear without implying that an incomplete step is complete.

## DFD and threat-register contract

- An architecture model is stored as `atap_architecture_<analysisId>` with `components`, `flows`, and `zones`.
- A flow is a directed relation from one existing component to another. Its source and target component IDs, protocol, data classification, encryption, sender authentication, transfer type, and data description are security-relevant inputs.
- A flow is treated as crossing a trust boundary only when both endpoint components and both zones exist and their zone IDs differ. Missing endpoints or zones do not generate threats.
- Suggested STRIDE scenarios are synchronized into `atap_threats_<analysisId>`, connected to the flow ID and both component IDs. They are review prompts. Editing one marks it customized; synchronization must preserve customized scenarios and manual threats.
- Removing a component removes connected flows. Deleting a flow, making its endpoints same-zone, or changing the flow's security properties updates or removes only uncustomized generated scenarios as appropriate.
- The Architecture Model shows threats only when their `componentIds` explicitly include the selected component. Selecting one opens that threat in the Threat Register.
- ASVS traceability is separate from STRIDE generation: users map controls to components and threats; DFD changes must not silently mark controls implemented or generate findings without an ASVS status.

### STRIDE suggestion rules

For each cross-zone flow, suggestions always include Elevation of Privilege and Denial of Service. An unauthenticated flow also suggests Spoofing and Repudiation. An unencrypted flow suggests Tampering, and also Information Disclosure when its classification is not Public. This produces two to six suggestions per crossing flow. A secure-looking flow is not thereby proven safe; the reviewer remains responsible for validating the model and scenario relevance.

Generated suggestions use `Unlikely` as an initial likelihood and derive initial impact from classification: Public → Minor, Internal → Moderate, Confidential → Major, Restricted → Critical. These values are defaults, not automatic findings. Human assessment can change them.

## Risk model

The Threat Register uses a **4×4**, not 5×5, matrix:

| Likelihood | Score |
| --- | ---: |
| Exceptionally | 1 |
| Unlikely | 2 |
| Probably | 3 |
| Frequently | 4 |

| Impact | Score |
| --- | ---: |
| Minor | 1 |
| Moderate | 2 |
| Major | 3 |
| Critical | 4 |

Calculate `risk score = likelihood score × impact score`, then map the product consistently:

| Product | Risk |
| ---: | --- |
| 1 | Very Low |
| 2–3 | Low |
| 4–7 | Medium |
| 8–11 | High |
| 12–16 | Critical |

### Threat counters

- **Total** counts every threat in the current register.
- **Open** counts only status `Open`.
- **Open High/Critical** counts only status `Open` whose risk is `High` or `Critical`.
- `Mitigated`, `Remediated`, and `Accepted` do not count as open risks. They remain part of the total register.
- Dashboard, register, report, and version metrics must use the shared threat-summary logic. Do not label a combined High+Critical number as only “Critical”.
- IDs for manual threats use the next available `TR-<number>` after the largest existing numeric ID; deleting a row must not cause another row to reuse its ID.

## ASVS coverage

ASVS coverage is calculated for the applicable target level and evaluated requirements only:

`round((Implemented + 0.5 × Partial) / (Implemented + Partial + Missing) × 100)`

Requirements above the target level and those marked `N/A` are excluded. If there are no evaluated requirements, coverage is 0%. Keep this formula consistent across the workspace, dashboard, report, and version metrics; gap counts include `Missing` and `Partial` items only within the same applicable scope.

## Interaction, visual, and accessibility rules

- Prefer explicit labels over icon-only controls; expose accessible names for icon-only buttons.
- All essential actions must work by keyboard and show a visible focus indicator. Use semantic buttons for actions and links for navigation.
- Do not communicate trust, risk, or status by color alone; pair colors with text, icons, or shape.
- Preserve user input during modal validation errors. Confirm destructive actions and state the scope of deletion.
- Show save, import, export, and build-relevant errors explicitly. Never show a success state after a failed write.
- Identify generated versus user-authored content and show whether a generated scenario still needs review.
- Keep forms short and grouped by task. Explain defaults and security assumptions where the user makes a decision.
- Make dense DFDs usable at supported viewport sizes; retain readable labels, selectability, and an alternative path to inspect linked threats.
- Treat local activity history as editable client-side traceability, not an immutable audit log.

See [UX_RECOMMENDATIONS.md](./UX_RECOMMENDATIONS.md) for prioritized usability work.
