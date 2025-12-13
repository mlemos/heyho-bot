/**
 * Attio CRM API Client
 *
 * Handles Investment Opportunities, Companies, and Notes.
 *
 * Flow:
 * 1. upsertCompany() - Create/update company from research
 * 2. createInvestmentOpportunity() - Create opportunity linked to company
 * 3. attachOpportunityNote() - Attach investment memo to opportunity
 */

import type { paths } from "./types";
import type { CompanyResearch, InvestmentMemo } from "@/src/types/schemas";

// ===========================================
// Configuration
// ===========================================

const ATTIO_API_URL = "https://api.attio.com";

function getApiKey(): string {
  const apiKey = process.env.ATTIO_API_KEY;
  if (!apiKey) {
    throw new Error("ATTIO_API_KEY environment variable is not set");
  }
  return apiKey;
}

// ===========================================
// Types
// ===========================================

type RecordQueryResponse =
  paths["/v2/objects/{object}/records/query"]["post"]["responses"]["200"]["content"]["application/json"];
type AssertRecordResponse =
  paths["/v2/objects/{object}/records"]["put"]["responses"]["200"]["content"]["application/json"];
type CreateRecordResponse =
  paths["/v2/objects/{object}/records"]["put"]["responses"]["200"]["content"]["application/json"];
type CreateNoteResponse =
  paths["/v2/notes"]["post"]["responses"]["200"]["content"]["application/json"];

export interface AttioRecord {
  id: {
    workspace_id: string;
    object_id: string;
    record_id: string;
  };
  created_at: string;
  web_url: string;
  values: Record<string, unknown[]>;
}

export interface AttioNote {
  id: {
    workspace_id: string;
    note_id: string;
  };
  parent_object: string;
  parent_record_id: string;
  title: string;
  content_plaintext: string;
  created_at: string;
}

export interface UpsertCompanyResult {
  recordId: string;
  webUrl: string;
  isNew: boolean;
}

export interface CreateOpportunityResult {
  recordId: string;
  webUrl: string;
}

export interface AttachNoteResult {
  noteId: string;
}

// ===========================================
// API Client
// ===========================================

async function attioFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();

  const response = await fetch(`${ATTIO_API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Attio API error: ${response.status} ${response.statusText} - ${errorBody}`
    );
  }

  return response.json();
}

// ===========================================
// Company Operations
// ===========================================

/**
 * Search for a company by name and/or domain
 */
export async function lookupCompany(
  companyName: string,
  domain?: string
): Promise<{ exists: boolean; recordId?: string; webUrl?: string }> {
  try {
    let filter: Record<string, unknown>;

    if (domain) {
      filter = {
        $or: [
          { name: { $contains: companyName } },
          { domains: { $contains: domain } },
        ],
      };
    } else {
      filter = {
        name: { $contains: companyName },
      };
    }

    const response = await attioFetch<RecordQueryResponse>(
      "/v2/objects/companies/records/query",
      {
        method: "POST",
        body: JSON.stringify({ filter, limit: 5 }),
      }
    );

    const records = response.data;
    if (records && records.length > 0) {
      const record = records[0] as AttioRecord;
      return {
        exists: true,
        recordId: record.id.record_id,
        webUrl: record.web_url,
      };
    }

    return { exists: false };
  } catch (error) {
    console.error("Error looking up company in Attio:", error);
    return { exists: false };
  }
}

/**
 * Create or update a company record from research data
 * Uses domain as matching attribute for deduplication
 */
