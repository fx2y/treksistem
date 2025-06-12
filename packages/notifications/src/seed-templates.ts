import type { DrizzleD1Database } from "drizzle-orm/d1";

import { TemplateRepository } from "./repository";
import { NotificationTemplates } from "./templates";
import type { NotificationType } from "./types";

/**
 * Seeds the database with default notification templates
 * Converts hardcoded templates to database records
 */
export async function seedTemplates(
  db: DrizzleD1Database<Record<string, unknown>>
): Promise<void> {
  const templateRepo = new TemplateRepository(db);

  const language = "id"; // Default Indonesian language

  for (const [type, content] of Object.entries(NotificationTemplates)) {
    const typedType = type as NotificationType;

    // Check if template already exists
    const existing = await templateRepo.findByTypeAndLanguage(
      typedType,
      language
    );

    if (!existing) {
      // Convert hardcoded template syntax to mustache syntax
      const mustacheContent = content
        .replace(/{([^}]+)}/g, "{{$1}}") // Convert {var} to {{var}}
        .replace(/{{orderPublicId}}/g, "{{orderId}}"); // Normalize field names

      await templateRepo.create({
        type: typedType,
        language,
        content: mustacheContent,
      });

      console.log(`Seeded template: ${type} (${language})`);
    } else {
      console.log(`Template already exists: ${type} (${language})`);
    }
  }
}
