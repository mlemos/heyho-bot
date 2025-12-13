/**
 * Multi-Modal Analysis Functions
 *
 * Uses Gemini 3 Pro's native multi-modal capabilities to analyze
 * any type of file: images, PDFs, Office docs, audio, video, etc.
 */

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import {
  ExtractedCompanyInfoSchema,
  type ExtractedCompanyInfo,
} from "../types/schemas";

// ===========================================
// Types
// ===========================================

export interface FileAttachment {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

// ===========================================
// Multi-Modal Analysis
// ===========================================

/**
 * Analyze files using Gemini 3 Pro's native multi-modal capabilities.
 * Supports: images, PDFs, Office docs, audio, video, code, data files, etc.
 *
 * @param files - Array of file attachments with buffer, mimeType, and filename
 * @param textContext - Optional text context provided by the user
 * @returns Extracted company information from the files
 */
export async function analyzeAttachments(
  files: FileAttachment[],
  textContext?: string
): Promise<ExtractedCompanyInfo> {
  // Build the content array for the multi-modal message
  const content: Array<
    | { type: "text"; text: string }
    | { type: "file"; data: Buffer; mediaType: string }
  > = [];

  // Add the analysis prompt
  content.push({
    type: "text",
    text: `Analyze the following files and extract company/startup information.

${textContext ? `User provided context: "${textContext}"\n\n` : ""}

Extract as much information as possible about the company:
- Company name (required)
- What they do / description (required)
- Industry/sector
- Funding stage (Pre-Seed, Seed, Series A, etc.)
- Founders/team members (names, roles, backgrounds)
- Key metrics (users, revenue, growth rates, etc.)
- Funding information (amount raised, investors, seeking)
- Any other relevant context

Be thorough - analyze all pages/content. If information is unclear or not present, omit it rather than guessing.
Set confidence based on how much verifiable information you found (1.0 = very confident, clear pitch deck; 0.3 = sparse info, uncertain).`,
  });

  // Add each file
  for (const file of files) {
    content.push({
      type: "file",
      data: file.buffer,
      mediaType: file.mimeType,
    });
  }

  // Call Gemini 3 Pro with native multi-modal support
  const { object } = await generateObject({
    model: google("gemini-3-pro-preview"),
    schema: ExtractedCompanyInfoSchema,
    messages: [
      {
        role: "user",
        content,
      },
    ],
  });

  return object;
}

/**
 * Format extracted company info into a context string for the research pipeline
 */
export function formatExtractedContext(info: ExtractedCompanyInfo): string {
  const parts: string[] = [];

  parts.push(`Company: ${info.companyName}`);
  parts.push(`Description: ${info.description}`);

  if (info.industry) {
    parts.push(`Industry: ${info.industry}`);
  }

  if (info.stage) {
    parts.push(`Stage: ${info.stage}`);
  }

  if (info.founders && info.founders.length > 0) {
    const foundersList = info.founders
      .map((f) => {
        let str = f.name;
        if (f.role) str += ` (${f.role})`;
        if (f.background) str += ` - ${f.background}`;
        return str;
      })
      .join("; ");
    parts.push(`Founders: ${foundersList}`);
  }

  if (info.metrics) {
    const metrics: string[] = [];
    if (info.metrics.users) metrics.push(`Users: ${info.metrics.users}`);
    if (info.metrics.revenue) metrics.push(`Revenue: ${info.metrics.revenue}`);
    if (info.metrics.growth) metrics.push(`Growth: ${info.metrics.growth}`);
    if (info.metrics.other) metrics.push(...info.metrics.other);
    if (metrics.length > 0) {
      parts.push(`Metrics: ${metrics.join(", ")}`);
    }
  }

  if (info.funding) {
    const funding: string[] = [];
    if (info.funding.raised) funding.push(`Raised: ${info.funding.raised}`);
    if (info.funding.investors && info.funding.investors.length > 0) {
      funding.push(`Investors: ${info.funding.investors.join(", ")}`);
    }
    if (info.funding.seeking) funding.push(`Seeking: ${info.funding.seeking}`);
    if (funding.length > 0) {
      parts.push(`Funding: ${funding.join("; ")}`);
    }
  }

  if (info.additionalContext) {
    parts.push(`Additional: ${info.additionalContext}`);
  }

  return parts.join("\n");
}
