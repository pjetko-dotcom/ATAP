CREATE TABLE "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'Draft' NOT NULL,
	"asvs_level" varchar(10) NOT NULL,
	"asvs_catalog_version" varchar(50) NOT NULL,
	"version_no" integer DEFAULT 1 NOT NULL,
	"parent_analysis_id" uuid,
	"author_id" uuid,
	"reviewer_id" uuid,
	"analysis_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"app_name" varchar(255) NOT NULL,
	"business_owner" varchar(255),
	"technical_owner" varchar(255),
	"purpose" text,
	"system_type" varchar(100),
	"data_sensitivity" varchar(100),
	"internet_exposure" boolean DEFAULT false,
	"user_types" jsonb,
	"environment" varchar(100),
	"description" text
);
--> statement-breakpoint
CREATE TABLE "assessment_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"asvs_requirement_id" uuid NOT NULL,
	"relevant" boolean DEFAULT true,
	"status" varchar(50) DEFAULT 'NotReviewed' NOT NULL,
	"evidence_note" text,
	"proposed_action" text,
	"component_ids" jsonb,
	"threat_ids" jsonb
);
--> statement-breakpoint
CREATE TABLE "asvs_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"req_id" varchar(255) NOT NULL,
	"chapter" varchar(255) NOT NULL,
	"section" varchar(255) NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"level" varchar(10) NOT NULL,
	"catalog_version" varchar(50) NOT NULL,
	CONSTRAINT "asvs_requirements_req_id_unique" UNIQUE("req_id")
);
--> statement-breakpoint
CREATE TABLE "components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"component_type" varchar(100),
	"description" text,
	"technology" varchar(255),
	"location" varchar(255),
	"exposure" varchar(255),
	"data_processed" jsonb,
	"authn_model" text,
	"authz_model" text,
	"logging_monitoring" text,
	"dependencies" jsonb
);
--> statement-breakpoint
CREATE TABLE "data_flows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"source_component_id" uuid NOT NULL,
	"target_component_id" uuid NOT NULL,
	"protocol" varchar(100),
	"data_classification" varchar(100),
	"crosses_trust_boundary" boolean DEFAULT false,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "finding_assessments" (
	"finding_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	CONSTRAINT "finding_assessments_finding_id_assessment_id_pk" PRIMARY KEY("finding_id","assessment_id")
);
--> statement-breakpoint
CREATE TABLE "finding_threats" (
	"finding_id" uuid NOT NULL,
	"threat_id" uuid NOT NULL,
	CONSTRAINT "finding_threats_finding_id_threat_id_pk" PRIMARY KEY("finding_id","threat_id")
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"severity" varchar(50),
	"priority" varchar(50),
	"owner" varchar(255),
	"due_date" date,
	"status" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "remediation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finding_id" uuid NOT NULL,
	"action" text NOT NULL,
	"priority" varchar(50),
	"owner" varchar(255),
	"due_date" date,
	"status" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "threats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"scenario" text,
	"asset" varchar(255),
	"category" varchar(100),
	"probability" integer,
	"impact" integer,
	"risk" integer,
	"residual_risk" integer,
	"existing_controls" text,
	"mitigations" text,
	"owner" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "trust_boundaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"boundary_type" varchar(100)
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_records" ADD CONSTRAINT "assessment_records_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_records" ADD CONSTRAINT "assessment_records_asvs_requirement_id_asvs_requirements_id_fk" FOREIGN KEY ("asvs_requirement_id") REFERENCES "public"."asvs_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_flows" ADD CONSTRAINT "data_flows_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_flows" ADD CONSTRAINT "data_flows_source_component_id_components_id_fk" FOREIGN KEY ("source_component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_flows" ADD CONSTRAINT "data_flows_target_component_id_components_id_fk" FOREIGN KEY ("target_component_id") REFERENCES "public"."components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_assessments" ADD CONSTRAINT "finding_assessments_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_assessments" ADD CONSTRAINT "finding_assessments_assessment_id_assessment_records_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_threats" ADD CONSTRAINT "finding_threats_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_threats" ADD CONSTRAINT "finding_threats_threat_id_threats_id_fk" FOREIGN KEY ("threat_id") REFERENCES "public"."threats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remediation_actions" ADD CONSTRAINT "remediation_actions_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threats" ADD CONSTRAINT "threats_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_boundaries" ADD CONSTRAINT "trust_boundaries_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;