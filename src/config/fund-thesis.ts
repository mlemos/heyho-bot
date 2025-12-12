/**
 * Fund Thesis Configuration
 *
 * Define your fund's investment thesis, target stages, sectors, and criteria.
 * This configuration is used to analyze how well each opportunity fits with
 * the fund's investment strategy.
 */

export interface FundThesis {
  name: string;
  description: string;
  targetStages: string[];
  targetSectors: string[];
  targetGeographies: string[];
  checkSizeRange: {
    min: string;
    max: string;
    sweet: string;
  };
  keyTheses: string[];
  mustHaves: string[];
  redFlags: string[];
}

/**
 * Fund Thesis Configuration
 *
 * Customize this to match your fund's investment strategy
 */
export const FUND_THESIS: FundThesis = {
  name: "Generalist VC Fund",
  description: "Early-stage technology fund focused on exceptional founders building transformative companies",

  targetStages: ["Pre-Seed", "Seed", "Series A"],

  targetSectors: [
    "Enterprise Software",
    "AI/ML",
    "Developer Tools",
    "Fintech",
    "Healthcare Tech",
    "Climate Tech",
    "Consumer Tech",
  ],

  targetGeographies: ["United States", "Europe", "Israel"],

  checkSizeRange: {
    min: "$500K",
    max: "$5M",
    sweet: "$1-2M",
  },

  keyTheses: [
    "AI-native applications transforming traditional industries",
    "Developer tools and infrastructure enabling 10x productivity",
    "Vertical SaaS with deep domain expertise",
    "Climate solutions with clear path to scale",
    "Fintech infrastructure and embedded finance",
  ],

  mustHaves: [
    "Exceptional founding team with relevant experience",
    "Large market opportunity ($1B+ TAM)",
    "Clear product differentiation or technical moat",
    "Evidence of product-market fit or strong early signals",
    "Capital-efficient business model",
  ],

  redFlags: [
    "Single founder without technical co-founder",
    "Crowded market without clear differentiation",
    "Hardware-heavy with long development cycles",
    "Regulatory-dependent without clear path",
    "Unrealistic valuation expectations",
  ],
};

/**
 * Get fund thesis
 */
export function getFundThesis(): FundThesis {
  return FUND_THESIS;
}

/**
 * Format fund thesis for prompt context
 */
export function formatFundThesisContext(): string {
  const thesis = FUND_THESIS;
  return `
## Fund Investment Thesis: ${thesis.name}

**Description**: ${thesis.description}

**Target Stages**: ${thesis.targetStages.join(", ")}

**Target Sectors**: ${thesis.targetSectors.join(", ")}

**Target Geographies**: ${thesis.targetGeographies.join(", ")}

**Check Size**: ${thesis.checkSizeRange.min} - ${thesis.checkSizeRange.max} (sweet spot: ${thesis.checkSizeRange.sweet})

**Key Investment Theses**:
${thesis.keyTheses.map((t) => `- ${t}`).join("\n")}

**Must-Haves**:
${thesis.mustHaves.map((m) => `- ${m}`).join("\n")}

**Red Flags**:
${thesis.redFlags.map((r) => `- ${r}`).join("\n")}
`;
}
