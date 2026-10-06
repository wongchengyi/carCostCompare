import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateCar, makeCar, validateCar, validateBudget } from '../dist/calc.mjs';

const close=(actual,expected,eps=1e-7)=>assert.ok(Math.abs(actual-expected)<=eps,`${actual} != ${expected}`);
let scenarios=0;
function check(label,fn){fn();scenarios++;console.log('PASS '+label);}
const budget={salary:6950,limit:20};
check('Flat-rate loan, down payment and all monthly/annual totals',()=>{
  const r=calculateCar(makeCar('x'),budget);
  assert.ok(r.valid);close(r.principal,90000);close(r.payment,1005.8333333333333);close(r.interest,18630);close(r.repayment,108630);close(r.downPayment,10000);
  close(r.litres,100);close(r.parts.fuel,199);close(r.parts.insurance,250);close(r.parts.roadTax,7.5);close(r.parts.maintenance,100);close(r.running,756.5);close(r.total,1762.3333333333333);close(r.annual,21148);close(r.annualRunning,9078);
  close(r.affordability.budgetAmount,1390);close(r.affordability.headroom,-372.3333333333333);close(r.affordability.requiredSalary,8811.666666666666);assert.equal(r.affordability.within,false);
});
check('Amount and percentage financing agree',()=>{const c=makeCar('x');close(calculateCar(c).total,calculateCar({...c,loanMode:'amount'}).total);});
check('Both fuel units yield the same consumption',()=>{const c=makeCar('x',{efficiency:10});close(calculateCar(c).parts.fuel,calculateCar({...c,efficiencyUnit:'L100',efficiency:10}).parts.fuel);});
check('NCD affects only base insurance, never a final quote',()=>{
  const c=makeCar('x',{insurance:4000,insuranceMode:'base',ncd:55,insuranceExtras:154});close(calculateCar(c).annualInsurance,1954);
  close(calculateCar({...c,insuranceMode:'final'}).annualInsurance,4000);
  close(calculateCar({...c,ncd:38.33}).annualInsurance,2620.8);
});
check('Reducing-balance nominal loan matches an independent amortization schedule',()=>{
  const c=makeCar('x',{loanMode:'amount',loanAmount:100000,rateType:'reducing',rate:4,years:9});const r=calculateCar(c);let balance=c.loanAmount,interest=0;
  for(let i=0;i<108;i++){const charge=balance*.04/12;interest+=charge;balance+=charge-r.payment;}
  close(balance,0,1e-6);close(interest,r.interest,1e-6);close(r.payment,1104.0968903020391,1e-6);
});
check('Effective annual conversion matches an independent amortization schedule',()=>{
  const c=makeCar('x',{loanMode:'amount',loanAmount:100000,rateType:'effective',rate:6,years:7});const r=calculateCar(c),rate=Math.pow(1.06,1/12)-1;let balance=c.loanAmount;
  for(let i=0;i<84;i++)balance=balance*(1+rate)-r.payment;
  close(balance,0,1e-6);assert.ok(r.payment<calculateCar({...c,rateType:'reducing'}).payment);
});
check('Zero-interest loans and cash purchases avoid divide-by-zero',()=>{
  for(const rateType of ['flat','reducing','effective'])close(calculateCar(makeCar('x',{rateType,rate:0})).payment,90000/108);
  const c=makeCar('x',{loanPercent:0,rate:null,years:null});const r=calculateCar(c);assert.ok(r.valid);close(r.payment,0);close(r.interest,0);close(r.downPayment,100000);close(r.total,r.running);
});
check('Zero running costs, zero distance and free fuel stay valid',()=>{
  const r=calculateCar(makeCar('x',{loanPercent:0,distance:0,insurance:0,roadTax:0,maintenance:0,parking:0,tolls:0,other:0}),budget);close(r.total,0);close(r.annual,0);assert.ok(r.affordability.within);
  close(calculateCar(makeCar('x',{fuelPrice:0})).parts.fuel,0);
});
check('Affordability boundary is inclusive; salary settings validate separately',()=>{
  const c=makeCar('x'),r=calculateCar(c);assert.ok(calculateCar(c,{salary:r.total*5,limit:20}).affordability.within);
  assert.ok(calculateCar(c,{salary:0,limit:20}).valid);assert.equal(calculateCar(c,{salary:0,limit:20}).affordability,undefined);
  assert.ok(validateBudget({salary:null,limit:20}).salary);assert.ok(validateBudget({salary:6950,limit:101}).limit);
});
check('Blank, negative, nonfinite, excess financing and malformed inputs are rejected',()=>{
  for(const patch of [{price:null},{price:-1},{price:0},{loanPercent:101},{loanMode:'amount',loanAmount:100001},{rate:-1},{years:0},{years:7.01},{years:10},{efficiency:0},{distance:-1},{insurance:-1},{parking:NaN},{tolls:Infinity},{roadTax:'90'},{name:''},{rateType:'bogus'},{efficiencyUnit:'bogus'},{insuranceMode:'base',ncd:56}])assert.equal(calculateCar(makeCar('x',patch)).valid,false,JSON.stringify(patch));
  assert.ok(validateCar(makeCar('x',{years:7.5})).years===undefined);
});
check('All local assets and metadata resolve',()=>{
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');const html=readFileSync(resolve(root,'index.html'),'utf8');
  for(const match of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)"/g))assert.ok(existsSync(resolve(root,match[1])),match[1]);
  assert.match(html,/<title>Car Cost Comparator<\/title>/);assert.match(html,/rel="icon"/);assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.match(readFileSync(resolve(root,'app.js'),'utf8'),/\.\/calc.mjs/);
});
console.log(`${scenarios} validation scenarios passed.`);
