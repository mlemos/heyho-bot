/**
 * Strategic Partners Configuration
 *
 * Define your fund's strategic partners, their markets, thesis, and interests.
 * This configuration is used to analyze how well each opportunity fits with
 * the fund's partner network.
 */

import type { StrategicPartner } from "../types/schemas";

/**
 * Strategic Partners
 *
 * Add your fund's strategic partners here. Each partner should have:
 * - name: The partner company name
 * - markets: Target markets/verticals they operate in
 * - thesis: Their investment thesis or strategic focus
 * - interests: Specific areas they're interested in
 */
export const STRATEGIC_PARTNERS: StrategicPartner[] = [
  {
    name: "TechCorp Ventures",
    markets: ["Enterprise Software", "Cloud Infrastructure", "DevTools", "Cybersecurity"],
    thesis: "Investing in infrastructure and tools that enable the next generation of enterprise technology",
    interests: [
      "Developer productivity",
      "Cloud-native infrastructure",
      "Security automation",
      "API platforms",
      "Data infrastructure",
      "AI/ML tooling",
    ],
  },
  {
    name: "HealthTech Partners",
    markets: ["Digital Health", "Healthcare", "Biotech", "Medical Devices"],
    thesis: "Backing founders transforming healthcare through technology and data",
    interests: [
      "Telemedicine",
      "Health data analytics",
      "Clinical AI",
      "Patient engagement",
      "Drug discovery",
      "Healthcare operations",
    ],
  },
  {
    name: "FinServ Capital",
    markets: ["Fintech", "Banking", "Insurance", "Payments", "Wealth Management"],
    thesis: "Enabling the future of financial services through innovative technology",
    interests: [
      "Embedded finance",
      "Payment infrastructure",
      "Lending platforms",
      "Compliance automation",
      "Wealth tech",
      "Crypto/DeFi infrastructure",
    ],
  },
  {
    name: "Consumer Growth Fund",
    markets: ["Consumer Tech", "E-commerce", "Marketplaces", "Media & Entertainment"],
    thesis: "Backing exceptional consumer experiences that become category-defining brands",
    interests: [
      "Social commerce",
      "Creator economy",
      "Gaming",
      "Subscription models",
      "Personalization",
      "Community platforms",
    ],
  },
  {
    name: "Industrial Innovations",
    markets: ["Manufacturing", "Logistics", "Supply Chain", "Energy", "Climate Tech"],
    thesis: "Digitizing and decarbonizing the physical economy",
    interests: [
      "Industrial automation",
      "Supply chain visibility",
      "Fleet management",
      "Energy efficiency",
      "Carbon tracking",
      "Smart manufacturing",
    ],
  },
];

/**
 * Get all strategic partners
 */
export function getStrategicPartners(): StrategicPartner[] {
  return STRATEGIC_PARTNERS;
}

/**
 * Get partner by name
 */
export function getPartnerByName(name: string): StrategicPartner | undefined {
  return STRATEGIC_PARTNERS.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get all unique markets across partners
 */
export function getAllMarkets(): string[] {
  const markets = new Set<string>();
  STRATEGIC_PARTNERS.forEach((p) => p.markets.forEach((m) => markets.add(m)));
  return Array.from(markets).sort();
}

/**
 * Get all unique interests across partners
 */
export function getAllInterests(): string[] {
  const interests = new Set<string>();
  STRATEGIC_PARTNERS.forEach((p) => p.interests.forEach((i) => interests.add(i)));
  return Array.from(interests).sort();
}
