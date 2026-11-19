# UX Recommendations

## Current usability improvements included

- Help now gives the full ATAP expansion and describes the actual 4×4 risk matrix and its hover behavior.
- Newly created analyses no longer inherit the seeded example threat register. The default sample analysis remains identifiable as the example.
- Threat totals consistently distinguish open items from open High/Critical items.
- Selecting a component in the DFD lists only threats explicitly linked to its ID; each threat is a direct link to its filtered Threat Register row.
- ASVS coverage now uses the same weighted Partial formula and target-level scope in the workspace, dashboard, reports, and version metrics.

## Proposed improvements, prioritized

### P1 — Make the assessment flow measurable

1. **Guided progress with meaningful completion criteria.** Replace binary “has any data” completion with step states such as Not started, In progress, Needs review, and Complete. Define completion for context, DFD, STRIDE review, ASVS, and findings, and let each state link to the unresolved work.
2. **Review generated STRIDE scenarios in context.** Add a DFD-focused review queue grouped by trust-boundary flow, showing the flow's source, destination, classification, encryption/authentication, suggested categories, and review status. Support accept, dismiss-with-reason, and edit without losing the source-flow link.
3. **Expose the risk calculation at entry time.** Show the 4×4 risk result as likelihood and impact change, include the score/threshold explanation, and make clear that the matrix counts only Open items.
4. **Clarify saving and backup safety.** Show a persistent saved/unsaved or save-error indicator, last backup time, and an explicit warning that backups contain sensitive architecture, evidence, and threat data.

### P2 — Reduce navigation and data-entry effort

5. **Bidirectional traceability.** From a threat, open its DFD flow and highlight both endpoints; from an ASVS control, open linked components and related threats. Show an actionable empty state when a relationship is missing.
6. **Bulk threat review.** Provide keyboard-accessible actions to mark generated prompts reviewed or filter to unreviewed/high-risk/open items. Keep a confirmation/reason for dismissing a generated scenario.
7. **Autosuggest without overwriting.** Offer ASVS references and component links as suggestions; preserve existing user-entered values and explain when recommendations are heuristic.
8. **Improve table operation.** Add sortable columns, visible active-filter chips, a one-click “clear filters” action, and a result count. Keep the current search term when opening and returning from a linked record.

### P3 — Improve accessibility and larger-diagram handling

9. **Keyboard DFD editing.** Provide keyboard selection, movement, connection creation, and a list/table alternative to the canvas. Announce selection and connection changes to assistive technology.
10. **Responsive canvas controls.** Add zoom-to-fit, zoom controls, minimap or outline, and a list of unresolved overlaps/obstructed flows with “focus item” actions.
11. **Accessibility review.** Verify contrast, keyboard focus/order, modal focus trapping, screen-reader names, zoom/reflow, and non-color status indicators with automated and manual checks.

Prioritize P1 before adding more workflow surface area. Confirm each proposal with users who perform threat-model reviews and ASVS assessments, then validate changes against the design principles in [PRODUCT_DESIGN_MANUAL.md](./PRODUCT_DESIGN_MANUAL.md).
