/**
 * Process API Route
 *
 * Handles the full VC research pipeline with streaming progress updates.
 * Supports both text-only and multi-modal (text + files) input.
 * Uses Server-Sent Events (SSE) to stream progress to the client.
 *
 * Attio Flow:
 * 1. Research always runs fresh (company existing or not)
 * 2. Upsert company record in Attio
 * 3. Create Investment Opportunity linked to company
 * 4. Attach memo as note to the opportunity
 */

import { NextRequest } from "next/server";
import {
  runParallelResearch,
  synthesizeResearch,
  generateInvestmentMemo,
  generateInfographic,
  type ResearchArea,
  type FileContext,
} from "@/src/lib/research";
import {
  triageFiles,
  buildResearchContext,
  buildAttachmentReferences,
  type FileAttachment,
} from "@/src/lib/multimodal";
import type {
  CompanyResearch,
  InvestmentMemo,
  FileTriageResult,
  AttachmentReference,
} from "@/src/types/schemas";
import {
  isAttioConfigured,
  upsertCompany,
  createInvestmentOpportunity,
  attachOpportunityNote,
} from "@/src/integrations/attio";

// ===========================================
// Types
// ===========================================

interface ProgressEvent {
  type: "progress" | "research" | "result" | "error" | "metrics";
  stage?: string;
  area?: ResearchArea;
  status?: string;
  message?: string;
  data?: unknown;
  // Metrics fields
  tokens?: number;
  elapsed?: number;
}

interface ProcessResult {
  id: string;
  company: string;
  research: CompanyResearch;
  memo: InvestmentMemo;
  opportunityRecordId: string;
  opportunityWebUrl?: string;
  companyRecordId?: string;
  createdAt: string;
  triageResult?: FileTriageResult;
  // Metrics
  totalTokens?: number;
  totalTimeMs?: number;
}

// ===========================================
// SSE Helper
// ===========================================

function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  const send = (event: ProgressEvent) => {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    controller.enqueue(encoder.encode(data));
  };

  const close = () => {
    controller.close();
  };

  return { stream, send, close };
}

// ===========================================
// CRM Operations (Attio with fallback to mock)
// ===========================================

interface AttioIntegrationResult {
  companyRecordId: string;
  opportunityRecordId: string;
  opportunityWebUrl?: string;
}

async function saveToAttio(
  companyName: string,
  research: CompanyResearch,
  memo: InvestmentMemo,
  send: (event: ProgressEvent) => void
): Promise<AttioIntegrationResult> {
  if (!isAttioConfigured()) {
    // Fallback to mock when Attio is not configured
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      companyRecordId: `mock-company-${Date.now()}`,
      opportunityRecordId: `mock-opp-${Date.now()}`,
    };
  }

  try {
    // Step 1: Upsert company
    send({ type: "progress", stage: "saving_company", message: "Creating/updating company in Attio..." });
    const companyResult = await upsertCompany(research);

    const companyAction = companyResult.isNew ? "Created" : "Updated";
    send({
      type: "progress",
      stage: "company_saved",
      message: `${companyAction} company: ${companyName}`
    });

    // Step 2: Create Investment Opportunity
    send({ type: "progress", stage: "creating_opportunity", message: "Creating Investment Opportunity..." });
    const opportunityResult = await createInvestmentOpportunity(
      companyResult.recordId,
      companyName,
      memo,
      research
    );

    send({
      type: "progress",
      stage: "opportunity_created",
      message: "Investment Opportunity created"
    });

    // Step 3: Attach memo as note
    send({ type: "progress", stage: "attaching_memo", message: "Attaching investment memo..." });
    await attachOpportunityNote(opportunityResult.recordId, memo);

    send({
      type: "progress",
      stage: "memo_attached",
      message: "Investment memo attached"
    });

    return {
      companyRecordId: companyResult.recordId,
      opportunityRecordId: opportunityResult.recordId,
      opportunityWebUrl: opportunityResult.webUrl,
    };
  } catch (error) {
    console.error("Attio integration failed:", error);
    // Fallback to mock on error
    send({
      type: "progress",
      stage: "crm_warning",
      message: `CRM save failed: ${error instanceof Error ? error.message : "Unknown error"}. Data saved locally.`
    });
    return {
      companyRecordId: `mock-company-${Date.now()}`,
      opportunityRecordId: `mock-opp-${Date.now()}`,
    };
  }
}

// ===========================================
// File Size Validation
// ===========================================

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB per file
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total

function validateFileSize(size: number, filename: string): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`File "${filename}" exceeds 20MB limit`);
  }
}

// ===========================================
// Pipeline
// ===========================================