export async function upsertCompany(
  research: CompanyResearch
): Promise<UpsertCompanyResult> {
  const { company } = research;

  // Extract domain from website URL
  const domain = company.website
    ?.replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

  // Check if company exists first (to determine isNew)
  const existing = domain
    ? await lookupCompany(company.name, domain)
    : await lookupCompany(company.name);

  // Build values object
  const values: Record<string, unknown[]> = {
    name: [{ value: company.name }],
  };

  if (domain) {
    values.domains = [{ domain }];
  }

  if (company.description) {
    values.description = [{ value: company.description }];
  }

  // Brief can be a short summary
  if (company.description) {
    values.brief = [{ value: company.description.slice(0, 500) }];
  }

  // Note: estimated_stage is a select field with predefined options
  // Skip for now - the options may not match our stage values
  // TODO: Map stage values to valid Attio select options

  // Note: primary_location requires complex structure (line_1, line_2, etc.)
  // Skip for now - location can be added manually in Attio if needed

  // Funding raised (if available)
  if (research.funding?.totalRaised) {
    // Parse funding string to number (e.g., "$100M" -> 100000000)
    const fundingStr = research.funding.totalRaised;
    const match = fundingStr.match(/\$?([\d.]+)\s*(B|M|K)?/i);
    if (match) {
      let amount = parseFloat(match[1]);
      const unit = (match[2] || "").toUpperCase();
      if (unit === "B") amount *= 1_000_000_000;
      else if (unit === "M") amount *= 1_000_000;
      else if (unit === "K") amount *= 1_000;
      values.funding_raised_usd = [{ currency_value: amount }];
    }
  }

  // Use domain for matching if available, otherwise name
  const matchingAttribute = domain ? "domains" : "name";

  const response = await attioFetch<AssertRecordResponse>(
    `/v2/objects/companies/records?matching_attribute=${matchingAttribute}`,
    {
      method: "PUT",
      body: JSON.stringify({ data: { values } }),
    }
  );

  const record = response.data as AttioRecord;

  return {
    recordId: record.id.record_id,
    webUrl: record.web_url,
    isNew: !existing.exists,
  };
}

// ===========================================
// Investment Opportunity Operations
// ===========================================

/**
 * Create a new Investment Opportunity linked to a company
 */
export async function createInvestmentOpportunity(
  companyRecordId: string,
  companyName: string,
  memo: InvestmentMemo,
  research: CompanyResearch
): Promise<CreateOpportunityResult> {
  // Build display name with date
  const date = new Date().toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  const displayName = `${companyName} - ${date}`;

  // Build values
  const values: Record<string, unknown[]> = {
    display_name: [{ value: displayName }],
    // Link to company record
    company: [
      {
        target_object: "companies",
        target_record_id: companyRecordId,
      },
    ],
  };

  // Round/stage from research
  if (research.company.stage) {
    values.round = [{ value: research.company.stage }];
  }

  // Add "Gemini 3" tag to mark opportunities created by this tool
  values.tags = [{ option: "Gemini 3" }];

  // Check size from fund fit if available
  // Note: This would need the actual currency value
  // For now, skip unless we have structured data

  const response = await attioFetch<CreateRecordResponse>(
    "/v2/objects/investment_opportunities/records",
    {
      method: "POST",
      body: JSON.stringify({ data: { values } }),
    }
  );

  const record = response.data as AttioRecord;

  return {
    recordId: record.id.record_id,
    webUrl: record.web_url,
  };
}

// ===========================================
// Notes Operations
// ===========================================

/**
 * Attach investment memo as a note to an Investment Opportunity
 */
export async function attachOpportunityNote(
  opportunityRecordId: string,
  memo: InvestmentMemo
): Promise<AttachNoteResult> {
  const title = `Investment Memo: ${memo.companyScorecard.overall.toFixed(1)}/10`;
  const content = formatMemoAsMarkdown(memo);

  const response = await attioFetch<CreateNoteResponse>("/v2/notes", {
    method: "POST",
    body: JSON.stringify({
      data: {
        parent_object: "investment_opportunities",
        parent_record_id: opportunityRecordId,
        title,
        format: "markdown",
        content,
      },
    }),
  });

  const note = response.data as AttioNote;

  return {
    noteId: note.id.note_id,
  };
}

/**
 * Format investment memo as markdown for Attio notes
 */
