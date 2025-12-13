/**
 * Multi-Modal Analysis Functions
 *
 * Uses Gemini 3 Pro's native multi-modal capabilities to analyze
 * any type of file: images, PDFs, Office docs, audio, video, etc.
 */

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import {
  FileTriageResultSchema,
  type FileTriageResult,
  type TriagedFile,
  type AttachmentReference,
  type ResearchAreaEnum,
} from "../types/schemas";

// ===========================================
// Types
// ===========================================

export interface FileAttachment {
  id: string;
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

export interface ResearchContext {
  basics?: string;
  founders?: string;
  funding?: string;
  product?: string;
  competitive?: string;
  news?: string;
}

// ===========================================
// File Triage
// ===========================================

/**
 * Triage files: classify each one and extract targeted content for each research area.
 * This is the smart step that decides what information from each file goes where.
 */
export async function triageFiles(
  files: FileAttachment[],
  textContext?: string
): Promise<FileTriageResult> {
  // Build the content array for the multi-modal message
  const content: Array<
    | { type: "text"; text: string }
    | { type: "file"; data: Buffer; mediaType: string }
  > = [];

  // Build file list for prompt
  const fileList = files.map((f, i) => `${i + 1}. "${f.filename}" (ID: ${f.id})`).join("\n");

  // Add the triage prompt
  content.push({
    type: "text",
    text: `You are analyzing files uploaded for investment research on a company/startup.

${textContext ? `User context: "${textContext}"\n\n` : ""}

FILES TO ANALYZE:
${fileList}

For each file, you must:

1. CLASSIFY the file type:
   - pitch_deck: Core company presentation - extract info for ALL research areas
   - financial_model: Financial projections/cap table - extract for funding area
   - team_bio: Team/founder details - extract for founders area
   - product_doc: Product specs/demos - extract for product area
   - market_research: Market/competitor analysis - extract for competitive area
   - press_coverage: News articles/PR - extract for news area
   - reference_only: Background info, don't factor into research
   - irrelevant: Not related to company research, ignore

2. EXTRACT content for each relevant research area:
   - basics: Company name, description, industry, stage, location
   - founders: Founder names, roles, backgrounds, credentials
   - funding: Amounts raised, investors, valuations, round details
   - product: Product details, technology, customers, metrics
   - competitive: Market size, competitors, differentiation
   - news: Recent announcements, partnerships, milestones

3. Decide which research areas should use this file's content (useInResearch)

Be thorough - extract all relevant details. For pitch decks, extract everything for all areas.
For specialized documents, only extract what's relevant to their category.

IMPORTANT: Identify the company name from the most authoritative source (usually the pitch deck).`,
  });

  // Add each file
  for (const file of files) {
    content.push({
      type: "file",
      data: file.buffer,
      mediaType: file.mimeType,
    });
  }

  // Call Gemini 3 Pro for triage
  const { object } = await generateObject({
    model: google("gemini-3-pro-preview"),
    schema: FileTriageResultSchema,
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
 * Build research context from triaged files.
 * Returns context strings for each research area based on what files are relevant.
 */
export function buildResearchContext(triageResult: FileTriageResult): ResearchContext {
  const context: ResearchContext = {};

  const areas: ResearchAreaEnum[] = ["basics", "founders", "funding", "product", "competitive", "news"];

  for (const area of areas) {
    const relevantContent: string[] = [];

    for (const file of triageResult.files) {
      // Check if this file should be used for this research area
      if (file.useInResearch.includes(area)) {
        const areaContent = file.extractedContent[area];
        if (areaContent) {
          relevantContent.push(`[From ${file.filename}]: ${areaContent}`);
        }
      }
    }

    if (relevantContent.length > 0) {
      context[area] = relevantContent.join("\n\n");
    }
  }

  return context;
}

/**
 * Convert triaged files to attachment references for the memo.
 */
export function buildAttachmentReferences(triageResult: FileTriageResult): AttachmentReference[] {
  return triageResult.files.map((file) => ({
    fileId: file.fileId,
    filename: file.filename,
    classification: file.classification,
    summary: file.summary,
    usedIn: file.useInResearch,
    notUsedReason: file.classification === "irrelevant"
      ? "File not relevant to company research"
      : file.classification === "reference_only"
        ? "Used as background context only"
        : undefined,
  }));
}

/**
 * Get a human-readable description of file classification
 */
export function getClassificationLabel(classification: string): string {
  const labels: Record<string, string> = {
    pitch_deck: "Pitch Deck",
    financial_model: "Financial Model",
    team_bio: "Team Bio",
    product_doc: "Product Documentation",
    market_research: "Market Research",
    press_coverage: "Press Coverage",
    reference_only: "Reference Only",
    irrelevant: "Not Used",
  };
  return labels[classification] || classification;
}

/**
 * Get icon/emoji for file classification
 */
export function getClassificationIcon(classification: string): string {
  const icons: Record<string, string> = {
    pitch_deck: "📊",
    financial_model: "💰",
    team_bio: "👥",
    product_doc: "🛠️",
    market_research: "📈",
    press_coverage: "📰",
    reference_only: "📎",
    irrelevant: "⏭️",
  };
  return icons[classification] || "📄";
}