async function runPipeline(
  textInput: string,
  files: FileAttachment[],
  send: (event: ProgressEvent) => void
): Promise<ProcessResult> {
  const startTime = Date.now();
  let totalTokens = 0;
  let companyName = textInput.trim();
  let triageResult: FileTriageResult | undefined;
  let fileContext: FileContext | undefined;
  let attachmentReferences: AttachmentReference[] | undefined;

  // Helper to send metrics update
  const sendMetrics = () => {
    send({
      type: "metrics",
      tokens: totalTokens,
      elapsed: Date.now() - startTime,
    });
  };

  // Stage 0: Triage files if present
  if (files.length > 0) {
    send({ type: "progress", stage: "triaging", message: `Analyzing ${files.length} file(s)...` });

    try {
      triageResult = await triageFiles(files, textInput || undefined);
      companyName = triageResult.companyName;
      fileContext = buildResearchContext(triageResult);
      attachmentReferences = buildAttachmentReferences(triageResult);

      // Count how many files are being used
      const usedFiles = triageResult.files.filter(
        (f) => f.classification !== "irrelevant" && f.classification !== "reference_only"
      ).length;

      send({
        type: "progress",
        stage: "triaged",
        message: `Identified "${companyName}" - using ${usedFiles}/${files.length} file(s) for research (confidence: ${(triageResult.overallConfidence * 100).toFixed(0)}%)`,
      });
    } catch (error) {
      send({
        type: "progress",
        stage: "triage_warning",
        message: `Could not analyze files: ${error instanceof Error ? error.message : "Unknown error"}. Proceeding with text input only.`,
      });
    }
  }

  // Validate we have a company name
  if (!companyName) {
    throw new Error("Could not determine company name. Please provide a company name or upload files with company information.");
  }

  // Stage 1: Identify company
  send({ type: "progress", stage: "identifying", message: `Researching: ${companyName}` });

  // Stage 2: Parallel research with targeted file context
  // Note: We always research fresh - even if company exists in CRM
  send({ type: "progress", stage: "researching", message: "Starting parallel research..." });
  sendMetrics();

  const research = await runParallelResearch(
    companyName,
    (area, status, tokens) => {
      if (tokens) {
        totalTokens += tokens;
      }
      send({ type: "research", area, status, tokens });
      sendMetrics();
    },
    fileContext // Pass targeted context to each research area
  );

  // Add research tokens to total (in case some were missed)
  if (research.totalUsage) {
    // Reset and use the accurate total from research
    totalTokens = research.totalUsage.totalTokens;
  }
  sendMetrics();

  // Stage 3: Synthesize research
  send({ type: "progress", stage: "synthesizing", message: "Synthesizing research..." });
  sendMetrics();
  const structuredResearch = await synthesizeResearch(companyName, research);
  sendMetrics();

  // Stage 4: Generate memo (with raw research for detailed sections and citations)
  send({ type: "progress", stage: "generating", message: "Generating investment memo..." });
  sendMetrics();
  const memo = await generateInvestmentMemo(companyName, structuredResearch, research);
  sendMetrics();

  // Add attachment references to memo if files were processed
  if (attachmentReferences && attachmentReferences.length > 0) {
    memo.attachmentReferences = attachmentReferences;
  }

  // Stage 5: Generate infographic
  send({ type: "progress", stage: "infographic", message: "Generating infographic..." });
  sendMetrics();
  try {
    const infographicBase64 = await generateInfographic(companyName, structuredResearch, memo);
    if (infographicBase64) {
      memo.infographicBase64 = infographicBase64;
      send({ type: "progress", stage: "infographic_done", message: "Infographic generated" });
    } else {
      send({ type: "progress", stage: "infographic_skip", message: "Infographic generation skipped" });
    }
  } catch (error) {
    console.error("Infographic generation failed:", error);
    send({ type: "progress", stage: "infographic_error", message: "Infographic generation failed" });
  }
  sendMetrics();

  // Stage 6: Save to Attio CRM
  // Flow: Upsert Company → Create Investment Opportunity → Attach Memo Note
  send({ type: "progress", stage: "saving", message: "Saving to CRM..." });
  sendMetrics();
  const attioResult = await saveToAttio(companyName, structuredResearch, memo, send);

  const duration = Date.now() - startTime;
  const crmMessage = attioResult.opportunityWebUrl
    ? `Complete in ${(duration / 1000).toFixed(1)}s - [View in Attio](${attioResult.opportunityWebUrl})`
    : `Complete in ${(duration / 1000).toFixed(1)}s`;
  send({ type: "progress", stage: "complete", message: crmMessage });
  sendMetrics();

  return {
    id: `opp-${Date.now()}`,
    company: companyName,
    research: structuredResearch,
    memo,
    opportunityRecordId: attioResult.opportunityRecordId,
    opportunityWebUrl: attioResult.opportunityWebUrl,
    companyRecordId: attioResult.companyRecordId,
    createdAt: new Date().toISOString(),
    triageResult,
    totalTokens,
    totalTimeMs: duration,
  };
}

// ===========================================
// Route Handler
// ===========================================

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let textInput = "";
    let files: FileAttachment[] = [];

    // Handle multipart/form-data (files + text)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      // Get text input
      const inputField = formData.get("input");
      if (inputField && typeof inputField === "string") {
        textInput = inputField;
      }

      // Get files
      let totalSize = 0;
      const fileEntries = formData.getAll("files");

      let fileIndex = 0;
      for (const entry of fileEntries) {
        if (entry instanceof File) {
          validateFileSize(entry.size, entry.name);
          totalSize += entry.size;

          if (totalSize > MAX_TOTAL_SIZE) {
            throw new Error("Total file size exceeds 50MB limit");
          }

          const arrayBuffer = await entry.arrayBuffer();
          files.push({
            id: `file-${fileIndex++}-${Date.now()}`,
            buffer: Buffer.from(arrayBuffer),
            mimeType: entry.type || "application/octet-stream",
            filename: entry.name,
          });
        }
      }
    }
    // Handle JSON (text only - backward compatible)
    else {
      const body = await request.json();
      textInput = body.input || "";
    }

    // Validate input
    if (!textInput && files.length === 0) {
      return new Response(JSON.stringify({ error: "Input or files required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { stream, send, close } = createSSEStream();

    // Run pipeline in background
    (async () => {
      try {
        const result = await runPipeline(textInput, files, send);
        send({ type: "result", data: result });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        close();
      }
    })();

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
