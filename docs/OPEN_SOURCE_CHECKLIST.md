# Open Source Release Checklist

Security and privacy review for making this repository public.

---

## CRITICAL ISSUES

### 1. API Keys in .env.local (Not in Git, but MUST rotate)

Your `.env.local` contains REAL API keys:
```
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
ATTIO_API_KEY=16782315f0d5...
```

**Status**: These keys are NOT in git history (verified).

**Action Required**: Rotate both keys immediately before making the repo public, as they may have been exposed in other contexts.

---

## BRANDING TO GENERICIZE

### 2. HeyHo Branding Throughout

Files with HeyHo references that should be genericized:

| File | Issue |
|------|-------|
| `public/manifest.json` | "HeyHo Bot", "AI-powered investment research by HeyHo" |
| `app/layout.tsx` | "HeyHo Bot" title |
| `app/page.tsx` | Logo alt text "HeyHo" |
| `scripts/generate-icons.js` | "HeyHo Bot" comments |
| `docs/infographic-*.md` | HeyHo Bot references |

### 3. HeyHo Logo Files to Remove

These files in the project root should NOT be public:

- `heyho-black-on-transparent.png`
- `heyho-black-on-white.png`
- `heyho-ventures-logo-final.svg`
- `heyho-white-on-black.png`
- `heyho-white-on-transparent.png`
- `heyho.svg`
- `public/logo.svg` (HeyHo logo)
- `public/logo-dark.png` (HeyHo logo)
- `public/logo-light.png` (HeyHo logo)

---

## FUND-SPECIFIC CONFIGURATION

### 4. Strategic Partners Config (`src/config/strategic-partners.ts`)

Currently contains placeholder/example partners:
- TechCorp Ventures, HealthTech Partners, FinServ Capital, etc.

**Status**: Already genericized with example names - OK for public

### 5. Fund Thesis Config (`src/config/fund-thesis.ts`)

Contains generic "Generalist VC Fund" configuration.

**Status**: Already genericized - OK for public

---

## DOCUMENTATION CLEANUP

### 6. Files to Review/Remove

| File | Action |
|------|--------|
| `IMPLEMENTATION_PLAN.md` | Consider removing (internal planning doc) |
| `.claude/settings.local.json` | Contains local path `/Users/mlemos/...` - verify in .gitignore |
| `docs/infographic-*.md` | Update HeyHo references |

---

## RECOMMENDED CHANGES

```bash
# 1. Remove HeyHo logo files from repo
rm heyho-*.png heyho*.svg
rm public/logo.svg public/logo-dark.png public/logo-light.png

# 2. Add to .gitignore (if not already)
echo "heyho*" >> .gitignore

# 3. Update manifest.json, layout.tsx, page.tsx with generic branding
#    e.g., "AI VC Associate" or allow users to customize
```

---

## FILES THAT ARE SAFE

- `.env.example` - Contains placeholder values only
- `src/config/*.ts` - Already genericized with examples
- All code in `src/`, `app/`, `components/` - No hardcoded secrets
- Git history - No secrets committed

---

## SUMMARY

| Category | Status | Action Required |
|----------|--------|-----------------|
| API Keys in code | Clean | None |
| API Keys in .env.local | Not committed | Rotate before public |
| Git history secrets | Clean | None |
| HeyHo branding | Present | Genericize or remove |
| HeyHo logos | Present | Remove from repo |
| Fund config | Genericized | None |
| Personal paths | In .claude/ | Verify .gitignore |

---

*Generated: December 2024*
