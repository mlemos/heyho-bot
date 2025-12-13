/**
 * Attio CRM Integration
 *
 * This module provides a typed client for the Attio CRM API.
 *
 * Setup:
 * 1. Create an API token at https://app.attio.com/settings/api-tokens
 * 2. Add ATTIO_API_KEY to your .env.local file
 *
 * Usage:
 *   import { upsertCompany, createInvestmentOpportunity, attachOpportunityNote } from "@/src/integrations/attio";
 *
 * Flow:
 * 1. upsertCompany(research) - Create/update company from research
 * 2. createInvestmentOpportunity(companyRecordId, companyName, memo, research) - Create opportunity linked to company
 * 3. attachOpportunityNote(opportunityRecordId, memo) - Attach investment memo to opportunity
 */

export {
  // Company operations
  lookupCompany,
  upsertCompany,
  // Investment Opportunity operations
  createInvestmentOpportunity,
  // Notes operations
  attachOpportunityNote,
  // Utility functions
  isAttioConfigured,
  // Types
  type AttioRecord,
  type AttioNote,
  type UpsertCompanyResult,
  type CreateOpportunityResult,
  type AttachNoteResult,
} from "./client";
