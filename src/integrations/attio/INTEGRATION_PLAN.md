# Attio Integration Plan

## Workspace Schema

### Objects

| Object | Slug | Purpose |
|--------|------|---------|
| **Investment Opportunity** | `investment_opportunities` | Core entity for our app - represents a researched opportunity |
| Company | `companies` | Company records (linked from opportunities) |
| Person | `people` | People records (founders, contacts) |
| Fund | `funds` | Fund records |

### Investment Opportunity Attributes

| Attribute | Slug | Type | Our Usage |
|-----------|------|------|-----------|
| Display Name | `display_name` | text | Company name + date |
| Company | `company` | record-reference | Link to company record |
| Fund | `fund_5` | record-reference | Optional |
| Round | `round` | text | From research (e.g., "Series A") |
| Status | `status` | status | Pipeline stage |
| Tags | `tags` | select (multiselect) | From memo tags |
| Valuation | `valuation` | currency | From research if available |
| Check Size | `check_size` | currency | From fund fit analysis |

### Company Attributes (for upsert)

| Attribute | Slug | Type | Our Usage |
|-----------|------|------|-----------|
| Name | `name` | text | Company name |
| Domains | `domains` | domain | Website domain |
| Description | `description` | text | One-liner from memo |
| Brief | `brief` | text | Summary from memo |
| Categories | `categories` | select (multiselect) | Industry/sector |
| Estimated Stage | `estimated_stage` | select | Company stage |
| Primary Location | `primary_location` | location | HQ location |

---

## Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INPUT                                │
│              (Company name or uploaded files)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AI RESEARCH PIPELINE                         │
│  • Triage files (if any)                                        │
│  • Parallel research (6 queries)                                │
│  • Synthesize research                                          │
│  • Generate investment memo with scores                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ATTIO: COMPANY UPSERT                         │
│                                                                  │
│  POST /v2/objects/companies/records?matching_attribute=domains   │
│                                                                  │
│  {                                                               │
│    "name": "Anthropic",                                         │
│    "domains": ["anthropic.com"],                                │
│    "description": "AI safety company...",                       │
│    "estimated_stage": "Series C"                                │
│  }                                                               │
│                                                                  │
│  Returns: company_record_id                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               ATTIO: CREATE INVESTMENT OPPORTUNITY               │
│                                                                  │
│  POST /v2/objects/investment_opportunities/records               │
│                                                                  │
│  {                                                               │
│    "display_name": "Anthropic - Dec 2024",                      │
│    "company": company_record_id,                                │
│    "round": "Series C",                                         │
│    "status": "New",                                             │
│    "tags": ["AI/ML", "Enterprise"]                              │
│  }                                                               │
│                                                                  │
│  Returns: opportunity_record_id                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ATTIO: ATTACH MEMO AS NOTE                      │
│                                                                  │
│  POST /v2/notes                                                  │
│                                                                  │
│  {                                                               │
│    "parent_object": "investment_opportunities",                 │
│    "parent_record_id": opportunity_record_id,                   │
│    "title": "Investment Memo: 8.5/10",                          │
│    "format": "markdown",                                        │
│    "content": "# Investment Memo\n\n**Score:** 8.5/10..."       │
│  }                                                               │
│                                                                  │
│  Returns: note_id                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RETURN TO USER                              │
│                                                                  │
│  {                                                               │
│    opportunity_id,                                              │
│    opportunity_url,  // Link to Attio                           │
│    company_id,                                                  │
│    memo                                                          │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Functions Needed

### 1. `upsertCompany(research: CompanyResearch)`
Create or update company record based on domain.

```typescript
async function upsertCompany(research: CompanyResearch): Promise<{
  recordId: string;
  webUrl: string;
  isNew: boolean;
}>
```

### 2. `createInvestmentOpportunity(companyRecordId, memo)`
Create a new Investment Opportunity linked to the company.

```typescript
async function createInvestmentOpportunity(
  companyRecordId: string,
  companyName: string,
  memo: InvestmentMemo,
  research: CompanyResearch
): Promise<{
  recordId: string;
  webUrl: string;
}>
```

### 3. `attachMemoNote(opportunityRecordId, memo)`
Attach the full memo as a markdown note.

```typescript
async function attachMemoNote(
  opportunityRecordId: string,
  memo: InvestmentMemo
): Promise<{
  noteId: string;
}>
```

---

## Implementation Checklist

- [ ] Update `client.ts` with new functions:
  - [ ] `upsertCompany()` - create/update company with research data
  - [ ] `createInvestmentOpportunity()` - create opportunity record
  - [ ] `attachOpportunityNote()` - attach memo to opportunity (not company)

- [ ] Update `route.ts` to use new flow:
  - [ ] Remove old mock functions
  - [ ] Call `upsertCompany()` after research
  - [ ] Call `createInvestmentOpportunity()` with company link
  - [ ] Call `attachOpportunityNote()` with memo

- [ ] Update UI to show Attio links:
  - [ ] Show "View in Attio" button with opportunity URL
  - [ ] Show opportunity status from Attio

---

## Status Field Mapping

Need to check what statuses are available in your `investment_opportunities.status` field.
These would map to pipeline stages like:
- New / Screening
- Researching
- Due Diligence
- Partner Review
- Term Sheet
- Closed Won / Closed Lost

---

## Notes

1. **Always research fresh** - Don't skip research even if company exists
2. **Opportunity is the core entity** - Each research creates a new opportunity
3. **Company is deduped by domain** - Use `matching_attribute=domains` for upsert
4. **Memo attached to opportunity** - Not to company (opportunities can have multiple memos over time)
