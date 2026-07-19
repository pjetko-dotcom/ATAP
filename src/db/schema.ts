import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  date,
  primaryKey,
} from "drizzle-orm/pg-core";

export const asvsRequirements = pgTable("asvs_requirements", {
  id: uuid("id").primaryKey().defaultRandom(),
  reqId: varchar("req_id", { length: 255 }).notNull().unique(), // e.g. V1.1.1
  chapter: varchar("chapter", { length: 255 }).notNull(),
  section: varchar("section", { length: 255 }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  level: varchar("level", { length: 10 }).notNull(), // L1, L2, L3
  catalogVersion: varchar("catalog_version", { length: 50 }).notNull(), // e.g. 5.0.0
});

export const analyses = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("Draft"), // Draft, InReview, Final, Archived
  asvsLevel: varchar("asvs_level", { length: 10 }).notNull(), // L1, L2, L3
  asvsCatalogVersion: varchar("asvs_catalog_version", { length: 50 }).notNull(),
  versionNo: integer("version_no").notNull().default(1),
  parentAnalysisId: uuid("parent_analysis_id"),
  authorId: uuid("author_id"),
  reviewerId: uuid("reviewer_id"),
  analysisDate: date("analysis_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  appName: varchar("app_name", { length: 255 }).notNull(),
  businessOwner: varchar("business_owner", { length: 255 }),
  technicalOwner: varchar("technical_owner", { length: 255 }),
  purpose: text("purpose"),
  systemType: varchar("system_type", { length: 100 }), // web_app, api, backend, integration, hybrid
  dataSensitivity: varchar("data_sensitivity", { length: 100 }), // public, internal, confidential, restricted
  internetExposure: boolean("internet_exposure").default(false),
  userTypes: jsonb("user_types"),
  environment: varchar("environment", { length: 100 }), // internal, external, partner, hybrid
  description: text("description"),
});

export const components = pgTable("components", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  componentType: varchar("component_type", { length: 100 }),
  description: text("description"),
  technology: varchar("technology", { length: 255 }),
  location: varchar("location", { length: 255 }),
  exposure: varchar("exposure", { length: 255 }),
  dataProcessed: jsonb("data_processed"),
  authnModel: text("authn_model"),
  authzModel: text("authz_model"),
  loggingMonitoring: text("logging_monitoring"),
  dependencies: jsonb("dependencies"),
});

export const dataFlows = pgTable("data_flows", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  sourceComponentId: uuid("source_component_id")
    .notNull()
    .references(() => components.id, { onDelete: "cascade" }),
  targetComponentId: uuid("target_component_id")
    .notNull()
    .references(() => components.id, { onDelete: "cascade" }),
  protocol: varchar("protocol", { length: 100 }),
  dataClassification: varchar("data_classification", { length: 100 }),
  crossesTrustBoundary: boolean("crosses_trust_boundary").default(false),
  description: text("description"),
});

export const trustBoundaries = pgTable("trust_boundaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  boundaryType: varchar("boundary_type", { length: 100 }),
});

export const threats = pgTable("threats", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  scenario: text("scenario"),
  asset: varchar("asset", { length: 255 }),
  category: varchar("category", { length: 100 }),
  probability: integer("probability"),
  impact: integer("impact"),
  risk: integer("risk"),
  residualRisk: integer("residual_risk"),
  existingControls: text("existing_controls"),
  mitigations: text("mitigations"),
  owner: varchar("owner", { length: 255 }),
});

export const assessmentRecords = pgTable("assessment_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  asvsRequirementId: uuid("asvs_requirement_id")
    .notNull()
    .references(() => asvsRequirements.id, { onDelete: "cascade" }),
  relevant: boolean("relevant").default(true),
  status: varchar("status", { length: 50 }).notNull().default("NotReviewed"),
  evidenceNote: text("evidence_note"),
  proposedAction: text("proposed_action"),
  componentIds: jsonb("component_ids"),
  threatIds: jsonb("threat_ids"),
});

export const findings = pgTable("findings", {
  id: uuid("id").primaryKey().defaultRandom(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  severity: varchar("severity", { length: 50 }),
  priority: varchar("priority", { length: 50 }),
  owner: varchar("owner", { length: 255 }),
  dueDate: date("due_date"),
  status: varchar("status", { length: 50 }),
});

export const findingThreats = pgTable("finding_threats", {
  findingId: uuid("finding_id")
    .notNull()
    .references(() => findings.id, { onDelete: "cascade" }),
  threatId: uuid("threat_id")
    .notNull()
    .references(() => threats.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.findingId, t.threatId] })
]);

export const findingAssessments = pgTable("finding_assessments", {
  findingId: uuid("finding_id")
    .notNull()
    .references(() => findings.id, { onDelete: "cascade" }),
  assessmentId: uuid("assessment_id")
    .notNull()
    .references(() => assessmentRecords.id, { onDelete: "cascade" }),
}, (t) => [
  primaryKey({ columns: [t.findingId, t.assessmentId] })
]);

export const remediationActions = pgTable("remediation_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  findingId: uuid("finding_id")
    .notNull()
    .references(() => findings.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  priority: varchar("priority", { length: 50 }),
  owner: varchar("owner", { length: 255 }),
  dueDate: date("due_date"),
  status: varchar("status", { length: 50 }),
});
