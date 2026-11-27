CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "provider" text DEFAULT 'simulated' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "provider_ref" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "provider_charge_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "checkout_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bachs_account_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bachs_payout_status" text;--> statement-breakpoint
CREATE UNIQUE INDEX "tx_provider_ref_idx" ON "transactions" USING btree ("provider_ref");