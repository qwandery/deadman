import type { PlatformId, OsId, ArchId } from "../types.js";
import { getOs, getArch } from "./platform.js";

export interface TemplateContext {
  platform: PlatformId;
  os: OsId;
  arch: ArchId;
  [key: string]: string;
}

/** Build template context from platform and custom variables */
export function buildTemplateContext(
  platform: PlatformId,
  variables?: Record<string, string>
): TemplateContext {
  return {
    platform,
    os: getOs(platform),
    arch: getArch(platform),
    ...variables,
  };
}

/** Expand ${variable} placeholders in a string */
export function expandTemplate(
  template: string,
  context: TemplateContext | Record<string, string>
): string {
  return template.replace(/\$\{(\w+)\}/g, (match, key: string) => {
    if (key in context) {
      return context[key];
    }
    return match; // Leave unresolved placeholders as-is
  });
}
