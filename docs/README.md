# Exa FSI Assignment Docs

Start here:

- `fsi-signal-studio-spec-v3.md` - canonical product/spec document.
- `exa-take-home-assignment-context.md` - original assignment context and key decisions.
- `backend-agent-ops.md` - backend/API/CLI contract for the live Websets-backed app.
- `original-assignment/README.md` - redacted summary of the original take-home prompt.

Research support:

- `fsi-agent-signal-exploration-memo.md` - first broad Exa/Crustdata signal exploration.
- `fsi-signal-2-5-10-test-memo.md` - follow-up test of governance, conferences, webinars, AI leadership, and customer AI assistant signals.
- `../data/research/fsi-agent-signal-candidates.csv` - broad signal candidate table.
- `../data/research/fsi-signal-2-5-10-test-candidates.csv` - follow-up signal test candidates.
- `fsi-icp-validation.md`, `fsi-tam-estimate.md`, and `fsi-take-home-research-map.md` - extra research notes.

Important architecture decision:

- Webset entity should be a custom signal entity, not company.
- Webset item = one source-backed signal.
- App groups signals by `company_domain` into account cards.
- Reps can click an account and create a branded prospect-facing Signal Studio.

Naming:

- Use `account_segment`, `territory`, and `fsi_subsector`.
- Avoid `territory_hint` and `fsi_segment`.
