"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { CompanyResearch, InvestmentMemo, StrategicFitAnalysis, FundFit, AttachmentReference } from "@/src/types/schemas";
import { AttachmentList, type AttachedFile } from "@/components/upload";
import { getClassificationLabel, getClassificationIcon } from "@/src/lib/multimodal";

// ===========================================
// Types
// ===========================================

type TaskStatus = "pending" | "in_progress" | "completed" | "error";

type PipelineStep =
  | "identify"
  | "crm_check"
  | "research_basics"
  | "research_founders"
  | "research_funding"
  | "research_product"
  | "research_competitive"
  | "research_news"
  | "synthesize"
  | "generate_memo"
  | "save_crm";

interface PipelineStatus {
  identify: TaskStatus;
  crm_check: TaskStatus;
  research_basics: TaskStatus;
  research_founders: TaskStatus;
  research_funding: TaskStatus;
  research_product: TaskStatus;
  research_competitive: TaskStatus;
  research_news: TaskStatus;
  synthesize: TaskStatus;
  generate_memo: TaskStatus;
  save_crm: TaskStatus;
}

// Keep old type for backward compatibility with API
type ResearchArea = "basics" | "founders" | "funding" | "product" | "competitive" | "news";

interface ProcessResult {
  id: string;
  company: string;
  research: CompanyResearch;
  memo: InvestmentMemo;
  crmRecordId: string;
  createdAt: string;
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
  const steps: { key: PipelineStep; label: string; group: string }[] = [
    { key: "identify", label: "Identify Company", group: "setup" },
    { key: "crm_check", label: "Check CRM", group: "setup" },
    { key: "research_basics", label: "Company Info", group: "research" },
    { key: "research_founders", label: "Founders", group: "research" },
    { key: "research_funding", label: "Funding", group: "research" },
    { key: "research_product", label: "Product", group: "research" },
    { key: "research_competitive", label: "Competition", group: "research" },
    { key: "research_news", label: "News", group: "research" },
    { key: "synthesize", label: "Synthesize Data", group: "generate" },
    { key: "generate_memo", label: "Generate Memo", group: "generate" },
    { key: "save_crm", label: "Save to CRM", group: "save" },
  ];

  const statusIcon = (s: TaskStatus) => {
    switch (s) {
      case "completed":
        return <span className="text-green-500">✓</span>;
      case "in_progress":
        return <span className="animate-spin inline-block">○</span>;
      case "error":
        return <span className="text-red-500">✗</span>;
      default:
        return <span className="text-zinc-600">○</span>;
    }
  };

  const setupSteps = steps.filter((s) => s.group === "setup");
  const researchSteps = steps.filter((s) => s.group === "research");
  const generateSteps = steps.filter((s) => s.group === "generate");
  const saveSteps = steps.filter((s) => s.group === "save");

