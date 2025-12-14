"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { CompanyResearch, InvestmentMemo, StrategicFitAnalysis, FundFit, AttachmentReference, SourceReference } from "@/src/types/schemas";
import { AttachmentList, type AttachedFile } from "@/components/upload";
import { getClassificationLabel, getClassificationIcon } from "@/src/lib/multimodal";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "next-themes";

// ===========================================
// Types
// ===========================================

type TaskStatus = "pending" | "in_progress" | "completed" | "error";

type PipelineStep =
  | "input_triage"
  | "input_extract"
  | "identify"
  | "crm_check"
  | "research_basics"
  | "research_founders"
  | "research_funding"
  | "research_product"
  | "research_traction"
  | "research_market"
  | "research_competitive"
  | "research_news"
  | "synthesize"
  | "generate_memo"
  | "generate_infographic"
  | "save_crm";

interface PipelineStatus {
  input_triage: TaskStatus;
  input_extract: TaskStatus;
  identify: TaskStatus;
  crm_check: TaskStatus;
  research_basics: TaskStatus;
  research_founders: TaskStatus;
  research_funding: TaskStatus;
  research_product: TaskStatus;
  research_traction: TaskStatus;
  research_market: TaskStatus;
  research_competitive: TaskStatus;
  research_news: TaskStatus;
  synthesize: TaskStatus;
  generate_memo: TaskStatus;
  generate_infographic: TaskStatus;
  save_crm: TaskStatus;
}

// Keep old type for backward compatibility with API
type ResearchArea = "basics" | "founders" | "funding" | "product" | "traction" | "market" | "competitive" | "news";

