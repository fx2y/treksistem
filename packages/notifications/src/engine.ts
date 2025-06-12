import Mustache from "mustache";

/**
 * Renders a mustache template with the provided data
 * @param template - The mustache template string with {{variable}} placeholders
 * @param data - The data object to render into the template
 * @returns The rendered string
 */
export function render(template: string, data: Record<string, string>): string {
  return Mustache.render(template, data);
}
