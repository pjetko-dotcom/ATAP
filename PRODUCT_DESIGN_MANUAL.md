# AVERT Product and Design Manual

## Product identity

**AVERT** means **Application Security Assessment Platform**. Its subtitle is **Architecture · STRIDE · Risk · ASVS · Reports**. It is an offline-capable workspace for modeling architecture and data flows, analyzing STRIDE threats, assessing risk, verifying OWASP ASVS controls, managing findings, and producing reports and backups.

The UI, help, exports, and release metadata should use the same product name and terminology. Treat generated threat scenarios as prompts for human review, never as confirmed vulnerabilities or proof of security. AVERT reports are application-generated assessment outputs, not OWASP certifications or endorsements.

## Intended workflow

1. Define application purpose, users, data sensitivity, and compliance scope.
2. Model components, trust zones, and directed data flows.
3. Review DFD-generated STRIDE scenarios and manually assess likelihood, impact, treatment, and evidence.
4. Evaluate the selected ASVS requirement scope and link controls to components or threats.
5. Review gaps, version the assessment, and export a report or backup.

Keep the current project visible in navigation. Preserve entered data when moving between these steps, and make the next useful action clear without implying that an incomplete step is complete.

## DFD and threat-register contract

- An architecture model is stored as `atap_architecture_<analysisId>` with `components`, `flows`, and `zones`.
- A flow is a directed relation from one existing component to another. Its source and target component IDs, protocol, data classification, encryption, sender authentication, transfer type, and data description are security-relevant inputs. TLS flows may also record a cipher suite, key-exchange/KEM proposal, and a derived PQC design status (`unknown`, `classical`, or `post-quantum`). These are proposed architecture details, not evidence that a deployed endpoint uses them.
- A flow is treated as crossing a trust boundary only when both endpoint components and both zones exist and their zone IDs differ. Missing endpoints or zones do not generate threats.
- Suggested STRIDE scenarios are synchronized into `atap_threats_<analysisId>`, connected to the flow ID and both component IDs. They are review prompts. Editing one marks it customized; synchronization must preserve customized scenarios and manual threats.
- Removing a component removes connected flows. Deleting a flow, making its endpoints same-zone, or changing the flow's security properties updates or removes only uncustomized generated scenarios as appropriate.
- The Architecture Model shows threats only when their `componentIds` explicitly include the selected component. Selecting one opens that threat in the Threat Register.
- ASVS traceability is separate from STRIDE generation: users map controls to components and threats; DFD changes must not silently mark controls implemented or generate findings without an ASVS status.

### DFD interaction and cryptography

- Component technology stacks and flow protocols are alphabetized selectors that support keyboard type-to-select. Custom values and older stored values remain editable.
- Protocol names must accurately distinguish plaintext HTTP from HTTPS over TLS. mTLS describes mutual authentication during the TLS handshake, never an HTTP header; use explicit labels such as `Internal HTTPS / mTLS` or `gRPC over mTLS (HTTP/2)`. Keep application-level mechanisms such as HMAC request signing distinct from the transport protocol. Legacy misleading labels are normalized on load without discarding other flow metadata.
- TLS cipher suites are recorded separately from key exchange. The available cipher-suite choices are AES-GCM suites based on [NIST SP 800-52 Rev. 2](https://csrc.nist.gov/pubs/sp/800/52/r2/final); the key-exchange/KEM choices use NIST P-curves and ML-KEM parameter sets from [FIPS 203](https://csrc.nist.gov/pubs/fips/203/final).
- An unspecified key exchange has the explicit PQC design status `unknown`. Selecting a classical or ML-KEM option changes the derived status to `classical` or `post-quantum`; this is not a deployment verification, and the TLS endpoint must support the proposed algorithm.
- Flow connectors open their editor by mouse or keyboard (Enter/Space). The canvas supports horizontal and vertical scrolling, zoom controls, and Ctrl+mouse-wheel zooming.
- DFD review is optional and user-triggered. Warnings about missing protection or unspecified TLS/PQC details never block editing or saving. They are review prompts, not confirmed vulnerabilities, and the dialog closes with Cancel or Escape.

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

## Export contract

- Excel can contain up to three optional sheets: audit summary, ASVS requirements, and STRIDE threat register. A selected STRIDE sheet is present even when the register is empty.
- When “only gaps” is selected, the ASVS detail sheet and CSV contain only `Partial` and `Missing` controls. The Excel summary and chapter coverage continue to describe the full selected target-level scope, and the summary states this explicitly.
- Excel summary and chapter coverage use the shared weighted formula above. The threat sheet includes the scenario description, STRIDE category, likelihood, impact, risk, status, ASVS references, component links, and whether a generated scenario was reviewed.
- The printable report uses the saved working-version target level, covers all 17 ASVS chapters, and displays a dash when no controls have been evaluated instead of implying a measured 0%. Its selected list puts `Missing` before `Partial`, then higher ASVS levels first, with requirement ID as a stable tie-breaker; it is not a risk ranking.
- Requirements CSV and findings CSV are distinct, with stable column order and localized headers. Findings CSV follows the interface language; report-page requirements CSV follows the report language. CSV cells are sanitized against spreadsheet formula injection.
- Reports are snapshots: Excel summary values do not recalculate when workbook cells are edited. Generate a new export after changing project data.
- Downloaded backup files use AVERT branding, but backup structure identifiers and local storage keys intentionally retain `atap_*` names for compatibility with existing user data and ATAP backups. The Electron `appId` and old `userData` directory are also retained to avoid breaking upgrades.
- JSON backups include the separate saved findings list and its statuses, but historical version snapshots do not. Findings CSV is a record, not a restorable JSON backup; disclose these distinctions in user-facing guidance.

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
- The bilingual in-app guide is a standalone SPA route with native expandable sections, keyboard focus, cross-topic links and optional current-project context. Document every navigation section and keep English ASVS chapter names unchanged.

See [UX_RECOMMENDATIONS.md](./UX_RECOMMENDATIONS.md) for prioritized usability work.