  return (
    <div className="space-y-3">
      {/* Setup */}
      <div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Setup</div>
        <div className="flex gap-3">
          {setupSteps.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              {statusIcon(status[key])}
              <span className={status[key] === "completed" ? "text-zinc-300" : "text-zinc-500"}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Research */}
      <div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Research</div>
        <div className="grid grid-cols-3 gap-2">
          {researchSteps.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              {statusIcon(status[key])}
              <span className={status[key] === "completed" ? "text-zinc-300" : "text-zinc-500"}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Generate */}
      <div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Generate</div>
        <div className="flex gap-3">
          {generateSteps.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              {statusIcon(status[key])}
              <span className={status[key] === "completed" ? "text-zinc-300" : "text-zinc-500"}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Save</div>
        <div className="flex gap-3">
          {saveSteps.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              {statusIcon(status[key])}
              <span className={status[key] === "completed" ? "text-zinc-300" : "text-zinc-500"}>
                {label}
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

  const getColor = (score: number) => {
    if (score >= 8) return "bg-green-500";
    if (score >= 6) return "bg-yellow-500";
    if (score >= 4) return "bg-orange-500";
    return "bg-red-500";
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (score >= 6) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    if (score >= 4) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  return (
    <div className="space-y-4">
      {/* Score Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border ${getScoreColor(
              scores.overall
            )}`}
          >
            {scores.overall.toFixed(1)}
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-200">Company Score</div>
            <div className="text-xs text-zinc-500">out of 10.0</div>
          </div>
        </div>
      </div>

      {/* Score Bars */}
      <div className="space-y-2">
        {items.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 w-20">{label}</span>
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${getColor(scores[key])} transition-all duration-500`}
                style={{ width: `${scores[key] * 10}%` }}
              />
            </div>
            <span className="text-xs text-zinc-300 w-8">{scores[key].toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FundFitCard({ fundFit }: { fundFit: FundFit }) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (score >= 6) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (score >= 4) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const getFitBadgeColor = (fit: string) => {
    switch (fit) {
      case "perfect":
      case "core":
      case "target":
      case "ideal":
        return "bg-green-500/20 text-green-400";
      case "good":
      case "adjacent":
      case "acceptable":
      case "stretch":
        return "bg-blue-500/20 text-blue-400";
      case "exploratory":
      case "challenging":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-red-500/20 text-red-400";
    }
  };

  return (
    <div className="space-y-4">
      {/* Score Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border ${getScoreColor(
              fundFit.score
            )}`}
          >
            {fundFit.score.toFixed(1)}
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-200">Fund Fit Score</div>
            <div className="text-xs text-zinc-500">out of 10.0</div>
          </div>
        </div>
      </div>

      {/* Fit Dimensions */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2">
          <span className="text-xs text-zinc-400">Stage</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${getFitBadgeColor(fundFit.stage)}`}>
            {fundFit.stage}
          </span>
        </div>
        <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2">
          <span className="text-xs text-zinc-400">Sector</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${getFitBadgeColor(fundFit.sector)}`}>
            {fundFit.sector}
          </span>
        </div>
        <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2">
          <span className="text-xs text-zinc-400">Geography</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${getFitBadgeColor(fundFit.geography)}`}>
            {fundFit.geography}
          </span>
        </div>
        <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2">
          <span className="text-xs text-zinc-400">Check Size</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${getFitBadgeColor(fundFit.checkSize)}`}>
            {fundFit.checkSize.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Aligned Theses */}
      {fundFit.alignedTheses.length > 0 && (
        <div>
          <h5 className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Aligned Theses</h5>
          <div className="flex flex-wrap gap-1">
            {fundFit.alignedTheses.map((thesis) => (
              <span
                key={thesis}
                className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-full"
              >
                {thesis}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rationale */}
      <div>
        <h5 className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Rationale</h5>
        <p className="text-xs text-zinc-400">{fundFit.rationale}</p>
      </div>

      {/* Concerns */}
      {fundFit.concerns.length > 0 && (
        <div>
          <h5 className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Concerns</h5>
          <ul className="space-y-1">
            {fundFit.concerns.map((concern, i) => (
              <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                <span className="text-yellow-400">!</span>
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
  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    if (score >= 6) return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    if (score >= 4) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  };

  const getFitLevelColor = (level: string) => {
    switch (level) {
      case "excellent":
        return "bg-green-500/20 text-green-400";
      case "good":
        return "bg-blue-500/20 text-blue-400";
      case "moderate":
        return "bg-yellow-500/20 text-yellow-400";
      default:
        return "bg-zinc-500/20 text-zinc-400";
    }
  };

  const getMatchColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-green-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-orange-500";
      default:
        return "bg-zinc-600";
    }
  };

  return (
    <div className="space-y-4">
      {/* Score Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border ${getScoreColor(
              strategicFit.overallFitScore
            )}`}
          >
            {strategicFit.overallFitScore.toFixed(1)}
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-200">Partner Fit Score</div>
            <div className="text-xs text-zinc-500">out of 10.0</div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFitLevelColor(
              strategicFit.overallFitLevel
            )}`}
          >
            {strategicFit.overallFitLevel.charAt(0).toUpperCase() +
              strategicFit.overallFitLevel.slice(1)}
          </span>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">
          {strategicFit.primaryCategory}
        </span>
        {strategicFit.secondaryCategories.slice(0, 3).map((cat) => (
          <span
            key={cat}
            className="text-xs px-2 py-1 bg-zinc-700 text-zinc-300 rounded-full"
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Partner Matches */}
      <div className="space-y-3">
        <h5 className="text-xs text-zinc-500 uppercase tracking-wide">Partner Matches</h5>
        {strategicFit.partnerMatches.map((match) => (
          <div
            key={match.partnerName}
            className="bg-zinc-800/50 rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-200">
                {match.partnerName}
              </span>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${getMatchColor(match.matchLevel)}`}
                />
                <span className="text-xs text-zinc-400">
                  {match.matchLevel} ({match.matchScore.toFixed(1)})
                </span>
              </div>
            </div>
            {match.matchLevel !== "none" && (
              <>
                <p className="text-xs text-zinc-400">{match.rationale}</p>
                {match.matchedInterests.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {match.matchedInterests.slice(0, 4).map((interest) => (
                      <span
                        key={interest}
                        className="text-xs px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded"
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
          <h5 className="text-xs text-zinc-500 uppercase tracking-wide">
            Top Partner Opportunities
          </h5>
          <ul className="space-y-1">
            {strategicFit.topPartnerOpportunities.map((opp, i) => (
              <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                <span className="text-green-400">&#x2022;</span>
                {opp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strategic Narrative */}
      <div className="pt-2 border-t border-zinc-700">
        <p className="text-xs text-zinc-500 italic">{strategicFit.strategicNarrative}</p>
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
    if (usedIn.length >= 5) return "text-green-400";
    if (usedIn.length >= 3) return "text-blue-400";
    if (usedIn.length >= 1) return "text-yellow-400";
    return "text-zinc-500";
  };

  return (
    <div className="space-y-3">
      {/* Used Files */}
      {usedAttachments.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs text-zinc-500 uppercase tracking-wide">
            Files Used in Research ({usedAttachments.length})
          </h5>
          {usedAttachments.map((attachment) => (
            <div
              key={attachment.fileId}
              className="bg-zinc-800/50 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg flex-shrink-0">
                    {getClassificationIcon(attachment.classification)}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zinc-200 truncate">
                      {attachment.filename}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {getClassificationLabel(attachment.classification)}
                    </div>
                  </div>
                </div>
                <span className={`text-xs flex-shrink-0 ${getUsageColor(attachment.usedIn)}`}>
                  {attachment.usedIn.length} area{attachment.usedIn.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-zinc-400">{attachment.summary}</p>
              {attachment.usedIn.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {attachment.usedIn.map((area) => (
                    <span
                      key={area}
                      className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded"
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
        <div className="space-y-2">
          <h5 className="text-xs text-zinc-500 uppercase tracking-wide">
            Files Not Used ({notUsedAttachments.length})
          </h5>
          {notUsedAttachments.map((attachment) => (
            <div
              key={attachment.fileId}
              className="bg-zinc-800/30 rounded-lg p-3 opacity-60"
            >
              <div className="flex items-start gap-2">
                <span className="text-lg flex-shrink-0">
                  {getClassificationIcon(attachment.classification)}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-400 truncate">
                    {attachment.filename}
                  </div>
                  <div className="text-xs text-zinc-600">
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

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{research.company.name}</h3>
              <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded-full text-zinc-400">
                {research.company.stage}
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">{memo.oneLiner}</p>
          </div>
          {/* 3 Score Indicators */}
          <div className="flex items-center gap-3">
            {/* Company Score */}
            <div className="text-center">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold ${
                  memo.companyScorecard.overall >= 8
                    ? "bg-green-500/20 text-green-400"
                    : memo.companyScorecard.overall >= 6
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {memo.companyScorecard.overall.toFixed(1)}
              </div>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Company</span>
            </div>
            {/* Fund Fit Score */}
            <div className="text-center">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold ${
                  memo.fundFit.score >= 8
                    ? "bg-blue-500/20 text-blue-400"
                    : memo.fundFit.score >= 6
                    ? "bg-blue-500/20 text-blue-300"
                    : memo.fundFit.score >= 4
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {memo.fundFit.score.toFixed(1)}
              </div>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Fund Fit</span>
            </div>
            {/* Partner Fit Score */}
            <div className="text-center">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold ${
                  memo.partnerFit.overallFitScore >= 8
                    ? "bg-purple-500/20 text-purple-400"
                    : memo.partnerFit.overallFitScore >= 6
                    ? "bg-purple-500/20 text-purple-300"
                    : memo.partnerFit.overallFitScore >= 4
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-zinc-500/20 text-zinc-400"
                }`}
              >
                {memo.partnerFit.overallFitScore.toFixed(1)}
              </div>
              <span className="text-[10px] text-zinc-500 mt-0.5 block">Partners</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-3">
          {memo.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Quick Links */}
        <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
          {research.company.website && (
            <a
              href={research.company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors"
            >
              Website
            </a>
          )}
          <button className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors">
            View in Attio
          </button>
          <button className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors">
            Full Memo
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-zinc-800 p-4 space-y-4">
          {/* Company Scorecard */}
          <div>
            <h4 className="text-sm font-medium text-zinc-300 mb-3">Company Scorecard</h4>
            <CompanyScorecard scores={memo.companyScorecard} />
          </div>

          {/* Fund Fit */}
          <div>
            <h4 className="text-sm font-medium text-zinc-300 mb-3">Fund Fit</h4>
            <FundFitCard fundFit={memo.fundFit} />
          </div>

          {/* Key Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Industry</h4>
              <p className="text-sm text-zinc-300">{research.company.industry}</p>
            </div>
            <div>
              <h4 className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Funding</h4>
              <p className="text-sm text-zinc-300">{research.funding.totalRaised}</p>
            </div>
            <div>
              <h4 className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Location</h4>
              <p className="text-sm text-zinc-300">{research.company.location || "Unknown"}</p>
            </div>
            <div>
              <h4 className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Investors</h4>
              <p className="text-sm text-zinc-300">
                {research.funding.investors.slice(0, 3).join(", ")}
              </p>
            </div>
          </div>

          {/* Founders */}
          <div>
            <h4 className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Founders</h4>
            <div className="space-y-2">
              {research.founders.slice(0, 3).map((founder, i) => (
                <div key={i} className="text-sm">
                  <span className="text-zinc-300 font-medium">{founder.name}</span>
                  <span className="text-zinc-500"> - {founder.role}</span>
                  <p className="text-zinc-500 text-xs mt-0.5">{founder.background}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div>
            <h4 className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Summary</h4>
            <p className="text-sm text-zinc-400">{memo.summary}</p>
          </div>

          {/* Risks */}
          <div>
            <h4 className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Risks</h4>
            <p className="text-sm text-zinc-400">{memo.sections.risksAndFlaws}</p>
          </div>

          {/* Strategic Partner Fit */}
          {memo.partnerFit && (
            <div>
              <h4 className="text-sm font-medium text-zinc-300 mb-3">Strategic Partner Fit</h4>
              <StrategicFitCard strategicFit={memo.partnerFit} />
            </div>
          )}

          {/* Attachment References */}
          {memo.attachmentReferences && memo.attachmentReferences.length > 0 && (
            <div className="pt-4 border-t border-zinc-700">
              <h4 className="text-sm font-medium text-zinc-300 mb-3">Analyzed Files</h4>
              <AttachmentReferencesCard attachments={memo.attachmentReferences} />
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function ProcessingCard({
  company,
  pipelineStatus,
}: {
  company: string;
  pipelineStatus: PipelineStatus;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
          <span className="animate-spin text-blue-400">○</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{company}</h3>
          <p className="text-xs text-zinc-500">Processing...</p>
        </div>
      </div>

      <PipelineProgress status={pipelineStatus} />
    </div>
  );
}

// ===========================================
// Main Page
// ===========================================

const initialPipelineStatus: PipelineStatus = {
  identify: "pending",
  crm_check: "pending",
  research_basics: "pending",
  research_founders: "pending",
  research_funding: "pending",
  research_product: "pending",
  research_competitive: "pending",
  research_news: "pending",
  synthesize: "pending",
  generate_memo: "pending",
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0); // Track drag enter/leave for nested elements

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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    // Add user message
    const messageContent = userMessage
      ? (filesToUpload.length > 0
          ? `${userMessage} (+ ${filesToUpload.length} file${filesToUpload.length > 1 ? 's' : ''})`
          : userMessage)
      : `Uploaded ${filesToUpload.length} file${filesToUpload.length > 1 ? 's' : ''}: ${filesToUpload.map(f => f.file.name).join(', ')}`;

    setMessages((prev) => [...prev, { role: "user", content: messageContent, timestamp: new Date() }]);

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === "progress") {
                // Map stage to pipeline status
                const stageMap: Record<string, PipelineStep> = {
                  triaging: "identify", // File triage maps to identify step
                  triaged: "identify",
                  analyzing: "identify", // Legacy - File analysis maps to identify step
                  analyzed: "identify",
                  identifying: "identify",
                  checking: "crm_check",
                  researching: "research_basics", // Will be updated by research events
                  synthesizing: "synthesize",
                  generating: "generate_memo",
                  saving: "save_crm",
                };
                const step = stageMap[event.stage];
                if (step) {
                  setPipelineStatus((prev) => ({
                    ...prev,
                    [step]: event.stage === "triaged" || event.stage === "analyzed" ? "completed" : "in_progress",
                  }));
                }
                // Mark previous steps as completed based on stage
                if (event.stage === "triaged" || event.stage === "analyzed") {
                  // Update processingCompany with extracted name
                  const match = event.message?.match(/Identified "([^"]+)"/);
                  if (match) {
                    setProcessingCompany(match[1]);
                  }
                } else if (event.stage === "checking") {
                  setPipelineStatus((prev) => ({ ...prev, identify: "completed" }));
                } else if (event.stage === "researching") {
                  setPipelineStatus((prev) => ({ ...prev, identify: "completed", crm_check: "completed" }));
                } else if (event.stage === "synthesizing") {
                  setPipelineStatus((prev) => ({
                    ...prev,
                    identify: "completed",
                    crm_check: "completed",
                    research_basics: "completed",
                    research_founders: "completed",
                    research_funding: "completed",
                    research_product: "completed",
                    research_competitive: "completed",
                    research_news: "completed",
                    synthesize: "in_progress",
                  }));
                } else if (event.stage === "generating") {
                  setPipelineStatus((prev) => ({ ...prev, synthesize: "completed", generate_memo: "in_progress" }));
                } else if (event.stage === "saving") {
                  setPipelineStatus((prev) => ({ ...prev, generate_memo: "completed", save_crm: "in_progress" }));
                } else if (event.stage === "complete") {
                  setPipelineStatus((prev) => ({ ...prev, save_crm: "completed" }));
                }
              } else if (event.type === "research") {
                // Map research area to pipeline step
                const researchMap: Record<ResearchArea, PipelineStep> = {
                  basics: "research_basics",
                  founders: "research_founders",
                  funding: "research_funding",
                  product: "research_product",
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
    <main className="flex h-screen">
      {/* Left Panel - Chat (Drop Zone) */}
      <div
        className="w-1/2 border-r border-zinc-800 flex flex-col relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drop Overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-zinc-900/90 rounded-xl p-8 text-center shadow-2xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-lg font-medium text-white">Drop files to analyze</p>
              <p className="text-sm text-zinc-400 mt-1">PDF, images, docs, audio, video...</p>
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
        <div className="p-4 border-b border-zinc-800">
          <h1 className="text-xl font-bold">VC Associate</h1>
          <p className="text-sm text-zinc-500">AI-powered investment research</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-zinc-500">Enter a company name or drop files to start</p>
              <p className="text-zinc-600 text-sm mt-2">
                Try: &quot;Anthropic&quot;, &quot;Mistral AI&quot;, or drop a pitch deck
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-300"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs opacity-50 mt-1">
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-zinc-800 space-y-3">
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
            {/* Attachment Button (click to browse) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="p-2 rounded-lg transition-colors bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300 disabled:opacity-50"
              title="Attach files"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={attachments.length > 0 ? "Add context (optional)..." : "Enter company name or drop files..."}
              disabled={isProcessing}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing || (!input.trim() && attachments.length === 0)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg text-white font-medium transition-colors"
            >
              {isProcessing ? "Processing..." : "Research"}
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel - Opportunities */}
      <div className="w-1/2 flex flex-col bg-zinc-950">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold">Opportunities</h2>
          <p className="text-sm text-zinc-500">{opportunities.length} researched</p>
        </div>

        {/* Opportunities List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Processing Card */}
          {isProcessing && processingCompany && (
            <ProcessingCard
              company={processingCompany}
              pipelineStatus={pipelineStatus}
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
              <p className="text-zinc-600">No opportunities yet</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
