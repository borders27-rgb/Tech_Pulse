# TechPulse AI CapEx Risk Monitor

## Product outcome

Turn raw technology and financial headlines into one decision-oriented answer:

> Has hyperscaler AI spending materially weakened, which public-market suppliers are exposed, and has the evidence reached a tradeable threshold?

## Scope

The first vertical slice monitors:

- Spend controllers: Microsoft, Amazon, Alphabet, Meta
- Direct beneficiaries: Nvidia, AMD, Broadcom
- Basket proxies: SMH, SOXX, QQQ
- Signals: CapEx increases/cuts, capacity constraints, project delays, demand normalization, margin pressure and free-cash-flow pressure

## Decision states

- `NO_SIGNAL`: insufficient relevant evidence
- `WATCH`: mixed or early evidence; no confirmed setup
- `RISK_RISING`: multiple bearish spending signals or a high-impact cut/delay signal
- `BULLISH_SPEND`: spending and capacity language remain constructive

## Required output

Each response includes:

- current state and score
- plain-English thesis
- evidence headlines with source links
- exposed companies and ETFs
- entry confirmation required
- invalidation conditions
- explicit `tradeReady` boolean

## Guardrails

The monitor is research software, not personalized investment advice. It does not recommend position size or execute trades. A bearish fundamental signal is not trade-ready without market-price confirmation.

## Next increment

1. Add earnings-call transcript ingestion.
2. Add market prices and volume confirmation.
3. Replace headline heuristics with structured LLM extraction and source citations.
4. Add alerts when state changes.