function formatMemoAsMarkdown(memo: InvestmentMemo): string {
  const sections: string[] = [];

  // Header with scores
  sections.push(`# Investment Memo\n`);
  sections.push(`**Overall Score:** ${memo.companyScorecard.overall.toFixed(1)}/10`);
  sections.push(`**Fund Fit:** ${memo.fundFit.score.toFixed(1)}/10`);
  sections.push(`**Partner Fit:** ${memo.partnerFit.overallFitScore.toFixed(1)}/10\n`);

  // One-liner
  sections.push(`## Summary\n`);
  sections.push(`${memo.oneLiner}\n`);
  sections.push(`${memo.summary}\n`);

  // Company Scorecard
  sections.push(`## Company Scorecard\n`);
  sections.push(`- **Team:** ${memo.companyScorecard.team.toFixed(1)}/10`);
  sections.push(`- **Market:** ${memo.companyScorecard.market.toFixed(1)}/10`);
  sections.push(`- **Product:** ${memo.companyScorecard.product.toFixed(1)}/10`);
  sections.push(`- **Traction:** ${memo.companyScorecard.traction.toFixed(1)}/10`);
  sections.push(`- **Competition:** ${memo.companyScorecard.competition.toFixed(1)}/10\n`);

  // Detailed Sections
  sections.push(`## Company Overview\n`);
  sections.push(`${memo.sections.companySummary}\n`);

  sections.push(`## Founders\n`);
  sections.push(`${memo.sections.founderProfiles}\n`);

  sections.push(`## Investor Analysis\n`);
  sections.push(`${memo.sections.investorAnalysis}\n`);

  sections.push(`## Funding History\n`);
  sections.push(`${memo.sections.fundingHistory}\n`);

  sections.push(`## Momentum & Traction\n`);
  sections.push(`${memo.sections.momentumAnalysis}\n`);

  sections.push(`## Competitive Landscape\n`);
  sections.push(`${memo.sections.competitiveLandscape}\n`);

  sections.push(`## Thesis Alignment\n`);
  sections.push(`${memo.sections.thesisAlignment}\n`);

  sections.push(`## Strategic Synergies\n`);
  sections.push(`${memo.sections.strategicSynergies}\n`);

  sections.push(`## Risks & Concerns\n`);
  sections.push(`${memo.sections.risksAndFlaws}\n`);

  // Fund Fit Details
  sections.push(`## Fund Fit Analysis\n`);
  sections.push(`- **Stage:** ${memo.fundFit.stage}`);
  sections.push(`- **Sector:** ${memo.fundFit.sector}`);
  sections.push(`- **Geography:** ${memo.fundFit.geography}`);
  sections.push(`- **Check Size:** ${memo.fundFit.checkSize}\n`);
  sections.push(`**Rationale:** ${memo.fundFit.rationale}\n`);
  if (memo.fundFit.concerns.length > 0) {
    sections.push(`**Concerns:**`);
    memo.fundFit.concerns.forEach((c) => sections.push(`- ${c}`));
    sections.push("");
  }

  // Tags
  if (memo.tags.length > 0) {
    sections.push(`## Tags\n`);
    sections.push(memo.tags.map((t) => `\`${t}\``).join(" ") + "\n");
  }

  // Sources
  if (memo.sources && memo.sources.length > 0) {
    sections.push(`## Sources & References\n`);
    memo.sources.forEach((source, index) => {
      const urlPart = source.url ? ` - [Link](${source.url})` : "";
      const datePart = source.date ? ` (${source.date})` : "";
      sections.push(`${index + 1}. **${source.title}** - ${source.source}${datePart}${urlPart}`);
    });
    sections.push("");
  }

  return sections.join("\n");
}

// ===========================================
// Utility Functions
// ===========================================

/**
 * Check if Attio integration is configured
 */
export function isAttioConfigured(): boolean {
  return !!process.env.ATTIO_API_KEY;
}
