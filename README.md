# Car Cost Comparator

Private owner-only static Site for Malaysian car cash-flow decisions. Source assets are in `dist/`; no build or dependencies are required. Hosting identity is in `.openai/hosting.json`.

The site compares up to six session-only scenarios. There is no browser persistence, analytics or external data fetching. Default salary is RM6,950; car values are illustrative and explicitly editable. Inputs reset on refresh.

`dist/calc.mjs` owns numeric validation and calculations. `dist/app.js` renders the interface and uses that same calculation module. It feature-detects browser WebMCP and registers read/configure tools; configuration validates all changes before mutating state.

Loan methods: flat add-on; reducing balance with nominal annual rate divided by 12; reducing balance with effective annual rate converted using the twelfth root. Equal monthly payments at a constant rate. Cash purchases have zero financing cost and their price appears as upfront down payment. Annual ownership is a 12-month cash-flow estimate during the loan term, excluding upfront costs and depreciation.

Insurance accepts an all-in final annual quote with NCD already included, or a discountable base premium plus NCD and actual non-discounted annual costs. Taxes and add-ons are not automatically inferred. Road tax is entered as an annual RM amount, so regional or vehicle-class assumptions are avoided.

Run `node scripts/validate.mjs` for numeric, edge-case and local-asset validation. Run `node --check dist/app.js` for UI script syntax. Reducing-balance calculations are checked against independent monthly amortization. The static managed profile has no permitted browser preview, so visual browser QA and supported-context WebMCP QA are unavailable in this environment.
