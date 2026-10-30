# AlphaMix Business Scenarios

All numbers in the MVP are illustrative mock assumptions. They are designed to
demonstrate decision mechanics, not to describe current markets or recommend an
investment.

## Personas

- **CIO / investment committee:** compares policy-level mixes and reads the
  reasons behind allocation changes.
- **Portfolio strategist:** changes agent influence, risk tolerance, and caps,
  then saves scenarios for discussion.
- **Risk reviewer:** confirms mandatory constraints remain active independently
  of subjective agent influence.

## Preset hypotheses

### Balanced

Uses broadly even specialist influence. This is the baseline for before/after
comparison and should produce a diversified feasible allocation.

### Risk defense

Raises Risk, Liquidity, Macro, and Geopolitical influence. The expected behavior
is lower risk-asset attractiveness, higher defensive allocation, and compliance
with the same mandatory portfolio limits.

### Value investing

Raises Valuation influence and keeps Risk as a secondary input. The expected
behavior is a material change in adjusted return estimates and allocation when
valuation signals differ across assets.

## Demonstration flow

1. Open Overview and confirm that the data badge says `MOCK`.
2. Inspect all six analyses and their sources, as-of date, confidence, and
   limitations.
3. Open Mixing Console and select Balanced.
4. Move the Valuation fader up and Flow down; confirm normalized weights remain
   100% and the allocation preview changes.
5. Disable Risk Agent; confirm that portfolio caps and risk constraints still
   pass.
6. Set every enabled fader to zero; confirm that optimization stops with an
   explanatory error.
7. Load Risk defense, save it as a scenario, and compare it with Balanced.
8. Open Report and review the agent evidence, critic notes, allocation, and
   limitations in one place.

## Financial validation rules

- Portfolio weights must be long-only and sum to 1 within `1e-5`.
- Each asset must satisfy its mandatory maximum weight.
- Cash must meet the configured minimum.
- The liquidity budget must pass even when Liquidity Agent influence is zero.
- The risk budget must pass even when Risk Agent influence is zero.
- Expected return adjustments must be bounded and traceable to mixed scores.
- A scenario is comparable only if its model and data versions are displayed.

## Known MVP limitations

- No live market feed, liability model, FX hedging, transaction cost, tax, or
  trading integration.
- The four-asset covariance and returns are illustrative.
- Agent rationales in mock mode are curated demonstration content.
- The LLM path is optional and must not be treated as verified evidence merely
  because a model produced it.

