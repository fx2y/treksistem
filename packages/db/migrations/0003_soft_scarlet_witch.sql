PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_user_id` text NOT NULL,
	`impersonated_mitra_id` text,
	`target_entity` text NOT NULL,
	`target_id` text NOT NULL,
	`action` text NOT NULL,
	`payload` text,
	`timestamp` integer,
	FOREIGN KEY (`admin_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`impersonated_mitra_id`) REFERENCES `mitras`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_audit_logs`("id", "admin_user_id", "impersonated_mitra_id", "target_entity", "target_id", "action", "payload", "timestamp") SELECT "id", "admin_user_id", "impersonated_mitra_id", "target_entity", "target_id", "action", "payload", "timestamp" FROM `audit_logs`;--> statement-breakpoint
DROP TABLE `audit_logs`;--> statement-breakpoint
ALTER TABLE `__new_audit_logs` RENAME TO `audit_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `audit_logs_admin_action_idx` ON `audit_logs` (`admin_user_id`,`action`);--> statement-breakpoint
CREATE INDEX `audit_logs_timestamp_idx` ON `audit_logs` (`timestamp`);--> statement-breakpoint
ALTER TABLE `users` ADD `role` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `is_admin`;