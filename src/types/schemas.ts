import { z } from "zod";

// ===========================================
// Input Types
// ===========================================

export const InputTypeSchema = z.enum(["text", "url", "image", "audio", "file"]);
export type InputType = z.infer<typeof InputTypeSchema>;

export const AttachmentSchema = z.object({
  type: InputTypeSchema,
  content: z.union([z.string(), z.instanceof(Buffer)]),
  filename: z.string().optional(),
  mimeType: z.string().optional(),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

export const ParsedInputSchema = z.object({
  rawContent: z.string(),
  attachments: z.array(AttachmentSchema),
  potentialCompanies: z.array(z.string()),
});
export type ParsedInput = z.infer<typeof ParsedInputSchema>;

// ===========================================
// Company Types
// ===========================================

export const IdentifiedCompanySchema = z.object({
  name: z.string(),
  confidence: z.number().min(0).max(1),
  existsInCRM: z.boolean(),
  attioRecordId: z.string().optional(),
  extractedContext: z.string(),
});
export type IdentifiedCompany = z.infer<typeof IdentifiedCompanySchema>;

export const CompanyBasicsSchema = z.object({
  name: z.string(),
  website: z.string().optional(),
  description: z.string(),
  industry: z.string(),
  stage: z.string(),
  location: z.string().optional(),
});
export type CompanyBasics = z.infer<typeof CompanyBasicsSchema>;

export const FounderSchema = z.object({
  name: z.string(),
  role: z.string(),
  background: z.string(),
  linkedinUrl: z.string().optional(),
});
export type Founder = z.infer<typeof FounderSchema>;

export const FundingInfoSchema = z.object({
  totalRaised: z.string(),
  lastRound: z.string().optional(),
  lastRoundDate: z.string().optional(),
  investors: z.array(z.string()),
});
export type FundingInfo = z.infer<typeof FundingInfoSchema>;

export const MomentumInfoSchema = z.object({
  recentNews: z.array(z.string()),
  growthIndicators: z.string(),
});
export type MomentumInfo = z.infer<typeof MomentumInfoSchema>;

export const CompetitiveInfoSchema = z.object({
  landscape: z.string(),
  competitors: z.array(z.string()),
  differentiation: z.string(),
});
export type CompetitiveInfo = z.infer<typeof CompetitiveInfoSchema>;

export const CompanyResearchSchema = z.object({
  company: CompanyBasicsSchema,
  founders: z.array(FounderSchema),
  funding: FundingInfoSchema,
  momentum: MomentumInfoSchema,
  competitive: CompetitiveInfoSchema,
});
export type CompanyResearch = z.infer<typeof CompanyResearchSchema>;

// ===========================================
// Strategic Partner Types
// ===========================================

export const StrategicPartnerSchema = z.object({
  name: z.string().describe("Partner company name"),
  markets: z.array(z.string()).describe("Target markets/verticals"),
  thesis: z.string().describe("Investment thesis or strategic focus"),
  interests: z.array(z.string()).describe("Key interest areas"),
});
export type StrategicPartner = z.infer<typeof StrategicPartnerSchema>;

export const PartnerMatchSchema = z.object({
  partnerName: z.string().describe("Name of the strategic partner"),
  matchLevel: z.enum(["high", "medium", "low", "none"]).describe("Level of fit with this partner"),
  matchScore: z.number().min(0).max(10).describe("Numerical match score (0.0-10.0)"),
  matchedInterests: z.array(z.string()).describe("Specific interests that match"),
  matchedMarkets: z.array(z.string()).describe("Specific markets that overlap"),
  rationale: z.string().describe("Explanation of why this is a good/poor match"),
  potentialSynergies: z.array(z.string()).describe("Specific collaboration opportunities"),
});
export type PartnerMatch = z.infer<typeof PartnerMatchSchema>;

export const StrategicFitAnalysisSchema = z.object({
  overallFitLevel: z.enum(["excellent", "good", "moderate", "limited"]).describe("Overall fit with the fund's partner network"),
  overallFitScore: z.number().min(0).max(10).describe("Aggregate fit score across all partners (0.0-10.0)"),
  primaryCategory: z.string().describe("Primary categorization of the opportunity"),
  secondaryCategories: z.array(z.string()).describe("Secondary categorizations"),
  partnerMatches: z.array(PartnerMatchSchema).describe("Match analysis for each strategic partner"),
  topPartnerOpportunities: z.array(z.string()).describe("Top 3 partner collaboration opportunities"),
  strategicNarrative: z.string().describe("Summary of how this opportunity fits the fund's strategic network"),
});
export type StrategicFitAnalysis = z.infer<typeof StrategicFitAnalysisSchema>;

// ===========================================
// File Triage & Classification
// ===========================================

export const ResearchAreaEnumSchema = z.enum([
  "basics",
  "founders",
  "funding",
  "product",
  "competitive",
  "news",
]);
export type ResearchAreaEnum = z.infer<typeof ResearchAreaEnumSchema>;

export const FileClassificationSchema = z.enum([
  "pitch_deck",      // Core company info - factor into ALL research
  "financial_model", // Metrics/projections - factor into funding/traction
  "team_bio",        // Team details - factor into founders research
  "product_doc",     // Product info - factor into product research
  "market_research", // Market/competitive info - factor into competitive
  "press_coverage",  // News/PR - factor into news research
  "reference_only",  // Just context, don't factor into research
  "irrelevant",      // Ignore completely
]);
export type FileClassification = z.infer<typeof FileClassificationSchema>;

export const TriagedFileSchema = z.object({
  fileId: z.string().describe("Unique identifier for the file"),
  filename: z.string().describe("Original filename"),
  classification: FileClassificationSchema.describe("Type of document"),
  summary: z.string().describe("Brief summary of what this file contains"),
  extractedContent: z.object({
    basics: z.string().optional().describe("Content relevant to company basics"),
    founders: z.string().optional().describe("Content relevant to founders/team"),
    funding: z.string().optional().describe("Content relevant to funding"),
    product: z.string().optional().describe("Content relevant to product"),
    competitive: z.string().optional().describe("Content relevant to competition"),
    news: z.string().optional().describe("Content relevant to news/momentum"),
  }).describe("Extracted content organized by research area"),
  useInResearch: z.array(ResearchAreaEnumSchema).describe("Which research areas should use this file's content"),
  reasoning: z.string().describe("Why this file was classified this way"),
});
export type TriagedFile = z.infer<typeof TriagedFileSchema>;

export const FileTriageResultSchema = z.object({
  companyName: z.string().describe("The company name identified from the files"),
  files: z.array(TriagedFileSchema).describe("Classification and extraction for each file"),
  overallConfidence: z.number().min(0).max(1).describe("Confidence in the overall analysis"),
});
export type FileTriageResult = z.infer<typeof FileTriageResultSchema>;

export const AttachmentReferenceSchema = z.object({
  fileId: z.string(),
  filename: z.string(),
  classification: FileClassificationSchema,
  summary: z.string(),
  usedIn: z.array(ResearchAreaEnumSchema).describe("Which research areas used this file"),
  notUsedReason: z.string().optional().describe("If not used, why"),
});
export type AttachmentReference = z.infer<typeof AttachmentReferenceSchema>;

// ===========================================
// Memo Types
// ===========================================

// Source reference for citations
export const SourceReferenceSchema = z.object({
  title: z.string().describe("Article or source title"),
  source: z.string().describe("Publication name (e.g., TechCrunch, Reuters)"),
  url: z.string().optional().describe("URL if available"),
  date: z.string().optional().describe("Publication date if known"),
  usedIn: z.array(z.string()).optional().describe("Which sections cite this source"),
});
export type SourceReference = z.infer<typeof SourceReferenceSchema>;

// Company Scorecard - objective company metrics
export const CompanyScorecardSchema = z.object({
  team: z.number().min(0).max(10).describe("Quality of founding team and leadership (0.0-10.0)"),
  market: z.number().min(0).max(10).describe("Market size and opportunity (0.0-10.0)"),
  product: z.number().min(0).max(10).describe("Product quality and differentiation (0.0-10.0)"),
  traction: z.number().min(0).max(10).describe("Current traction and growth metrics (0.0-10.0)"),
  competition: z.number().min(0).max(10).describe("Competitive position and moat (0.0-10.0)"),
  overall: z.number().min(0).max(10).describe("Overall company score (0.0-10.0)"),
});
export type CompanyScorecard = z.infer<typeof CompanyScorecardSchema>;

// Fund Fit - how well this matches our fund's thesis
export const FundFitSchema = z.object({
  score: z.number().min(0).max(10).describe("Overall fit with fund thesis (0.0-10.0)"),
  stage: z.enum(["perfect", "good", "acceptable", "outside"]).describe("Stage fit"),
  sector: z.enum(["core", "adjacent", "exploratory", "outside"]).describe("Sector fit"),
  geography: z.enum(["target", "acceptable", "challenging"]).describe("Geography fit"),
  checkSize: z.enum(["ideal", "stretch", "too_small", "too_large"]).describe("Check size fit"),
  rationale: z.string().describe("Explanation of fund fit assessment"),
  alignedTheses: z.array(z.string()).describe("Which fund theses this aligns with"),
  concerns: z.array(z.string()).describe("Concerns about fit"),
});
export type FundFit = z.infer<typeof FundFitSchema>;

// Keep old name for backward compatibility
export const ScorecardSchema = CompanyScorecardSchema;
export type Scorecard = CompanyScorecard;

export const MemoSectionsSchema = z.object({
  companySummary: z.string(),
  founderProfiles: z.string(),
  investorAnalysis: z.string(),
  fundingHistory: z.string(),
  momentumAnalysis: z.string(),
  competitiveLandscape: z.string(),
  thesisAlignment: z.string(),
  strategicSynergies: z.string(),
  risksAndFlaws: z.string(),
});
export type MemoSections = z.infer<typeof MemoSectionsSchema>;

export const InvestmentMemoSchema = z.object({
  summary: z.string(),
  sections: MemoSectionsSchema,
  companyScorecard: CompanyScorecardSchema,
  fundFit: FundFitSchema,
  partnerFit: StrategicFitAnalysisSchema,
  oneLiner: z.string(),
  tags: z.array(z.string()),
  sources: z.array(SourceReferenceSchema).describe("Sources and references cited in the memo"),
  attachmentReferences: z.array(AttachmentReferenceSchema).optional().describe("Files that were analyzed and how they were used"),
  infographicBase64: z.string().optional().describe("Base64-encoded infographic image"),
});
export type InvestmentMemo = z.infer<typeof InvestmentMemoSchema>;

// ===========================================
// Output Types
// ===========================================

export const OpportunityLinksSchema = z.object({
  website: z.string().optional(),
  attioOpportunity: z.string().optional(),
  driveFolder: z.string().optional(),
});
export type OpportunityLinks = z.infer<typeof OpportunityLinksSchema>;

export const ProcessedOpportunitySchema = z.object({
  id: z.string(),
  company: z.string(),
  oneLiner: z.string(),
  score: z.number(),
  tags: z.array(z.string()),
  links: OpportunityLinksSchema,
  attachments: z.array(AttachmentSchema),
  memo: InvestmentMemoSchema,
  createdAt: z.date(),
});
export type ProcessedOpportunity = z.infer<typeof ProcessedOpportunitySchema>;

// ===========================================
// Extracted Company Info (from multi-modal analysis)
// ===========================================

export const ExtractedCompanyInfoSchema = z.object({
  companyName: z.string().describe("The company name extracted from the files"),
  description: z.string().describe("What the company does based on the files"),
  industry: z.string().optional().describe("Industry/sector if identifiable"),
  stage: z.string().optional().describe("Funding stage if mentioned (Pre-Seed, Seed, Series A, etc.)"),
  founders: z.array(z.object({
    name: z.string(),
    role: z.string().optional(),
    background: z.string().optional(),
  })).optional().describe("Founders/team members if visible"),
  metrics: z.object({
    users: z.string().optional(),
    revenue: z.string().optional(),
    growth: z.string().optional(),
    other: z.array(z.string()).optional(),
  }).optional().describe("Any metrics/traction data visible"),
  funding: z.object({
    raised: z.string().optional(),
    investors: z.array(z.string()).optional(),
    seeking: z.string().optional(),
  }).optional().describe("Funding information if visible"),
  additionalContext: z.string().optional().describe("Any other relevant information extracted"),
  confidence: z.number().min(0).max(1).describe("Confidence in the extraction (0.0-1.0)"),
});
export type ExtractedCompanyInfo = z.infer<typeof ExtractedCompanyInfoSchema>;

// ===========================================
// Progress Event Types (for streaming)
// ===========================================

export const ProgressStageSchema = z.enum([
  "parsing",
  "identifying",
  "researching",
  "generating",
  "saving",
  "complete",
  "error",
]);
export type ProgressStage = z.infer<typeof ProgressStageSchema>;

export const ProgressEventSchema = z.object({
  stage: ProgressStageSchema,
  company: z.string().optional(),
  progress: z.number().optional(),
  total: z.number().optional(),
  message: z.string().optional(),
  result: ProcessedOpportunitySchema.optional(),
  error: z.string().optional(),
});
export type ProgressEvent = z.infer<typeof ProgressEventSchema>;
