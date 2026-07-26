export type CapexItem = {
  title: string;
  link: string;
  date: string;
  source: string;
  sourceName: string;
};

export type CapexState = 'NO_SIGNAL' | 'WATCH' | 'RISK_RISING' | 'BULLISH_SPEND';

const CONTROLLERS = [
  { name: 'Microsoft', ticker: 'MSFT', terms: ['microsoft', 'azure'] },
  { name: 'Amazon', ticker: 'AMZN', terms: ['amazon', 'aws'] },
  { name: 'Alphabet', ticker: 'GOOGL', terms: ['alphabet', 'google', 'google cloud'] },
  { name: 'Meta', ticker: 'META', terms: ['meta', 'facebook'] }
];

const BENEFICIARIES = [
  { name: 'Nvidia', ticker: 'NVDA', terms: ['nvidia', 'gpu', 'blackwell'] },
  { name: 'Broadcom', ticker: 'AVGO', terms: ['broadcom', 'custom silicon', 'networking'] },
  { name: 'AMD', ticker: 'AMD', terms: ['amd', 'mi300', 'mi350'] }
];

const BEARISH = [
  { pattern: /cut|reduce|slow|moderate|pull back|scale back|delay|defer|pause|cancel/i, weight: 3, label: 'spending slowdown' },
  { pattern: /capex|capital expenditure|data cent(er|re)|ai infrastructure/i, weight: 2, label: 'AI infrastructure spending' },
  { pattern: /margin pressure|free cash flow|returns? below|demand normalization|overcapacity/i, weight: 2, label: 'return or demand pressure' }
];

const BULLISH = [
  { pattern: /raise|increase|accelerate|expand|record|surge/i, weight: 2, label: 'spending acceleration' },
  { pattern: /capacity constrained|demand exceeds|sold out|backlog|shortage/i, weight: 3, label: 'capacity constraint' },
  { pattern: /capex|capital expenditure|data cent(er|re)|ai infrastructure/i, weight: 1, label: 'AI infrastructure spending' }
];

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function scoreItem(item: CapexItem) {
  const text = item.title.toLowerCase();
  const controller = CONTROLLERS.find((company) => includesAny(text, company.terms));
  const beneficiary = BENEFICIARIES.find((company) => includesAny(text, company.terms));
  const isRelevant = Boolean(controller || beneficiary || /capex|capital expenditure|data cent(er|re)|ai infrastructure/i.test(text));
  if (!isRelevant) return null;

  let bearish = 0;
  let bullish = 0;
  const tags = new Set<string>();

  for (const signal of BEARISH) {
    if (signal.pattern.test(item.title)) {
      bearish += signal.weight;
      tags.add(signal.label);
    }
  }
  for (const signal of BULLISH) {
    if (signal.pattern.test(item.title)) {
      bullish += signal.weight;
      tags.add(signal.label);
    }
  }

  return {
    ...item,
    controller: controller ? { name: controller.name, ticker: controller.ticker } : null,
    beneficiary: beneficiary ? { name: beneficiary.name, ticker: beneficiary.ticker } : null,
    bearish,
    bullish,
    tags: [...tags]
  };
}

export function analyzeCapex(items: CapexItem[]) {
  const evidence = items
    .map(scoreItem)
    .filter((item): item is NonNullable<ReturnType<typeof scoreItem>> => Boolean(item))
    .sort((a, b) => (b.bearish + b.bullish) - (a.bearish + a.bullish))
    .slice(0, 12);

  const bearishScore = evidence.reduce((sum, item) => sum + item.bearish, 0);
  const bullishScore = evidence.reduce((sum, item) => sum + item.bullish, 0);
  const netScore = bearishScore - bullishScore;

  let state: CapexState = 'NO_SIGNAL';
  if (evidence.length > 0) state = 'WATCH';
  if (netScore >= 5 && bearishScore >= 7) state = 'RISK_RISING';
  if (netScore <= -5 && bullishScore >= 7) state = 'BULLISH_SPEND';

  const mentionedControllers = CONTROLLERS
    .filter((company) => evidence.some((item) => item.controller?.ticker === company.ticker))
    .map(({ name, ticker }) => ({ name, ticker }));

  const thesis = state === 'RISK_RISING'
    ? 'Hyperscaler AI spending risk is rising. Supplier exposure may be more vulnerable than the spend controllers themselves, but market-price confirmation is still required.'
    : state === 'BULLISH_SPEND'
      ? 'AI infrastructure spending remains constructive and capacity language is strong. A bearish supplier trade is not supported by the current evidence.'
      : state === 'WATCH'
        ? 'Relevant AI spending evidence exists, but it is mixed or too limited for a directional conclusion.'
        : 'No meaningful hyperscaler AI CapEx signal is present in the current feed.';

  return {
    state,
    score: netScore,
    bearishScore,
    bullishScore,
    tradeReady: false,
    thesis,
    controllers: mentionedControllers,
    exposedSuppliers: BENEFICIARIES.map(({ name, ticker }) => ({ name, ticker })),
    basketProxies: ['SMH', 'SOXX', 'QQQ'],
    confirmationRequired: [
      'Explicit CapEx reduction, deferred project, or demand-normalization language from a hyperscaler',
      'Supplier or semiconductor basket breaks support on elevated volume',
      'The signal is confirmed by more than one credible source or an earnings transcript'
    ],
    invalidation: [
      'Hyperscalers raise spending guidance',
      'Management continues to report material capacity constraints',
      'AI revenue growth accelerates enough to offset spending pressure'
    ],
    evidence,
    generatedAt: new Date().toISOString(),
    disclaimer: 'Research signal only. Not personalized investment advice or an instruction to trade.'
  };
}
