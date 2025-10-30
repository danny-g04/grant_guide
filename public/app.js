const API = 'http://localhost:3000';

async function getJSON(url) { // async is is so the page doesn't freeze while fetching stuff
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

// need to understand inner html a little bit better

// In-memory selections
const state = {
  faculty: [],
  students: [],
  travelProfiles: [],
  people: [], // {name, role, effort, base, fringe}
  travelLines: [], // {type, trips, days, airfare, perDiem, lodging}
  faRate: 0.50
};


//-------------------------FUNCTIONS----------------------------------\\
async function loadRefs() {
    const [fac, stu, trv] = await Promise.all([ // loads everything at the same time
      getJSON(`${API}/faculty`), // gets data for all of these for the render functions
      getJSON(`${API}/students`),        // now returns salary + fringe_rate
      getJSON(`${API}/travel-profiles`)
    ]);
  
    state.faculty = fac;
    state.students = stu;
    state.travelProfiles = trv;
  

  // Populate PI and Co-PI selects
  const pi = document.getElementById('pi'); // finds the ID in the html file 
  const co = document.getElementById('coPis');
  pi.innerHTML = fac.map(f=>`<option value="${f.faculty_id}">${f.name} (${f.role})</option>`).join(''); // fills in the options here
  co.innerHTML = fac.filter(f=>f.role!=='PI').map(f=>`<option value="${f.faculty_id}">${f.name} (${f.role})</option>`).join(''); // concatenates

  // Build Step 3 rows (note: students now have salary/fringe_rate)
  state.people = [
    ...fac.map(f => ({
      name:   f.name,
      role:   f.role,
      effort: 0,
      base:   Number(f.salary) || 0,
      fringe: Number(f.fringe_rate) || 0
    })),
    ...stu.map(s => ({
      name:   s.name,
      role:   'Student',
      effort: 0,
      base:   Number(s.salary ?? s.base ?? 0) || 0, 
      fringe: Number(s.fringe_rate ?? 0) || 0
    }))
  ];

  renderPeople();

  // Inserts trip types travel buttons
  const tp = document.getElementById('travelProfiles');
  tp.innerHTML = trv.map(t =>
  `<label><input type="radio" name="tprof" value="${t.id}"> ${t.trip_type}</label>`
).join(`<br>`);

} 

//Step 3, creates a table of all the people in the database and allows user to modify their numbers
function renderPeople() { 
  const tbody = document.getElementById('peopleBody');
  tbody.innerHTML = state.people.map((p,i)=>`
    <tr>
      <td>${p.name}</td>
      <td>${p.role}</td>
      <td><input type="number" min="0" max="${p.role==='Student'?50:100}" step="1" value="${p.effort}"
                 data-idx="${i}" class="effort"></td>
      <td>${fmt(p.base)}</td>
      <td>${(p.fringe*100).toFixed(1)}%</td>
    </tr>
  `).join('');

  // bind change handlers
  document.querySelectorAll('.effort').forEach(inp=>{
    inp.addEventListener('input', e=>{
      const i = +e.target.dataset.idx;
      let v = +e.target.value;
      if (state.people[i].role==='Student' && v>50) v=50; // enforce rule
      state.people[i].effort = v;
      e.target.value = v;
      calcTotals();
    });
  });
}


//Step 4, adds user input from travel section into array
function addTravelLine() {
  const selected = document.querySelector('input[name="tprof"]:checked');
  if (!selected) return alert('Pick a travel profile first');
  const prof = state.travelProfiles.find(p=>p.id==selected.value);
  const days = +document.getElementById('days').value;
  const people = +document.getElementById('numberpeople').value;

  state.travelLines.push({
    type: prof.trip_type, days, people,
    airfare: prof.airfare, perDiem: prof.per_diem, lodging: prof.lodging_caps
  });
  renderTravel();
  calcTotals();
}

//Step4, function calcuates trip total based on user input
function renderTravel() { 
  const tb = document.getElementById('travelBody');
  tb.innerHTML = state.travelLines.map(t=>{
    const TotalPerPerson= (+t.days * +t.perDiem) + (+t.days* +t.lodging) + +t.airfare;
    const TotalTrip = TotalPerPerson * +t.people;
    return `
    <tr>
      <td>${t.type}</td>
      <td>${t.days}</td>
      <td>${fmt(t.airfare)}</td>
      <td>${fmt(t.perDiem)}</td>
      <td>${fmt(t.lodging)}</td>
      <td>${fmt(TotalPerPerson)} </td>
      <td>${fmt(TotalTrip)}</td>
    </tr>
  `}).join('');
}

//Step 6, adds subawards if any
function subawards(){
  
}

//Step 7, calculates the total cost of everything
function calcTotals() { // need to seperate travel cost from f and A
    const n = x => Number(x) || 0;
  
    // salaries & fringe
    const salary = state.people.reduce((sum,p)=> sum + n(p.base)*(n(p.effort)/100), 0);
    const fringe = state.people.reduce((sum,p)=> {
      const sal = n(p.base)*(n(p.effort)/100);
      return sum + sal*n(p.fringe);
    }, 0);
  
    // travel (includes people multiplier)
    const travel = state.travelLines.reduce((sum,t)=>{
      const perTrip = n(t.airfare) + (n(t.perDiem)+n(t.lodging))*n(t.days);
      return sum + perTrip*n(t.trips||1)*n(t.people||1);
    }, 0);
  
    const tuition = 0; // Step 6 will add real tuition later
  
    const direct = salary + fringe + travel + tuition;
  
    // EXCLUDE travel from F&A base (common policy).
    const excludeTravelFromFA = true;
    const faBase = excludeTravelFromFA ? (direct - travel) : direct;
  
    const fa    = faBase * state.faRate;
    const total = direct + fa;
  
    document.getElementById('totals').innerHTML = `
      <p><strong>Direct Costs:</strong> ${fmt(direct)}</p>
      <p> Salary: ${fmt(salary)} | Fringe: ${fmt(fringe)} | Travel: ${fmt(travel)} | Tuition: ${fmt(tuition)}</p>
      <p><strong>F&A base:</strong> ${fmt(faBase)}  ${(state.faRate*100).toFixed(1)}%</p>
      <p><strong>F&A:</strong> ${fmt(fa)}</p>
      <p><strong>Total:</strong> ${fmt(total)}</p>
    `;
}

//Step 7, saves draft and draft name
function saveDraft() {
  const title = document.getElementById('title').value || 'Untitled Budget';
  const startYear = (document.getElementById('startDate').value || '2026-01-01').slice(0,4);

  fetch(`${API}/budgets`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ title, fa_rate: state.faRate, start_year: +startYear })
  })
  .then(r=>r.json())
  .then(j=>{
    if (j.ok) alert(`Saved! Budget ID = ${j.budget_id}`);
    else alert('Save failed: '+(j.error||'unknown'));
  })
  .catch(e=>alert('Save error: '+e.message));
}

//Step 7, exports it into an excel file
function exportXLSX() { 
    const rows = [
      ['Name','Role','Effort%','Base','Fringe%'],
      ...state.people.map(p=>[p.name,p.role,p.effort,p.base,(p.fringe*100).toFixed(1)]),
      [],
      ['TravelType','Trips','Days','Airfare','PerDiem','Lodging'],
      ...state.travelLines.map(t=>[t.type,t.trips,t.days,t.airfare,t.perDiem,t.lodging])
    ];
  
    // Convert to worksheet 
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Budget');
  
    // Trigger download as .xlsx
    XLSX.writeFile(wb, 'budget.xlsx');
  }
  

function fmt(n){ return `$${(n||0).toLocaleString(undefined,{maximumFractionDigits:2})}`; }

document.addEventListener('DOMContentLoaded', ()=>{
  loadRefs().then(calcTotals);

  document.getElementById('addTravel').addEventListener('click', addTravelLine);
  //document.getElementById('recalc').addEventListener('click', calcTotals);
  document.getElementById('save').addEventListener('click', saveDraft);
  document.getElementById('export').addEventListener('click', exportXLSX);
  document.getElementById('generate').addEventListener('click', generateFromPlan);
  
});
