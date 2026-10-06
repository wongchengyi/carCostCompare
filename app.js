import { calculateCar, makeCar, validateCar, validateBudget, NCD_OPTIONS } from './calc.mjs';

const state = { budget: { salary: 6950, limit: 20 }, cars: [makeCar('car-1'), makeCar('car-2', { name: 'Car B', price: 130000, loanAmount: 117000, efficiency: 12, insurance: 3700, roadTax: 400, maintenance: 1800 })], selected: 'car-1', pane: 'finance', nextId: 3 };
const rm = n => 'RM' + n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const decimal = (n, digits=1) => n.toLocaleString('en-MY', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const esc = s => String(s).replace(/[&<>"']/g, x => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[x]));
const selectedCar = () => state.cars.find(c => c.id === state.selected);
const $ = s => document.querySelector(s);
const methods = { flat: 'Flat rate', reducing: 'Reducing · nominal annual rate', effective: 'Reducing · effective annual rate' };
const partNames = { fuel: 'Fuel', insurance: 'Insurance fund', roadTax: 'Road tax fund', maintenance: 'Maintenance fund', parking: 'Parking', tolls: 'Tolls', other: 'Other recurring' };

function numberField(c, key, label, prefix='', suffix='', options={}) {
  return `<div class="field ${options.full?'full':''}"><label for="car-${key}">${label}</label><div class="input-wrap">${prefix?`<span>${prefix}</span>`:''}<input id="car-${key}" data-field="${key}" type="number" min="${options.min??0}" max="${options.max??1000000}" step="${options.step??'any'}" inputmode="decimal" value="${c[key]??''}" ${options.disabled?'disabled':''} aria-describedby="error-${key}${options.hint?' hint-'+key:''}">${suffix?`<span>${suffix}</span>`:''}</div><p class="error" id="error-${key}"></p>${options.hint?`<p class="hint" id="hint-${key}">${options.hint}</p>`:''}</div>`;
}
function selectField(c,key,label,options,full=false,hint='') {
  return `<div class="field ${full?'full':''}"><label for="car-${key}">${label}</label><select id="car-${key}" data-field="${key}" aria-describedby="error-${key}${hint?' hint-'+key:''}">${options.map(([v,t])=>`<option value="${esc(v)}" ${c[key]===v?'selected':''}>${esc(t)}</option>`).join('')}</select><p class="error" id="error-${key}"></p>${hint?`<p class="hint" id="hint-${key}">${hint}</p>`:''}</div>`;
}
function renderEditor() {
  const c=selectedCar();
  const noLoan=c.loanMode==='percent'?c.loanPercent===0:c.loanAmount===0;
  const finance=`<div class="fields-grid">
    ${numberField(c,'price','Purchase price','RM','',{full:true,max:10000000,min:.01})}
    ${selectField(c,'loanMode','Enter loan as',[['percent','Percentage of price'],['amount','Amount in RM']],true)}
    ${c.loanMode==='percent'?numberField(c,'loanPercent','Loan percentage','','%',{max:100}):numberField(c,'loanAmount','Loan amount','RM','',{max:10000000})}
    ${numberField(c,'years','Loan tenure','','years',{min:1,max:9,disabled:noLoan})}
    ${selectField(c,'rateType','Interest method',Object.entries(methods),true)}
    ${numberField(c,'rate','Annual interest rate','','% p.a.',{full:true,max:100,disabled:noLoan,hint:c.rateType==='flat'?'Use the flat rate from your quote. This is not the effective annual cost.':c.rateType==='reducing'?'Monthly rate = quoted nominal annual rate ÷ 12.':'Monthly rate = (1 + effective annual rate)^(1/12) − 1.'})}
    </div><div id="loan-detail" class="loan-detail"></div><p class="rate-note">Choose 0% financing or RM0 loan for a cash purchase. Loan payments are assumed constant over the term; down payment is a separate upfront cost.</p>`;
  const running=`<div class="fields-grid">
    ${numberField(c,'distance','Monthly distance','','km',{max:100000})}
    ${numberField(c,'fuelPrice','Fuel price','RM','/ L',{max:100})}
    ${selectField(c,'efficiencyUnit','Efficiency unit',[['kmL','km per litre'],['L100','L per 100 km']])}
    ${numberField(c,'efficiency','Fuel efficiency','',c.efficiencyUnit==='kmL'?'km/L':'L/100 km',{min:.01,max:1000})}
    </div><p class="section-label">INSURANCE & ANNUAL COSTS</p><div class="fields-grid">
    ${selectField(c,'insuranceMode','Insurance input',[['final','Final quote · after NCD, all-in'],['base','Base premium · before NCD']],true)}
    ${numberField(c,'insurance',c.insuranceMode==='final'?'Final annual insurance':'Annual base premium','RM','/ year',{full:true,hint:c.insuranceMode==='final'?'Enter the final amount payable, including tax, stamp duty and add-ons. NCD is already included.':'Enter only the premium eligible for NCD. Add the actual non-discounted charges below.'})}
    ${c.insuranceMode==='base'?selectField(c,'ncd','No-claim discount',NCD_OPTIONS.map(v=>[v,v+'%'])):selectField(c,'ncd','NCD already in quote',[[c.ncd,c.ncd+'% · not applied again']])}
    ${numberField(c,'insuranceExtras','Non-discounted costs','RM','/ year',{disabled:c.insuranceMode==='final',hint:c.insuranceMode==='base'?'Actual quoted taxes, stamp duty and add-ons.':'Included in your final quote.'})}
    ${numberField(c,'roadTax','Road tax','RM','/ year')}
    ${numberField(c,'maintenance','Maintenance','RM','/ year',{hint:'Include service, tyres and repair reserves.'})}
    </div><p class="section-label">MONTHLY COSTS</p><div class="fields-grid">
    ${numberField(c,'parking','Parking','RM','/ month')}
    ${numberField(c,'tolls','Tolls','RM','/ month')}
    ${numberField(c,'other','Other recurring costs','RM','/ month',{full:true,hint:'For example, car wash or a recurring subscription.'})}
    </div>`;
  $('#car-editor').innerHTML=`<div class="editor-title"><h2>Edit car</h2><div class="editor-tools"><button class="button quiet" type="button" data-action="duplicate" ${state.cars.length>=6?'disabled':''}>Duplicate</button><button class="button quiet danger" type="button" data-action="remove" ${state.cars.length===1?'disabled':''}>Remove</button></div></div><div class="field"><label for="car-name">Car name</label><div class="input-wrap"><input id="car-name" data-field="name" type="text" value="${esc(c.name)}" maxlength="60" aria-describedby="error-name"></div><p class="error" id="error-name"></p></div><div class="editor-nav" role="tablist" aria-label="Car inputs"><button type="button" role="tab" id="finance-tab" aria-controls="editor-pane" aria-selected="${state.pane==='finance'}" tabindex="${state.pane==='finance'?0:-1}" data-pane="finance">Financing</button><button type="button" role="tab" id="running-tab" aria-controls="editor-pane" aria-selected="${state.pane==='running'}" tabindex="${state.pane==='running'?0:-1}" data-pane="running">Running costs</button></div><div id="editor-pane" role="tabpanel" aria-labelledby="${state.pane==='finance'?'finance-tab':'running-tab'}">${state.pane==='finance'?finance:running}</div>`;
  if(c.insuranceMode==='final' && $('#car-ncd')) $('#car-ncd').disabled=true;
  renderOutputs();
}

function renderValidation() {
  const c=selectedCar(),errors=validateCar(c);
  for(const input of document.querySelectorAll('[data-field]')) {
    const message=errors[input.dataset.field];
    input.setAttribute('aria-invalid',message?'true':'false');
    const error=$('#error-'+input.dataset.field); if(error) error.textContent=message??'';
  }
  const budgetErrors=validateBudget(state.budget);
  for(const k of ['salary','limit']) { $('#'+k).setAttribute('aria-invalid',budgetErrors[k]?'true':'false'); $('#'+k+'-error').textContent=budgetErrors[k]??''; }
  $('#budget-value').textContent=Object.keys(budgetErrors).length?'—':rm(state.budget.salary*state.budget.limit/100);
}

function renderResult(c,r) {
  if(!r.valid) {
    $('#results').innerHTML=`<div class="result-error"><p class="eyebrow">CHECK YOUR INPUTS</p><h2>Complete the car details to compare.</h2><p>${Object.values(r.errors).map(esc).join('<br>')}</p></div>`;
    if($('#loan-detail')) $('#loan-detail').innerHTML='<div>Complete the financing inputs for a loan estimate.</div>';
    return;
  }
  const a=r.affordability, financeShare=r.total?100*r.payment/r.total:0;
  const affordability=a?`<div class="affordability"><div class="afford-top"><h3>Fits your monthly budget?</h3><span class="badge ${a.within?'':'over'}">${a.within?'Within your limit':'Above your limit'}</span></div><div class="afford-main"><strong>${decimal(a.share)}%</strong><span>of net salary · ${decimal(state.budget.limit)}% limit</span></div><div class="budget-meter ${a.within?'':'over'}" aria-hidden="true"><div class="fill" style="width:${Math.min(100,a.share)}%"></div><span class="marker" style="left:${Math.min(100,state.budget.limit)}%"></span></div><p class="afford-caption"><strong>${rm(Math.abs(a.headroom))}</strong> ${a.within?'below':'above'} your monthly car budget.</p><div class="afford-grid"><div><span>Salary left after car</span><strong>${rm(a.salaryLeft)}</strong></div><div><span>Net salary needed at ${decimal(state.budget.limit)}%</span><strong>${rm(a.requiredSalary)}</strong></div></div><p class="hint">Salary left is before your other commitments and savings.</p></div>`:`<div class="affordability"><h3>Enter valid affordability settings</h3><p class="hint">Car costs still calculate. Add a net salary and budget limit to see affordability.</p></div>`;
  $('#results').innerHTML=`<div class="total-card"><div class="total-top"><div><p class="eyebrow">TOTAL MONTHLY OWNERSHIP</p><h2 class="total-value"><span class="currency">RM</span>${r.total.toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2})}<small>/ month</small></h2><p class="annual-total"><strong>${rm(r.annual)}</strong> per year</p></div><span class="result-car-name">${esc(c.name)}</span></div><div class="cost-strip" aria-hidden="true"><div class="finance" style="width:${financeShare}%"></div><div class="running" style="width:${r.total?100-financeShare:0}%"></div></div><div class="split-metrics"><div><span><i class="swatch finance"></i> Loan payment</span><strong>${rm(r.payment)}</strong><small>${r.months?`${r.months} monthly payments`:'Cash purchase · no loan'}</small></div><div><span><i class="swatch running"></i> Running costs</span><strong>${rm(r.running)}</strong><small>Monthly spending + sinking funds</small></div></div></div>${affordability}<div class="breakdown panel"><div class="breakdown-heading"><h3>Where the running cost goes</h3><span>RM / month</span></div><div class="breakdown-list">${Object.entries(r.parts).map(([key,value])=>`<div class="breakdown-line"><span>${partNames[key]}</span><strong>${rm(value)}</strong></div>`).join('')}</div><p class="breakdown-note">${decimal(r.litres)} L of fuel per month. Insurance, road tax and maintenance are annual costs spread over 12 months.</p></div>`;
  if($('#loan-detail')) $('#loan-detail').innerHTML=`<div><span>Loan principal</span><strong>${rm(r.principal)}</strong></div><div><span>Down payment · upfront</span><strong>${rm(r.downPayment)}</strong></div><div><span>Total loan interest</span><strong>${rm(r.interest)}</strong></div><div><span>Total loan repayment</span><strong>${rm(r.repayment)}</strong></div>`;
}

function renderComparison(items) {
  const valid=items.filter(x=>x.r.valid),max=Math.max(1,...valid.map(x=>x.r.total));
  const lowest=valid.length>1?Math.min(...valid.map(x=>x.r.total)):null;
  $('#comparison-charts').innerHTML=items.map(({c,r})=>`<div class="mini-chart"><div class="mini-name"><span>${esc(c.name)}</span>${r.valid&&lowest!==null&&Math.abs(r.total-lowest)<1e-8?'<small>Lowest cost</small>':''}</div><div class="mini-total">${r.valid?rm(r.total):'Check inputs'}</div><div class="mini-track" aria-hidden="true">${r.valid?`<div class="finance" style="width:${r.payment/max*100}%"></div><div class="running" style="width:${r.running/max*100}%"></div>`:''}</div></div>`).join('');
  const group=(label,extra='')=>`<tr class="row-group"><th colspan="${items.length+1}">${label}${extra?`<small>${extra}</small>`:''}</th></tr>`;
  const row=(label,getter,format=rm,cls='')=>`<tr class="${cls}"><th scope="row">${label}</th>${items.map(({c,r})=>`<td>${r.valid?(getter(c,r)==null?'—':esc(format(getter(c,r)))):'—'}</td>`).join('')}</tr>`;
  let rows=group('FINANCING');
  rows+=row('Purchase price',c=>c.price)+row('Loan amount',(_,r)=>r.principal)+row('Down payment · upfront',(_,r)=>r.downPayment)+row('Interest method',c=>methods[c.rateType],String)+row('Annual interest rate',(c,r)=>r.principal?c.rate:null,n=>decimal(n,2)+'%')+row('Tenure',(c,r)=>r.months?c.years:null,n=>decimal(n,2)+' years')+row('Monthly loan payment',(_,r)=>r.payment)+row('Total loan interest',(_,r)=>r.interest)+row('Total loan repayment',(_,r)=>r.repayment);
  rows+=group('RUNNING COSTS','monthly, including annual sinking funds');
  for(const [key,label]of Object.entries(partNames)) rows+=row(label,(_,r)=>r.parts[key]);
  rows+=row('Monthly running cost',(_,r)=>r.running)+row('Insurance · annual payable',(_,r)=>r.annualInsurance);
  rows+=group('TOTAL CASH FLOW');
  rows+=row('Total monthly ownership',(_,r)=>r.total,rm,'row-total')+row('Annual ownership cost',(_,r)=>r.annual)+row('Annual running cost',(_,r)=>r.annualRunning);
  rows+=group('AFFORDABILITY');
  rows+=row('Total cost / net salary',(_,r)=>r.affordability?.share,n=>decimal(n)+'%')+row('Loan only / net salary',(_,r)=>r.affordability?.loanShare,n=>decimal(n)+'%')+row('Salary left after car',(_,r)=>r.affordability?.salaryLeft)+row('Net salary needed at your limit',(_,r)=>r.affordability?.requiredSalary)+row('Budget status',(_,r)=>r.affordability?(r.affordability.within?'Within limit':'Above limit'):null,String);
  $('#comparison-table').innerHTML=`<caption class="sr-only">Financing, running costs and affordability for ${items.length} cars</caption><thead><tr><th scope="col">Cost / assumption</th>${items.map(({c})=>`<th scope="col">${esc(c.name)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody>`;
}
function renderOutputs() {
  renderValidation();
  const items=state.cars.map(c=>({c,r:calculateCar(c,state.budget)}));
  $('#car-tabs').innerHTML=items.map(({c,r})=>`<button type="button" class="car-tab ${c.id===state.selected?'active':''}" data-car="${c.id}" aria-pressed="${c.id===state.selected}" aria-label="Edit ${esc(c.name)}"><span class="car-name">${esc(c.name||'Unnamed car')}</span><span class="tab-cost">${r.valid?rm(r.total):'Check inputs'}</span></button>`).join('');
  $('#add-car').disabled=state.cars.length>=6;
  $('#add-car').title=state.cars.length>=6?'Compare up to 6 cars':'Add a comparison car';
  const current=items.find(x=>x.c.id===state.selected);
  renderResult(current.c,current.r); renderComparison(items);
}
function announce(message){$('#announcement').textContent=message;}
function addCar(duplicate=false) {
  if(state.cars.length>=6) return;
  const id='car-'+state.nextId++;
  const name=duplicate?(selectedCar().name.slice(0,53)+' (copy)'):'Car '+String.fromCharCode(65+state.cars.length);
  const car=duplicate?{...selectedCar(),id,name}:makeCar(id,{name});
  state.cars.push(car);state.selected=id;renderEditor();$('#car-name').focus();announce(name+' added.');
}
$('#add-car').addEventListener('click',()=>addCar());
$('#car-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-car]');if(button){state.selected=button.dataset.car;renderEditor();document.querySelector(`[data-car="${state.selected}"]`).focus();}});
$('#car-editor').addEventListener('click',event=>{
  const pane=event.target.closest('[data-pane]');if(pane){state.pane=pane.dataset.pane;renderEditor();$('#'+state.pane+'-tab').focus();return;}
  const action=event.target.closest('[data-action]')?.dataset.action;
  if(action==='duplicate')addCar(true);
  if(action==='remove'&&state.cars.length>1){const index=state.cars.findIndex(c=>c.id===state.selected),name=selectedCar().name;state.cars.splice(index,1);state.selected=state.cars[Math.min(index,state.cars.length-1)].id;renderEditor();$('#car-name').focus();announce(name+' removed.');}
});
$('#car-editor').addEventListener('keydown',event=>{if(!event.target.matches('[role=tab]'))return;if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();state.pane=event.key==='Home'?'finance':event.key==='End'?'running':state.pane==='finance'?'running':'finance';renderEditor();$('#'+state.pane+'-tab').focus();}});
$('#car-editor').addEventListener('input',event=>{
  const input=event.target;if(!input.matches('input[data-field]'))return;
  selectedCar()[input.dataset.field]=input.type==='number'?(Number.isFinite(input.valueAsNumber)?input.valueAsNumber:null):input.value;
  const loanZero=selectedCar().loanMode==='percent'?selectedCar().loanPercent===0:selectedCar().loanAmount===0;
  for(const k of ['years','rate'])if($('#car-'+k))$('#car-'+k).disabled=loanZero;
  renderOutputs();
});
$('#car-editor').addEventListener('change',event=>{
  const input=event.target;if(!input.matches('select[data-field]'))return;
  const c=selectedCar(),k=input.dataset.field,v=k==='ncd'?Number(input.value):input.value;
  if(k==='loanMode'&&v!==c.loanMode){if(v==='amount')c.loanAmount=typeof c.price==='number'&&typeof c.loanPercent==='number'?c.price*c.loanPercent/100:null;else c.loanPercent=typeof c.loanAmount==='number'&&c.price>0?c.loanAmount/c.price*100:null;}
  if(k==='efficiencyUnit'&&v!==c.efficiencyUnit&&c.efficiency>0)c.efficiency=100/c.efficiency;
  c[k]=v;renderEditor();$('#car-'+k)?.focus();
});
for(const k of ['salary','limit'])$('#'+k).addEventListener('input',event=>{state.budget[k]=Number.isFinite(event.target.valueAsNumber)?event.target.valueAsNumber:null;renderOutputs();});

function getComparison(){return { budget:{...state.budget}, cars:state.cars.map(c=>({id:c.id,name:c.name,inputs:{...c},result:calculateCar(c,state.budget)})) };}
function configureComparison(input) {
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['budget','cars'].includes(k)))throw new Error('Expected budget and/or cars.');
  const budget={...state.budget},cars=state.cars.map(c=>({...c}));
  if(input.budget){if(typeof input.budget!=='object'||Array.isArray(input.budget)||Object.keys(input.budget).some(k=>!['salary','limit'].includes(k)))throw new Error('Invalid budget fields.');Object.assign(budget,input.budget);if(Object.keys(validateBudget(budget)).length)throw new Error(Object.values(validateBudget(budget)).join(' '));}
  if(input.cars!==undefined){
    if(!Array.isArray(input.cars)||!input.cars.length||input.cars.length>6)throw new Error('Provide 1–6 car updates.');
    const ids=new Set();
    for(const patch of input.cars){
      if(!patch||typeof patch!=='object'||Object.keys(patch).some(k=>!['id','values'].includes(k))||!patch.values||typeof patch.values!=='object'||Array.isArray(patch.values))throw new Error('Each car update needs an id and values.');
      const car=cars.find(c=>c.id===patch.id);if(!car||ids.has(patch.id))throw new Error('Use each existing car id at most once.');ids.add(patch.id);
      if(Object.keys(patch.values).some(k=>k==='id'||!(k in car)))throw new Error('Unknown car input.');
      Object.assign(car,patch.values);const errors=validateCar(car);if(Object.keys(errors).length)throw new Error(Object.values(errors).join(' '));
    }
  }
  state.budget=budget;state.cars=cars;$('#salary').value=budget.salary;$('#limit').value=budget.limit;renderEditor();announce('Comparison updated.');return getComparison();
}
renderEditor();

if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  const carSchema={type:'object',properties:{id:{type:'string'},values:{type:'object',properties:{name:{type:'string',maxLength:60},price:{type:'number',exclusiveMinimum:0},loanMode:{type:'string',enum:['percent','amount']},loanPercent:{type:'number',minimum:0,maximum:100},loanAmount:{type:'number',minimum:0},rateType:{type:'string',enum:['flat','reducing','effective']},rate:{type:'number',minimum:0,maximum:100},years:{type:'number',minimum:1,maximum:9},distance:{type:'number',minimum:0},efficiencyUnit:{type:'string',enum:['kmL','L100']},efficiency:{type:'number',exclusiveMinimum:0},fuelPrice:{type:'number',minimum:0},insuranceMode:{type:'string',enum:['final','base']},insurance:{type:'number',minimum:0},ncd:{type:'number',minimum:0,maximum:55},insuranceExtras:{type:'number',minimum:0},roadTax:{type:'number',minimum:0},maintenance:{type:'number',minimum:0},parking:{type:'number',minimum:0},tolls:{type:'number',minimum:0},other:{type:'number',minimum:0}},additionalProperties:false}},required:['id','values'],additionalProperties:false};
  for(const tool of [
    {name:'get_car_comparison',title:'Read car costs',description:'Read the current car inputs, calculated financing and running costs, and salary-based affordability.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>getComparison()},
    {name:'configure_car_comparison',title:'Update comparison inputs',description:'Update the salary, budget limit and inputs for existing cars, then recalculate the visible comparison. Use the loan method matching the quote.',inputSchema:{type:'object',properties:{budget:{type:'object',properties:{salary:{type:'number',exclusiveMinimum:0},limit:{type:'number',exclusiveMinimum:0,maximum:100}},additionalProperties:false},cars:{type:'array',minItems:1,maxItems:6,items:carSchema}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:configureComparison}
  ]){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
}