interface ProcessResult {
  id: string;
  company: string;
  research: CompanyResearch;
  memo: InvestmentMemo;
  opportunityRecordId: string;
  opportunityWebUrl?: string;
  companyRecordId?: string;
  createdAt: string;
  totalTokens?: number;
  totalTimeMs?: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ===========================================
// Components
// ===========================================

function PipelineProgress({ status }: { status: PipelineStatus }) {
  const steps: { key: PipelineStep; label: string; shortLabel: string; group: string }[] = [
    { key: "input_triage", label: "Triage Files", shortLabel: "Triage", group: "input" },
    { key: "input_extract", label: "Extract Data", shortLabel: "Extract", group: "input" },
    { key: "identify", label: "Identify Company", shortLabel: "Identify", group: "setup" },
    { key: "crm_check", label: "Check CRM", shortLabel: "CRM", group: "setup" },
    { key: "research_basics", label: "Company Info", shortLabel: "Company", group: "research" },
    { key: "research_founders", label: "Founders", shortLabel: "Founders", group: "research" },
    { key: "research_funding", label: "Funding", shortLabel: "Funding", group: "research" },
    { key: "research_product", label: "Product", shortLabel: "Product", group: "research" },
    { key: "research_traction", label: "Traction", shortLabel: "Traction", group: "research" },
    { key: "research_market", label: "Market Potential", shortLabel: "Market", group: "research" },
    { key: "research_competitive", label: "Competition", shortLabel: "Compete", group: "research" },
    { key: "research_news", label: "News", shortLabel: "News", group: "research" },
    { key: "synthesize", label: "Synthesize Data", shortLabel: "Synthesize", group: "generate" },
    { key: "generate_memo", label: "Generate Memo", shortLabel: "Memo", group: "generate" },
    { key: "generate_infographic", label: "Generate Infographic", shortLabel: "Infographic", group: "generate" },
    { key: "save_crm", label: "Save to CRM", shortLabel: "Save", group: "save" },
  ];

  const statusIcon = (s: TaskStatus) => {
    switch (s) {
      case "completed":
        return <span style={{ color: 'var(--success)' }}>✓</span>;
      case "in_progress":
        return <span className="animate-spin inline-block" style={{ color: 'var(--info)' }}>○</span>;
      case "error":
        return <span style={{ color: 'var(--error)' }}>✗</span>;
      default:
        return <span style={{ color: 'var(--foreground-muted)' }}>○</span>;
    }
  };

  const inputSteps = steps.filter((s) => s.group === "input");
  const setupSteps = steps.filter((s) => s.group === "setup");
  const researchSteps = steps.filter((s) => s.group === "research");
  const generateSteps = steps.filter((s) => s.group === "generate");
  const saveSteps = steps.filter((s) => s.group === "save");

  // Check if any input steps have activity (not all pending)
  const hasInputActivity = inputSteps.some(({ key }) => status[key] !== "pending");

  return (
    <div className="space-y-4">
      {/* Input Processing - only show if there's activity */}
      {hasInputActivity && (
        <div>
          <div className="text-xs md:text-[10px] uppercase tracking-wide mb-1.5" style={{ color: 'var(--foreground-muted)' }}>Input Processing</div>
          <div className="flex flex-wrap gap-3 md:gap-3">
            {inputSteps.map(({ key, label, shortLabel }) => (
              <div key={key} className="flex items-center gap-2 text-sm md:text-xs">
                {statusIcon(status[key])}
                <span style={{ color: status[key] === "completed" ? 'var(--foreground-secondary)' : 'var(--foreground-muted)' }}>
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{shortLabel}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup */}
      <div>
        <div className="text-xs md:text-[10px] uppercase tracking-wide mb-1.5" style={{ color: 'var(--foreground-muted)' }}>Setup</div>
        <div className="flex flex-wrap gap-3 md:gap-3">
          {setupSteps.map(({ key, label, shortLabel }) => (
            <div key={key} className="flex items-center gap-2 text-sm md:text-xs">
              {statusIcon(status[key])}
              <span style={{ color: status[key] === "completed" ? 'var(--foreground-secondary)' : 'var(--foreground-muted)' }}>
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Research */}
      <div>
        <div className="text-xs md:text-[10px] uppercase tracking-wide mb-1.5" style={{ color: 'var(--foreground-muted)' }}>Research</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
          {researchSteps.map(({ key, label, shortLabel }) => (
            <div key={key} className="flex items-center gap-2 text-sm md:text-xs">
              {statusIcon(status[key])}
              <span style={{ color: status[key] === "completed" ? 'var(--foreground-secondary)' : 'var(--foreground-muted)' }}>
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Generate */}
      <div>
        <div className="text-xs md:text-[10px] uppercase tracking-wide mb-1.5" style={{ color: 'var(--foreground-muted)' }}>Generate</div>
        <div className="flex flex-wrap gap-3 md:gap-3">
          {generateSteps.map(({ key, label, shortLabel }) => (
            <div key={key} className="flex items-center gap-2 text-sm md:text-xs">
              {statusIcon(status[key])}
              <span style={{ color: status[key] === "completed" ? 'var(--foreground-secondary)' : 'var(--foreground-muted)' }}>
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div>
        <div className="text-xs md:text-[10px] uppercase tracking-wide mb-1.5" style={{ color: 'var(--foreground-muted)' }}>Save</div>
        <div className="flex gap-3">
          {saveSteps.map(({ key, label, shortLabel }) => (
            <div key={key} className="flex items-center gap-2 text-sm md:text-xs">
              {statusIcon(status[key])}
              <span style={{ color: status[key] === "completed" ? 'var(--foreground-secondary)' : 'var(--foreground-muted)' }}>
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompanyScorecard({ scores }: { scores: InvestmentMemo["companyScorecard"] }) {
  const items = [
    { key: "team", label: "Team" },
    { key: "market", label: "Market" },
    { key: "product", label: "Product" },
    { key: "traction", label: "Traction" },
    { key: "competition", label: "Competition" },
  ] as const;

  const getBarColor = (score: number) => {
    if (score >= 8) return 'var(--score-high)';
    if (score >= 6) return 'var(--score-medium)';
    if (score >= 4) return '#f97316'; // orange
    return 'var(--score-low)';
  };

  const getScoreStyle = (score: number) => {
    if (score >= 8) return { backgroundColor: 'var(--score-high-bg)', color: 'var(--score-high)', borderColor: 'var(--score-high)' };
    if (score >= 6) return { backgroundColor: 'var(--score-medium-bg)', color: 'var(--score-medium)', borderColor: 'var(--score-medium)' };
    if (score >= 4) return { backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#f97316', borderColor: '#f97316' };
    return { backgroundColor: 'var(--score-low-bg)', color: 'var(--score-low)', borderColor: 'var(--score-low)' };
  };

  return (
    <div className="space-y-4">
      {/* Score Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-16 md:w-14 md:h-14 rounded-full flex items-center justify-center text-xl md:text-lg font-bold border"
            style={getScoreStyle(scores.overall)}
          >
            {scores.overall.toFixed(1)}
          </div>
          <div>
            <div className="text-base md:text-sm font-medium" style={{ color: 'var(--foreground)' }}>Company Score</div>
            <div className="text-sm md:text-xs" style={{ color: 'var(--foreground-muted)' }}>out of 10.0</div>
          </div>
        </div>
      </div>

      {/* Score Bars */}
      <div className="space-y-3 md:space-y-2">
        {items.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-sm md:text-xs w-24 md:w-20" style={{ color: 'var(--foreground-muted)' }}>{label}</span>
            <div className="flex-1 h-2.5 md:h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--card-hover)' }}>
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${scores[key] * 10}%`, backgroundColor: getBarColor(scores[key]) }}
              />
            </div>
            <span className="text-sm md:text-xs w-10 md:w-8" style={{ color: 'var(--foreground-secondary)' }}>{scores[key].toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FundFitCard({ fundFit }: { fundFit: FundFit }) {
  const getScoreStyle = (score: number) => {
    if (score >= 8) return { backgroundColor: 'var(--score-high-bg)', color: 'var(--score-high)', borderColor: 'var(--score-high)' };
    if (score >= 6) return { backgroundColor: 'var(--score-blue-bg)', color: 'var(--score-blue)', borderColor: 'var(--score-blue)' };
    if (score >= 4) return { backgroundColor: 'var(--score-medium-bg)', color: 'var(--score-medium)', borderColor: 'var(--score-medium)' };
    return { backgroundColor: 'var(--score-low-bg)', color: 'var(--score-low)', borderColor: 'var(--score-low)' };
  };

  const getFitBadgeStyle = (fit: string) => {
    switch (fit) {
      case "perfect":
      case "core":
      case "target":
      case "ideal":
        return { backgroundColor: 'var(--score-high-bg)', color: 'var(--score-high)' };
      case "good":
      case "adjacent":
      case "acceptable":
      case "stretch":
        return { backgroundColor: 'var(--score-blue-bg)', color: 'var(--score-blue)' };
      case "exploratory":
      case "challenging":
        return { backgroundColor: 'var(--score-medium-bg)', color: 'var(--score-medium)' };
      default:
        return { backgroundColor: 'var(--score-low-bg)', color: 'var(--score-low)' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Score Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-16 md:w-14 md:h-14 rounded-full flex items-center justify-center text-xl md:text-lg font-bold border"
            style={getScoreStyle(fundFit.score)}
          >
            {fundFit.score.toFixed(1)}
          </div>
          <div>
            <div className="text-base md:text-sm font-medium" style={{ color: 'var(--foreground)' }}>Fund Fit Score</div>
            <div className="text-sm md:text-xs" style={{ color: 'var(--foreground-muted)' }}>out of 10.0</div>
          </div>
        </div>
      </div>

      {/* Fit Dimensions */}
      <div className="grid grid-cols-2 gap-2.5 md:gap-2">
        <div className="flex items-center justify-between rounded-lg px-3 py-2.5 md:py-2" style={{ backgroundColor: 'var(--card)' }}>
          <span className="text-sm md:text-xs" style={{ color: 'var(--foreground-muted)' }}>Stage</span>
          <span className="text-sm md:text-xs px-2 py-0.5 rounded-full" style={getFitBadgeStyle(fundFit.stage)}>
            {fundFit.stage}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg px-3 py-2.5 md:py-2" style={{ backgroundColor: 'var(--card)' }}>
          <span className="text-sm md:text-xs" style={{ color: 'var(--foreground-muted)' }}>Sector</span>
          <span className="text-sm md:text-xs px-2 py-0.5 rounded-full" style={getFitBadgeStyle(fundFit.sector)}>
            {fundFit.sector}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg px-3 py-2.5 md:py-2" style={{ backgroundColor: 'var(--card)' }}>
          <span className="text-sm md:text-xs" style={{ color: 'var(--foreground-muted)' }}>Geography</span>
          <span className="text-sm md:text-xs px-2 py-0.5 rounded-full" style={getFitBadgeStyle(fundFit.geography)}>
            {fundFit.geography}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg px-3 py-2.5 md:py-2" style={{ backgroundColor: 'var(--card)' }}>
          <span className="text-sm md:text-xs" style={{ color: 'var(--foreground-muted)' }}>Check Size</span>
          <span className="text-sm md:text-xs px-2 py-0.5 rounded-full" style={getFitBadgeStyle(fundFit.checkSize)}>
            {fundFit.checkSize.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Aligned Theses */}
      {fundFit.alignedTheses.length > 0 && (
        <div>
          <h5 className="text-sm md:text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--foreground)' }}>Aligned Theses</h5>
          <div className="flex flex-wrap gap-1.5 md:gap-1">
            {fundFit.alignedTheses.map((thesis) => (
              <span
                key={thesis}
                className="text-sm md:text-xs px-2.5 md:px-2 py-1 rounded-full"
                style={{ backgroundColor: 'var(--score-high-bg)', color: 'var(--score-high)' }}
              >
                {thesis}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rationale */}
      <div>
        <h5 className="text-sm md:text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--foreground)' }}>Rationale</h5>
        <p className="text-sm md:text-xs leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>{fundFit.rationale}</p>
      </div>

      {/* Concerns */}
      {fundFit.concerns.length > 0 && (
        <div>
          <h5 className="text-sm md:text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--foreground)' }}>Concerns</h5>
          <ul className="space-y-1.5 md:space-y-1">
            {fundFit.concerns.map((concern, i) => (
              <li key={i} className="text-sm md:text-xs flex items-start gap-2 leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>
                <span style={{ color: 'var(--warning)' }}>!</span>
                {concern}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StrategicFitCard({ strategicFit }: { strategicFit: StrategicFitAnalysis }) {
  const getScoreStyle = (score: number) => {
    if (score >= 8) return { backgroundColor: 'var(--score-purple-bg)', color: 'var(--score-purple)', borderColor: 'var(--score-purple)' };
    if (score >= 6) return { backgroundColor: 'var(--score-purple-bg)', color: 'var(--score-purple)', borderColor: 'var(--score-purple)' };
    if (score >= 4) return { backgroundColor: 'var(--score-medium-bg)', color: 'var(--score-medium)', borderColor: 'var(--score-medium)' };
    return { backgroundColor: 'var(--card)', color: 'var(--foreground-muted)', borderColor: 'var(--border)' };
  };

  const getFitLevelStyle = (level: string) => {
    switch (level) {
      case "excellent":
        return { backgroundColor: 'var(--score-high-bg)', color: 'var(--score-high)' };
      case "good":
        return { backgroundColor: 'var(--score-blue-bg)', color: 'var(--score-blue)' };
      case "moderate":
        return { backgroundColor: 'var(--score-medium-bg)', color: 'var(--score-medium)' };
      default:
        return { backgroundColor: 'var(--card)', color: 'var(--foreground-muted)' };
    }
  };

  const getMatchDotColor = (level: string) => {
    switch (level) {
      case "high":
        return 'var(--score-high)';
      case "medium":
        return 'var(--score-medium)';
      case "low":
        return '#f97316';
      default:
        return 'var(--foreground-muted)';
    }
  };

  return (
    <div className="space-y-4">
      {/* Score Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="w-16 h-16 md:w-14 md:h-14 rounded-full flex items-center justify-center text-xl md:text-lg font-bold border"
            style={getScoreStyle(strategicFit.overallFitScore)}
          >
            {strategicFit.overallFitScore.toFixed(1)}
          </div>
          <div>
            <div className="text-base md:text-sm font-medium" style={{ color: 'var(--foreground)' }}>Partner Fit Score</div>
            <div className="text-sm md:text-xs" style={{ color: 'var(--foreground-muted)' }}>out of 10.0</div>
          </div>
          <span
            className="px-2.5 md:px-2 py-1 md:py-0.5 rounded-full text-sm md:text-xs font-medium"
            style={getFitLevelStyle(strategicFit.overallFitLevel)}
          >
            {strategicFit.overallFitLevel.charAt(0).toUpperCase() +
              strategicFit.overallFitLevel.slice(1)}
          </span>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        <span
          className="text-sm md:text-xs px-2.5 md:px-2 py-1 rounded-full"
          style={{ backgroundColor: 'var(--score-purple-bg)', color: 'var(--score-purple)' }}
        >
          {strategicFit.primaryCategory}
        </span>
        {strategicFit.secondaryCategories.slice(0, 3).map((cat) => (
          <span
            key={cat}
            className="text-sm md:text-xs px-2.5 md:px-2 py-1 rounded-full"
            style={{ backgroundColor: 'var(--card)', color: 'var(--foreground-secondary)' }}
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Partner Matches */}
      <div className="space-y-3">
        <h5 className="text-sm md:text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>Partner Matches</h5>
        {strategicFit.partnerMatches.map((match) => (
          <div
            key={match.partnerName}
            className="rounded-lg p-3.5 md:p-3 space-y-2"
            style={{ backgroundColor: 'var(--card)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-base md:text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {match.partnerName}
              </span>
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 md:w-2 md:h-2 rounded-full"
                  style={{ backgroundColor: getMatchDotColor(match.matchLevel) }}
                />
                <span className="text-sm md:text-xs" style={{ color: 'var(--foreground-muted)' }}>
                  {match.matchLevel} ({match.matchScore.toFixed(1)})
                </span>
              </div>
            </div>
            {match.matchLevel !== "none" && (
              <>
                <p className="text-sm md:text-xs leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>{match.rationale}</p>
                {match.matchedInterests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 md:gap-1">
                    {match.matchedInterests.slice(0, 4).map((interest) => (
                      <span
                        key={interest}
                        className="text-sm md:text-xs px-2 md:px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--card-hover)', color: 'var(--foreground-secondary)' }}
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Top Opportunities */}
      {strategicFit.topPartnerOpportunities.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm md:text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
            Top Partner Opportunities
          </h5>
          <ul className="space-y-1.5 md:space-y-1">
            {strategicFit.topPartnerOpportunities.map((opp, i) => (
              <li key={i} className="text-sm md:text-xs flex items-start gap-2 leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>
                <span style={{ color: 'var(--success)' }}>&#x2022;</span>
                {opp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strategic Narrative */}
      <div className="pt-3 md:pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-sm md:text-xs italic leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>{strategicFit.strategicNarrative}</p>
      </div>
    </div>
  );
}

function SourcesCard({ sources }: { sources: SourceReference[] }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="space-y-3 md:space-y-2">
      <h5 className="text-sm md:text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
        Sources ({sources.length})
      </h5>
      <div className="space-y-2">
        {sources.map((source, index) => (
          <div
            key={index}
            className="rounded-lg p-3 md:p-2.5 flex items-start gap-3"
            style={{ backgroundColor: 'var(--card)' }}
          >
            <span className="text-sm md:text-xs font-mono flex-shrink-0" style={{ color: 'var(--foreground-muted)' }}>
              [{index + 1}]
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm md:text-xs hover:underline line-clamp-2"
                      style={{ color: 'var(--info)' }}
                    >
                      {source.title}
                    </a>
                  ) : (
                    <span className="text-sm md:text-xs line-clamp-2" style={{ color: 'var(--foreground-secondary)' }}>
                      {source.title}
                    </span>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs md:text-[10px]" style={{ color: 'var(--foreground-muted)' }}>
                    <span>{source.source}</span>
                    {source.date && (
                      <>
                        <span>•</span>
                        <span>{source.date}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {source.usedIn && source.usedIn.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {source.usedIn.map((section) => (
                    <span
                      key={section}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--card-hover)', color: 'var(--foreground-muted)' }}
                    >
                      {section}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttachmentReferencesCard({ attachments }: { attachments: AttachmentReference[] }) {
  const usedAttachments = attachments.filter(
    (a) => a.classification !== "irrelevant" && a.classification !== "reference_only"
  );
  const notUsedAttachments = attachments.filter(
    (a) => a.classification === "irrelevant" || a.classification === "reference_only"
  );

  const getUsageColor = (usedIn: string[]) => {
    if (usedIn.length >= 5) return 'var(--score-high)';
    if (usedIn.length >= 3) return 'var(--score-blue)';
    if (usedIn.length >= 1) return 'var(--score-medium)';
    return 'var(--foreground-muted)';
  };

  return (
    <div className="space-y-4 md:space-y-3">
      {/* Used Files */}
      {usedAttachments.length > 0 && (
        <div className="space-y-3 md:space-y-2">
          <h5 className="text-sm md:text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
            Files Used in Research ({usedAttachments.length})
          </h5>
          {usedAttachments.map((attachment) => (
            <div
              key={attachment.fileId}
              className="rounded-lg p-3.5 md:p-3 space-y-2"
              style={{ backgroundColor: 'var(--card)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 md:gap-2 min-w-0">
                  <span className="text-xl md:text-lg flex-shrink-0">
                    {getClassificationIcon(attachment.classification)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-base md:text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                      {attachment.filename}
                    </div>
                    <div className="text-sm md:text-xs" style={{ color: 'var(--foreground-muted)' }}>
                      {getClassificationLabel(attachment.classification)}
                    </div>
                  </div>
                </div>
                <span className="text-sm md:text-xs flex-shrink-0" style={{ color: getUsageColor(attachment.usedIn) }}>
                  {attachment.usedIn.length} area{attachment.usedIn.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-sm md:text-xs leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>{attachment.summary}</p>
              {attachment.usedIn.length > 0 && (
                <div className="flex flex-wrap gap-1.5 md:gap-1">
                  {attachment.usedIn.map((area) => (
                    <span
                      key={area}
                      className="text-sm md:text-xs px-2 md:px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--score-high-bg)', color: 'var(--score-high)' }}
                    >
                      {area}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Not Used Files */}
      {notUsedAttachments.length > 0 && (
        <div className="space-y-3 md:space-y-2">
          <h5 className="text-sm md:text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
            Files Not Used ({notUsedAttachments.length})
          </h5>
          {notUsedAttachments.map((attachment) => (
            <div
              key={attachment.fileId}
              className="rounded-lg p-3.5 md:p-3 opacity-60"
              style={{ backgroundColor: 'var(--card)' }}
            >
              <div className="flex items-start gap-2.5 md:gap-2">
                <span className="text-xl md:text-lg flex-shrink-0">
                  {getClassificationIcon(attachment.classification)}
                </span>
                <div className="min-w-0">
                  <div className="text-base md:text-sm font-medium truncate" style={{ color: 'var(--foreground-muted)' }}>
                    {attachment.filename}
                  </div>
                  <div className="text-sm md:text-xs" style={{ color: 'var(--foreground-muted)' }}>
                    {attachment.notUsedReason || getClassificationLabel(attachment.classification)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OpportunityCard({
  result,
  expanded,
  onToggle,
}: {
  result: ProcessResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { memo, research } = result;

  const getCompanyScoreStyle = (score: number) => {
    if (score >= 8) return { backgroundColor: 'var(--score-high-bg)', color: 'var(--score-high)' };
    if (score >= 6) return { backgroundColor: 'var(--score-medium-bg)', color: 'var(--score-medium)' };
    return { backgroundColor: 'var(--score-low-bg)', color: 'var(--score-low)' };
  };

  const getFundScoreStyle = (score: number) => {
    if (score >= 8) return { backgroundColor: 'var(--score-blue-bg)', color: 'var(--score-blue)' };
    if (score >= 6) return { backgroundColor: 'var(--score-blue-bg)', color: 'var(--score-blue)' };
    if (score >= 4) return { backgroundColor: 'var(--score-medium-bg)', color: 'var(--score-medium)' };
    return { backgroundColor: 'var(--score-low-bg)', color: 'var(--score-low)' };
  };

  const getPartnerScoreStyle = (score: number) => {
    if (score >= 8) return { backgroundColor: 'var(--score-purple-bg)', color: 'var(--score-purple)' };
    if (score >= 6) return { backgroundColor: 'var(--score-purple-bg)', color: 'var(--score-purple)' };
    if (score >= 4) return { backgroundColor: 'var(--score-medium-bg)', color: 'var(--score-medium)' };
    return { backgroundColor: 'var(--card)', color: 'var(--foreground-muted)' };
  };

  return (
    <div className="border rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
      {/* Header */}
      <div
        className="p-4 md:p-4 cursor-pointer transition-colors"
        style={{ backgroundColor: 'var(--card)' }}
        onClick={onToggle}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--card-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--card)'}
      >
        {/* Title and Stage - Stack on very small screens */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg md:text-lg font-semibold truncate" style={{ color: 'var(--foreground)' }}>{research.company.name}</h3>
              <span className="text-sm md:text-xs px-2.5 md:px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--card-hover)', color: 'var(--foreground-muted)' }}>
                {research.company.stage}
              </span>
              {/* Metrics badge */}
              {(result.totalTokens || result.totalTimeMs) && (
                <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--card-hover)', color: 'var(--foreground-muted)' }}>
                  {result.totalTokens ? formatTokens(result.totalTokens) : ""}
                  {result.totalTokens && result.totalTimeMs ? " · " : ""}
                  {result.totalTimeMs ? formatTime(result.totalTimeMs) : ""}
                </span>
              )}
            </div>
            <p className="text-sm md:text-sm mt-1.5 md:mt-1 line-clamp-2 leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>{memo.oneLiner}</p>
          </div>

          {/* 3 Score Indicators - More compact on mobile */}
          <div className="flex items-center gap-3 md:gap-3 flex-shrink-0">
            {/* Company Score */}
            <div className="text-center">
              <div
                className="w-12 h-12 md:w-11 md:h-11 rounded-full flex items-center justify-center text-sm md:text-xs font-bold"
                style={getCompanyScoreStyle(memo.companyScorecard.overall)}
              >
                {memo.companyScorecard.overall.toFixed(1)}
              </div>
              <span className="text-xs md:text-[10px] mt-1 md:mt-0.5 block" style={{ color: 'var(--foreground-muted)' }}>Company</span>
            </div>
            {/* Fund Fit Score */}
            <div className="text-center">
              <div
                className="w-12 h-12 md:w-11 md:h-11 rounded-full flex items-center justify-center text-sm md:text-xs font-bold"
                style={getFundScoreStyle(memo.fundFit.score)}
              >
                {memo.fundFit.score.toFixed(1)}
              </div>
              <span className="text-xs md:text-[10px] mt-1 md:mt-0.5 block" style={{ color: 'var(--foreground-muted)' }}>Fund</span>
            </div>
            {/* Partner Fit Score */}
            <div className="text-center">
              <div
                className="w-12 h-12 md:w-11 md:h-11 rounded-full flex items-center justify-center text-sm md:text-xs font-bold"
                style={getPartnerScoreStyle(memo.partnerFit.overallFitScore)}
              >
                {memo.partnerFit.overallFitScore.toFixed(1)}
              </div>
              <span className="text-xs md:text-[10px] mt-1 md:mt-0.5 block" style={{ color: 'var(--foreground-muted)' }}>Partners</span>
            </div>
          </div>
        </div>

        {/* Tags - Fewer on mobile */}
        <div className="flex flex-wrap gap-1.5 md:gap-1 mt-3">
          {memo.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-sm md:text-xs px-2.5 md:px-2 py-1 md:py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--score-blue-bg)', color: 'var(--score-blue)' }}
            >
              {tag}
            </span>
          ))}
          {memo.tags.length > 4 && (
            <span className="text-sm md:text-xs px-2.5 md:px-2 py-1 md:py-0.5 rounded-full" style={{ backgroundColor: 'var(--card-hover)', color: 'var(--foreground-muted)' }}>
              +{memo.tags.length - 4}
            </span>
          )}
        </div>

        {/* Quick Links - Larger touch targets on mobile */}
        <div className="flex flex-wrap gap-2 mt-4 md:mt-3" onClick={(e) => e.stopPropagation()}>
          {research.company.website && (
            <a
              href={research.company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm md:text-xs px-4 md:px-3 py-2.5 md:py-1.5 rounded-lg transition-colors touch-manipulation"
              style={{ backgroundColor: 'var(--card-hover)', color: 'var(--foreground-secondary)' }}
            >
              Website
            </a>
          )}
          {result.opportunityWebUrl && (
            <a
              href={result.opportunityWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm md:text-xs px-4 md:px-3 py-2.5 md:py-1.5 rounded-lg transition-colors touch-manipulation"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              View in Attio
            </a>
          )}
          <button
            onClick={() => onToggle()}
            className="text-sm md:text-xs px-4 md:px-3 py-2.5 md:py-1.5 rounded-lg transition-colors touch-manipulation"
            style={{ backgroundColor: 'var(--card-hover)', color: 'var(--foreground-secondary)' }}
          >
            {expanded ? "Hide Memo" : "Full Memo"}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 md:p-4 space-y-5 md:space-y-4" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--background-secondary)' }}>
          {/* Company Scorecard */}
          <div>
            <h4 className="text-base md:text-sm font-medium mb-3" style={{ color: 'var(--foreground-secondary)' }}>Company Scorecard</h4>
            <CompanyScorecard scores={memo.companyScorecard} />
          </div>

          {/* Fund Fit */}
          <div>
            <h4 className="text-base md:text-sm font-medium mb-3" style={{ color: 'var(--foreground-secondary)' }}>Fund Fit</h4>
            <FundFitCard fundFit={memo.fundFit} />
          </div>

          {/* Key Info - Single column on very small screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-4">
            <div>
              <h4 className="text-sm md:text-xs font-bold uppercase tracking-wide mb-1.5 md:mb-1" style={{ color: 'var(--foreground)' }}>Industry</h4>
              <p className="text-base md:text-sm" style={{ color: 'var(--foreground-secondary)' }}>{research.company.industry}</p>
            </div>
            <div>
              <h4 className="text-sm md:text-xs font-bold uppercase tracking-wide mb-1.5 md:mb-1" style={{ color: 'var(--foreground)' }}>Funding</h4>
              <p className="text-base md:text-sm" style={{ color: 'var(--foreground-secondary)' }}>{research.funding.totalRaised}</p>
            </div>
            <div>
              <h4 className="text-sm md:text-xs font-bold uppercase tracking-wide mb-1.5 md:mb-1" style={{ color: 'var(--foreground)' }}>Location</h4>
              <p className="text-base md:text-sm" style={{ color: 'var(--foreground-secondary)' }}>{research.company.location || "Unknown"}</p>
            </div>
            <div>
              <h4 className="text-sm md:text-xs font-bold uppercase tracking-wide mb-1.5 md:mb-1" style={{ color: 'var(--foreground)' }}>Investors</h4>
              <p className="text-base md:text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                {research.funding.investors.slice(0, 3).join(", ")}
              </p>
            </div>
          </div>

          {/* Founders */}
          <div>
            <h4 className="text-sm md:text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--foreground)' }}>Founders</h4>
            <div className="space-y-3 md:space-y-2">
              {research.founders.slice(0, 3).map((founder, i) => (
                <div key={i}>
                  <span className="text-base md:text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>{founder.name}</span>
                  <span className="text-base md:text-sm" style={{ color: 'var(--foreground-muted)' }}> - {founder.role}</span>
                  <p className="text-sm md:text-xs mt-1 md:mt-0.5 line-clamp-2 leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>{founder.background}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div>
            <h4 className="text-sm md:text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--foreground)' }}>Summary</h4>
            <p className="text-base md:text-sm leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>{memo.summary}</p>
          </div>

          {/* Risks */}
          <div>
            <h4 className="text-sm md:text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--foreground)' }}>Risks</h4>
            <p className="text-base md:text-sm leading-relaxed" style={{ color: 'var(--foreground-secondary)' }}>{memo.sections.risksAndFlaws}</p>
          </div>

          {/* Strategic Partner Fit */}
          {memo.partnerFit && (
            <div>
              <h4 className="text-base md:text-sm font-medium mb-3" style={{ color: 'var(--foreground-secondary)' }}>Strategic Partner Fit</h4>
              <StrategicFitCard strategicFit={memo.partnerFit} />
            </div>
          )}

          {/* Infographic */}
          {memo.infographicBase64 && (
            <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base md:text-sm font-medium" style={{ color: 'var(--foreground-secondary)' }}>Investment Infographic</h4>
                <a
                  href={memo.infographicBase64}
                  download={`${research.company.name}-infographic.png`}
                  className="text-sm md:text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--card-hover)', color: 'var(--foreground-secondary)' }}
                >
                  Download
                </a>
              </div>
              <div className="rounded-lg p-4 flex justify-center" style={{ backgroundColor: 'var(--card)' }}>
                <img
                  src={memo.infographicBase64}
                  alt={`${research.company.name} Investment Infographic`}
                  className="max-w-full h-auto rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ maxHeight: "600px" }}
                  onClick={() => {
                    // Convert data URL to blob for better browser support
                    const dataUrl = memo.infographicBase64!;
                    const [header, base64] = dataUrl.split(",");
                    const mimeMatch = header.match(/:(.*?);/);
                    const mime = mimeMatch ? mimeMatch[1] : "image/png";
                    const binary = atob(base64);
                    const array = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                      array[i] = binary.charCodeAt(i);
                    }
                    const blob = new Blob([array], { type: mime });
                    const blobUrl = URL.createObjectURL(blob);
                    window.open(blobUrl, "_blank");
                  }}
                  title="Click to open in new tab"
                />
              </div>
            </div>
          )}

          {/* Sources */}
          {memo.sources && memo.sources.length > 0 && (
            <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <h4 className="text-base md:text-sm font-medium mb-3" style={{ color: 'var(--foreground-secondary)' }}>Sources & References</h4>
              <SourcesCard sources={memo.sources} />
            </div>
          )}

          {/* Attachment References */}
          {memo.attachmentReferences && memo.attachmentReferences.length > 0 && (
            <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <h4 className="text-base md:text-sm font-medium mb-3" style={{ color: 'var(--foreground-secondary)' }}>Analyzed Files</h4>
              <AttachmentReferencesCard attachments={memo.attachmentReferences} />
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}

function formatTime(ms: number): string {
  if (ms >= 60000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ProcessingCard({
  company,
  pipelineStatus,
  metrics,
}: {
  company: string;
  pipelineStatus: PipelineStatus;
  metrics?: { tokens: number; elapsed: number };
}) {
  return (
    <div className="border rounded-xl p-4 md:p-4 shadow-sm" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--score-blue-bg)' }}>
          <span className="animate-spin text-lg md:text-base" style={{ color: 'var(--score-blue)' }}>○</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg md:text-lg font-semibold truncate" style={{ color: 'var(--foreground)' }}>{company}</h3>
          <p className="text-sm md:text-xs" style={{ color: 'var(--foreground-muted)' }}>Processing...</p>
        </div>
        {/* Live Metrics */}
        {metrics && (
          <div className="text-right text-xs md:text-[10px] flex-shrink-0" style={{ color: 'var(--foreground-muted)' }}>
            <div>{formatTokens(metrics.tokens)} tokens</div>
            <div>{formatTime(metrics.elapsed)}</div>
          </div>
        )}
      </div>

      <PipelineProgress status={pipelineStatus} />
    </div>
  );
}

// ===========================================
// Main Page
// ===========================================

const initialPipelineStatus: PipelineStatus = {
  input_triage: "pending",
  input_extract: "pending",
  identify: "pending",
  crm_check: "pending",
  research_basics: "pending",
  research_founders: "pending",
  research_funding: "pending",
  research_product: "pending",
  research_traction: "pending",
  research_market: "pending",
  research_competitive: "pending",
  research_news: "pending",
  synthesize: "pending",
  generate_memo: "pending",
  generate_infographic: "pending",
  save_crm: "pending",
};

export default function Home() {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [opportunities, setOpportunities] = useState<ProcessResult[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingCompany, setProcessingCompany] = useState("");
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>(initialPipelineStatus);
  const [liveMetrics, setLiveMetrics] = useState({ tokens: 0, elapsed: 0 });
  const [mounted, setMounted] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);

  const { resolvedTheme } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0); // Track drag enter/leave for nested elements

  // Handle hydration for theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // Panel resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = (e.clientX / window.innerWidth) * 100;
      // Constrain between 25% and 75%
      setLeftPanelWidth(Math.min(75, Math.max(25, newWidth)));
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // File handling callbacks
  const handleFilesAdded = useCallback((files: AttachedFile[]) => {
    setAttachments((prev) => [...prev, ...files]);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleClearAllFiles = useCallback(() => {
    setAttachments([]);
  }, []);

  // Drag and drop handlers for the entire chat panel
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDraggingOver(false);

      if (isProcessing) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      // Process files and create AttachedFile objects
      const newAttachments: AttachedFile[] = [];
      for (const file of files) {
        // Create preview for images
        let preview: string | undefined;
        if (file.type.startsWith("image/")) {
          preview = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
        }

        newAttachments.push({
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview,
        });
      }

      handleFilesAdded(newAttachments);
    },
    [isProcessing, handleFilesAdded]
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isProcessing) return;

    const userMessage = input.trim();
    const filesToUpload = [...attachments];

    // Clear input and attachments
    setInput("");
    setAttachments([]);
    setIsProcessing(true);
    setProcessingCompany(userMessage || `${filesToUpload.length} file(s)`);
    setPipelineStatus(initialPipelineStatus);
    setLiveMetrics({ tokens: 0, elapsed: 0 });

    // Add user message
    const messageContent = userMessage
      ? (filesToUpload.length > 0
          ? `${userMessage} (+ ${filesToUpload.length} file${filesToUpload.length > 1 ? 's' : ''})`
          : userMessage)
      : `Uploaded ${filesToUpload.length} file${filesToUpload.length > 1 ? 's' : ''}: ${filesToUpload.map(f => f.file.name).join(', ')}`;

    setMessages((prev) => [...prev, { role: "user", content: messageContent, timestamp: new Date() }]);

    // Scroll to show user message
    setTimeout(() => scrollToBottom(), 100);

    try {
      let response: Response;

      if (filesToUpload.length > 0) {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append("input", userMessage);
        for (const attachment of filesToUpload) {
          formData.append("files", attachment.file);
        }
        response = await fetch("/api/process", {
          method: "POST",
          body: formData,
        });
      } else {
        // Use JSON for text-only
        response = await fetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: userMessage }),
        });
      }

      if (!response.ok) {
        throw new Error("Failed to process request");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      // Buffer for incomplete SSE lines (large payloads like base64 images may span multiple chunks)
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append new data to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines (SSE format: "data: {...}\n\n")
        const lines = buffer.split("\n\n");

        // Keep the last incomplete chunk in the buffer
        buffer = lines.pop() || "";

        for (const chunk of lines) {
          const line = chunk.trim();
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "progress") {
                // Map stage to pipeline status
                const stageMap: Record<string, PipelineStep> = {
                  triaging: "input_triage",
                  triaged: "input_triage",
                  extracting: "input_extract",
                  extracted: "input_extract",
                  analyzing: "input_extract", // Legacy - File analysis maps to extract step
                  analyzed: "input_extract",
                  identifying: "identify",
                  checking: "crm_check",
                  researching: "research_basics", // Will be updated by research events
                  synthesizing: "synthesize",
                  generating: "generate_memo",
                  infographic: "generate_infographic",
                  infographic_done: "generate_infographic",
                  infographic_skip: "generate_infographic",
                  infographic_error: "generate_infographic",
                  saving: "save_crm",
                };
                const step = stageMap[event.stage];
                if (step) {
                  const isCompleted = ["triaged", "extracted", "analyzed"].includes(event.stage);
                  setPipelineStatus((prev) => ({
                    ...prev,
                    [step]: isCompleted ? "completed" : "in_progress",
                  }));
                }
                // Mark previous steps as completed based on stage
                if (event.stage === "triaged") {
                  setPipelineStatus((prev) => ({ ...prev, input_triage: "completed", input_extract: "in_progress" }));
                } else if (event.stage === "extracted" || event.stage === "analyzed") {
                  // Update processingCompany with extracted name
                  const match = event.message?.match(/Identified "([^"]+)"/);
                  if (match) {
                    setProcessingCompany(match[1]);
                  }
                  setPipelineStatus((prev) => ({ ...prev, input_triage: "completed", input_extract: "completed", identify: "in_progress" }));
                } else if (event.stage === "identifying") {
                  setPipelineStatus((prev) => ({
                    ...prev,
                    input_triage: prev.input_triage === "error" ? "error" : "completed",
                    input_extract: prev.input_extract === "error" ? "error" : "completed",
                    identify: "in_progress"
                  }));
                } else if (event.stage === "checking") {
                  setPipelineStatus((prev) => ({
                    ...prev,
                    input_triage: prev.input_triage === "error" ? "error" : "completed",
                    input_extract: prev.input_extract === "error" ? "error" : "completed",
                    identify: prev.identify === "error" ? "error" : "completed"
                  }));
                } else if (event.stage === "researching") {
                  setPipelineStatus((prev) => ({
                    ...prev,
                    input_triage: prev.input_triage === "error" ? "error" : "completed",
                    input_extract: prev.input_extract === "error" ? "error" : "completed",
                    identify: prev.identify === "error" ? "error" : "completed",
                    crm_check: prev.crm_check === "error" ? "error" : "completed"
                  }));
                } else if (event.stage === "synthesizing") {
                  // Only mark as completed if not already in error state
                  setPipelineStatus((prev) => ({
                    ...prev,
                    input_triage: prev.input_triage === "error" ? "error" : "completed",
                    input_extract: prev.input_extract === "error" ? "error" : "completed",
                    identify: prev.identify === "error" ? "error" : "completed",
                    crm_check: prev.crm_check === "error" ? "error" : "completed",
                    research_basics: prev.research_basics === "error" ? "error" : "completed",
                    research_founders: prev.research_founders === "error" ? "error" : "completed",
                    research_funding: prev.research_funding === "error" ? "error" : "completed",
                    research_product: prev.research_product === "error" ? "error" : "completed",
                    research_traction: prev.research_traction === "error" ? "error" : "completed",
                    research_market: prev.research_market === "error" ? "error" : "completed",
                    research_competitive: prev.research_competitive === "error" ? "error" : "completed",
                    research_news: prev.research_news === "error" ? "error" : "completed",
                    synthesize: "in_progress",
                  }));
                } else if (event.stage === "generating") {
                  setPipelineStatus((prev) => ({
                    ...prev,
                    synthesize: prev.synthesize === "error" ? "error" : "completed",
                    generate_memo: "in_progress"
                  }));
                } else if (event.stage === "infographic") {
                  setPipelineStatus((prev) => ({
                    ...prev,
                    generate_memo: prev.generate_memo === "error" ? "error" : "completed",
                    generate_infographic: "in_progress"
                  }));
                } else if (event.stage === "infographic_done") {
                  setPipelineStatus((prev) => ({ ...prev, generate_infographic: "completed" }));
                } else if (event.stage === "infographic_skip" || event.stage === "infographic_error") {
                  setPipelineStatus((prev) => ({ ...prev, generate_infographic: event.stage === "infographic_error" ? "error" : "completed" }));
                } else if (event.stage === "saving") {
                  setPipelineStatus((prev) => ({
                    ...prev,
                    generate_memo: prev.generate_memo === "error" ? "error" : "completed",
                    generate_infographic: prev.generate_infographic === "error" ? "error" : "completed",
                    save_crm: "in_progress"
                  }));
                } else if (event.stage === "complete") {
                  setPipelineStatus((prev) => ({
                    ...prev,
                    save_crm: prev.save_crm === "error" ? "error" : "completed"
                  }));
                }
              } else if (event.type === "research") {
                // Map research area to pipeline step
                const researchMap: Record<ResearchArea, PipelineStep> = {
                  basics: "research_basics",
                  founders: "research_founders",
                  funding: "research_funding",
                  product: "research_product",
                  traction: "research_traction",
                  market: "research_market",
                  competitive: "research_competitive",
                  news: "research_news",
                };
                const step = researchMap[event.area as ResearchArea];
                if (step) {
                  setPipelineStatus((prev) => ({
                    ...prev,
                    [step]: event.status,
                  }));
                }
              } else if (event.type === "metrics") {
                setLiveMetrics({
                  tokens: event.tokens || 0,
                  elapsed: event.elapsed || 0,
                });
              } else if (event.type === "result") {
                const result = event.data as ProcessResult;
                setOpportunities((prev) => [result, ...prev]);
                setExpandedId(result.id);
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content: `Research complete for ${result.company}. Score: ${result.memo.companyScorecard.overall.toFixed(1)}/10.0. ${result.memo.oneLiner}`,
                    timestamp: new Date(),
                  },
                ]);
              } else if (event.type === "error") {
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content: `Error: ${event.message}`,
                    timestamp: new Date(),
                  },
                ]);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessing(false);
      setProcessingCompany("");
    }
  };

  return (
    <main className="flex flex-col md:flex-row fixed inset-0 overflow-hidden" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Main Panel - Full width on mobile, resizable on desktop */}
      <div
        className="flex flex-col overflow-hidden flex-1 resizable-left-panel"
        style={{
          backgroundColor: 'var(--background)',
          borderColor: 'var(--border)',
          '--left-panel-width': `${leftPanelWidth}%`,
        } as React.CSSProperties}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drop Overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 border-2 border-dashed z-50 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'var(--info)' }}>
            <div className="rounded-xl p-6 md:p-8 text-center shadow-2xl mx-4" style={{ backgroundColor: 'var(--card)' }}>
              <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--score-blue-bg)' }}>
                <svg className="w-6 h-6 md:w-8 md:h-8" style={{ color: 'var(--info)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-base md:text-lg font-medium" style={{ color: 'var(--foreground)' }}>Drop files to analyze</p>
              <p className="text-xs md:text-sm mt-1" style={{ color: 'var(--foreground-muted)' }}>PDF, images, docs, audio, video...</p>
            </div>
          </div>
        )}

        {/* Hidden file input for click-to-browse */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;

            const newAttachments: AttachedFile[] = [];
            for (const file of files) {
              let preview: string | undefined;
              if (file.type.startsWith("image/")) {
                preview = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onload = (ev) => resolve(ev.target?.result as string);
                  reader.readAsDataURL(file);
                });
              }
              newAttachments.push({
                id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                file,
                preview,
              });
            }
            handleFilesAdded(newAttachments);
            e.target.value = ""; // Reset for re-selection
          }}
        />

        {/* Header */}
        <div className="px-4 py-3 md:py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
          <div>
            <div className="flex items-center gap-2">
              <img
                src="/app-icon.svg"
                alt="AI VC Associate"
                className="h-7 w-auto"
                style={{ filter: mounted && resolvedTheme === 'dark' ? 'invert(1)' : 'none' }}
              />
              <span className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>VC Associate</span>
            </div>
            <p className="hidden md:block text-sm mt-1" style={{ color: 'var(--foreground-muted)' }}>Your Gemini powered AI VC associate</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Messages + Inline Cards on Mobile */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4" style={{ minHeight: 0, WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {messages.length === 0 && !isProcessing && opportunities.length === 0 && (
            <div className="text-center py-6 md:py-12 px-3 md:px-4">
              <p className="text-sm md:text-base" style={{ color: 'var(--foreground-muted)' }}>Enter a company name or drop files to start</p>
              <p className="text-xs md:text-sm mt-1 md:mt-2" style={{ color: 'var(--foreground-secondary)' }}>
                Try: &quot;Anthropic&quot;, &quot;Mistral AI&quot;, or drop a pitch deck
              </p>
            </div>
          )}

          {/* Desktop: just messages */}
          <div className="hidden md:block space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[80%] rounded-lg px-4 py-2"
                  style={msg.role === "user"
                    ? { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }
                    : { backgroundColor: 'var(--card)', color: 'var(--foreground-secondary)' }
                  }
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className="text-xs opacity-50 mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: unified timeline - messages and cards interleaved chronologically */}
          <div className="md:hidden space-y-3">
            {(() => {
              // Create unified timeline items
              type TimelineItem =
                | { type: 'message'; data: Message; timestamp: Date }
                | { type: 'opportunity'; data: ProcessResult; timestamp: Date };

              const timeline: TimelineItem[] = [
                ...messages.map(msg => ({
                  type: 'message' as const,
                  data: msg,
                  timestamp: msg.timestamp
                })),
                ...opportunities.map(opp => ({
                  type: 'opportunity' as const,
                  data: opp,
                  timestamp: new Date(opp.createdAt)
                }))
              ];

              // Sort by timestamp (oldest first)
              timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

              return timeline.map((item, i) => {
                if (item.type === 'message') {
                  const msg = item.data;
                  return (
                    <div
                      key={`msg-${i}`}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className="max-w-[90%] rounded-lg px-3 py-2"
                        style={msg.role === "user"
                          ? { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }
                          : { backgroundColor: 'var(--card)', color: 'var(--foreground-secondary)' }
                        }
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className="text-xs opacity-50 mt-1">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                } else {
                  const opp = item.data;
                  return (
                    <OpportunityCard
                      key={opp.id}
                      result={opp}
                      expanded={expandedId === opp.id}
                      onToggle={() => setExpandedId(expandedId === opp.id ? null : opp.id)}
                    />
                  );
                }
              });
            })()}
          </div>

          {/* Processing Card - shows at the end while processing */}
          {isProcessing && processingCompany && (
            <div className="md:hidden">
              <ProcessingCard
                company={processingCompany}
                pipelineStatus={pipelineStatus}
                metrics={liveMetrics}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 md:py-4 border-t space-y-3 flex-shrink-0" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
          {/* Attachment List */}
          {attachments.length > 0 && (
            <AttachmentList
              files={attachments}
              onRemove={handleRemoveFile}
              onClearAll={handleClearAllFiles}
              previewSize="sm"
            />
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            {/* Attachment Button (click to browse) - Larger touch target on mobile */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="p-3.5 md:p-2 rounded-lg transition-colors disabled:opacity-50 touch-manipulation"
              style={{ backgroundColor: 'var(--card)', color: 'var(--foreground-muted)' }}
              title="Attach files"
            >
              <svg className="w-6 h-6 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={attachments.length > 0 ? "Add context..." : "Company name or files..."}
              disabled={isProcessing}
              className="flex-1 border rounded-lg px-4 md:px-4 py-3 md:py-2 focus:outline-none focus:border-blue-500 disabled:opacity-50 text-base md:text-sm"
              style={{
                backgroundColor: 'var(--background-secondary)',
                borderColor: 'var(--border-strong)',
                color: 'var(--foreground)'
              }}
            />

            {/* Submit Button - Larger touch target on mobile */}
            <button
              type="submit"
              disabled={isProcessing || (!input.trim() && attachments.length === 0)}
              className="px-5 md:px-4 py-3 md:py-2 rounded-lg font-medium transition-colors touch-manipulation disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              {isProcessing ? (
                <span className="flex items-center gap-1">
                  <span className="animate-spin text-lg md:text-base">○</span>
                  <span className="hidden md:inline">...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <svg className="w-6 h-6 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="hidden md:inline">Research</span>
                </span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Resize Handle (Desktop only) */}
      <div
        className="hidden md:flex w-1 cursor-col-resize items-center justify-center hover:bg-blue-500/20 transition-colors group"
        style={{ backgroundColor: isResizing ? 'var(--primary)' : 'var(--border)' }}
        onMouseDown={handleResizeStart}
      >
        <div
          className="w-0.5 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: 'var(--primary)' }}
        />
      </div>

      {/* Right Panel - Opportunities (Desktop only - mobile shows inline in chat) */}
      <div
        className="hidden md:flex flex-col overflow-hidden flex-1"
        style={{ backgroundColor: 'var(--background-secondary)' }}
      >
        {/* Header - matches left panel */}
        <div className="px-4 py-3 md:py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 h-7">
            <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Opportunities</h2>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--foreground-muted)' }}>{opportunities.length} researched</p>
        </div>

        {/* Opportunities List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0, WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
          {/* Processing Card */}
          {isProcessing && processingCompany && (
            <ProcessingCard
              company={processingCompany}
              pipelineStatus={pipelineStatus}
              metrics={liveMetrics}
            />
          )}

          {/* Completed Opportunities */}
          {opportunities.map((opp) => (
            <OpportunityCard
              key={opp.id}
              result={opp}
              expanded={expandedId === opp.id}
              onToggle={() => setExpandedId(expandedId === opp.id ? null : opp.id)}
            />
          ))}

          {!isProcessing && opportunities.length === 0 && (
            <div className="text-center py-12">
              <p style={{ color: 'var(--foreground-muted)' }}>No opportunities yet</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
