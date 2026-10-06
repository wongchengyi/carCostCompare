export const NCD_OPTIONS = [0, 25, 30, 38.33, 45, 55];
const finite = n => typeof n === 'number' && Number.isFinite(n);

export function validateCar(c) {
  const e = {};
  const range = (k, label, min, max, strict = false) => {
    if (!finite(c[k])) e[k] = `Enter ${label.toLowerCase()}.`;
    else if ((strict ? c[k] <= min : c[k] < min) || c[k] > max) e[k] = `${label} must be ${strict ? 'greater than' : 'at least'} ${min} and no more than ${max.toLocaleString('en-MY')}.`;
  };
  if (typeof c.name !== 'string' || !c.name.trim() || c.name.length > 60) e.name = 'Enter a car name (1–60 characters).';
  range('price', 'Purchase price', 0, 10000000, true);
  if (!['percent', 'amount'].includes(c.loanMode)) e.loanMode = 'Choose a loan input method.';
  if (c.loanMode === 'percent') range('loanPercent', 'Loan percentage', 0, 100);
  else { range('loanAmount', 'Loan amount', 0, 10000000); if (finite(c.loanAmount) && finite(c.price) && c.loanAmount > c.price) e.loanAmount = 'Loan amount cannot exceed the purchase price.'; }
  const principal = c.loanMode === 'percent' ? c.price * c.loanPercent / 100 : c.loanAmount;
  if (!['flat', 'reducing', 'effective'].includes(c.rateType)) e.rateType = 'Choose an interest method.';
  if (principal > 0) {
    range('rate', 'Annual interest rate', 0, 100);
    range('years', 'Tenure in years', 1, 9);
    if (finite(c.years) && Math.abs(c.years * 12 - Math.round(c.years * 12)) > 1e-8) e.years = 'Tenure must equal a whole number of months.';
  }
  range('distance', 'Monthly distance', 0, 100000);
  if (!['kmL', 'L100'].includes(c.efficiencyUnit)) e.efficiencyUnit = 'Choose a fuel efficiency unit.';
  range('efficiency', 'Fuel efficiency', 0, 1000, true);
  range('fuelPrice', 'Fuel price', 0, 100);
  if (!['final', 'base'].includes(c.insuranceMode)) e.insuranceMode = 'Choose an insurance input method.';
  range('insurance', 'Annual insurance', 0, 1000000);
  if (c.insuranceMode === 'base') { range('ncd', 'NCD', 0, 55); range('insuranceExtras', 'Non-discounted insurance costs', 0, 1000000); }
  for (const [k, label] of [['roadTax','Annual road tax'],['maintenance','Annual maintenance'],['parking','Monthly parking'],['tolls','Monthly tolls'],['other','Other monthly costs']]) range(k, label, 0, 1000000);
  return e;
}

export function validateBudget(b) {
  const e = {};
  if (!finite(b.salary) || b.salary <= 0 || b.salary > 10000000) e.salary = 'Enter a net salary above RM0 (up to RM10,000,000).';
  if (!finite(b.limit) || b.limit <= 0 || b.limit > 100) e.limit = 'Enter a budget limit above 0% and up to 100%.';
  return e;
}

export function calculateCar(c, budget) {
  const errors = validateCar(c);
  if (Object.keys(errors).length) return { valid: false, errors };
  const principal = c.loanMode === 'percent' ? c.price * c.loanPercent / 100 : c.loanAmount;
  const months = principal > 0 ? Math.round(c.years * 12) : 0;
  let payment = 0;
  if (principal > 0) {
    if (c.rateType === 'flat') payment = principal * (1 + c.rate / 100 * c.years) / months;
    else {
      const r = c.rateType === 'effective' ? Math.expm1(Math.log1p(c.rate / 100) / 12) : c.rate / 100 / 12;
      payment = r === 0 ? principal / months : principal * r / -Math.expm1(-months * Math.log1p(r));
    }
  }
  const litres = c.efficiencyUnit === 'kmL' ? c.distance / c.efficiency : c.distance * c.efficiency / 100;
  const fuel = litres * c.fuelPrice;
  const annualInsurance = c.insuranceMode === 'final' ? c.insurance : c.insurance * (1 - c.ncd / 100) + c.insuranceExtras;
  const parts = { fuel, insurance: annualInsurance / 12, roadTax: c.roadTax / 12, maintenance: c.maintenance / 12, parking: c.parking, tolls: c.tolls, other: c.other };
  const running = Object.values(parts).reduce((sum,n) => sum + n, 0);
  const total = payment + running;
  const repayment = payment * months;
  const result = { valid: true, errors: {}, principal, downPayment: c.price - principal, months, payment, repayment, interest: Math.max(0,repayment - principal), litres, annualInsurance, parts, running, total, annual: total * 12, annualRunning: running * 12 };
  if (budget && !Object.keys(validateBudget(budget)).length) {
    const budgetAmount = budget.salary * budget.limit / 100;
    result.affordability = { share: total / budget.salary * 100, loanShare: payment / budget.salary * 100, budgetAmount, headroom: budgetAmount - total, salaryLeft: budget.salary - total, requiredSalary: total / (budget.limit / 100), within: total <= budgetAmount + 1e-8 };
  }
  return result;
}

export function makeCar(id, overrides = {}) {
  return { id, name: 'Car A', price: 100000, loanMode: 'percent', loanPercent: 90, loanAmount: 90000, rateType: 'flat', rate: 2.3, years: 9, distance: 1500, efficiencyUnit: 'kmL', efficiency: 15, fuelPrice: 1.99, insuranceMode: 'final', insurance: 3000, ncd: 38.33, insuranceExtras: 0, roadTax: 90, parking: 100, tolls: 100, maintenance: 1200, other: 0, ...overrides };
}
