const API = 'http://localhost:3000';

async function getJSON(url) { // async is is so the page doesn't freeze while fetching stuff
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}


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



  state.people = [
    ...fac.map(f => ({
      name: f.name,
      role: f.role,
      effort: 0,
      base: Number(f.salary) || 0,
      fringe: Number(f.fringe_rate) || 0
    })),
    ...stu.map(s => ({
      name: s.name,
      role: 'Student',
      effort: 0,
      base: Number(s.salary ?? s.base ?? 0) || 0,
      fringe: Number(s.fringe_rate ?? 0) || 0
    }))
  ];

  renderPeople();
  tuitionBody.innerHTML='';
  stu. map(s => addTuitionRow(s));


  //Step 3 - Travel, Creates destination buttons
  const tp = document.getElementById('travelProfiles');
  tp.innerHTML = trv.map(t =>
    `<label><input type="radio" name="tprof" value="${t.id}">
   ${t.trip_type}</label>`
  ).join(`<br>`);

}

//Step 1 - Users, letting users add students into the DB
document.getElementById('addStudent').addEventListener('click', async () => {
  const name = document.getElementById('Name').value.trim();
  let salary_id = 4;
  let tuition_id = 1;
  let residency_status = "in_state";

console.log({ name, residency_status, salary_id, tuition_id });

  if (!name) {
    alert('Please enter a name');
    return;
  }
  try {
    const res = await fetch('http://localhost:3000/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, residency_status, salary_id, tuition_id })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || res.statusText);
    }
    const createdStudent = await res.json();
    addTuitionRow(createdStudent);
    await loadRefs();

  } catch (err) {
    console.error(err);
  }


});

//Step 1 - Users, letting users create faculty/staff into DB
document.getElementById('addFaculty').addEventListener('click', async () => {
  const name = document.getElementById('Name').value.trim();
  const role = document.getElementById('Role').value.trim();
  if (!name) {
    alert('Please enter a name');
    return;
  }
  let salary_id;
  if (role == "PI") {
    salary_id = 1;
  } else if (role == "Co-PI") {
    salary_id = 2;
  } else {
    salary_id = 3;
  }

  try {
    const res = await fetch('http://localhost:3000/faculty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, salary_id })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || res.statusText);
    }

    await loadRefs();
  } catch (err) {
    console.error(err);
  }
});


//Step 2 - Personal and Students, Allows user to adjust effort % of each faculty/student
function renderPeople() { // This just shows the people on the page
  const tbody = document.getElementById('peopleBody');
  tbody.innerHTML = state.people.map((p, i) => `
    <tr>
      <td>${p.name}</td>
      <td>${p.role}</td>
      <td><input type="number" min="0" max="${p.role === 'Student' ? 50 : 100}" step="1" value="${p.effort}"
                 data-idx="${i}" class="effort"></td>
      <td>${fmt(p.base)}</td>
      <td>${(p.fringe).toFixed(1)}%</td>
    </tr>
  `).join('');

  // bind change handlers
  document.querySelectorAll('.effort').forEach(inp => {
    inp.addEventListener('input', e => {
      const i = +e.target.dataset.idx;
      let v = +e.target.value;
      if (state.people[i].role === 'Student' && v > 50) v = 50; // enforce rule
      state.people[i].effort = v;
      e.target.value = v;
      calcTotals();
    });
  });
}


//Step 3 - Travel, Stores the travel information inputted by user
function addTravelLine() {
  const selected = document.querySelector('input[name="tprof"]:checked');
  if (!selected) return alert('Pick a travel profile first');
  const prof = state.travelProfiles.find(p => p.id == selected.value);
  const days = +document.getElementById('days').value;
  const people = +document.getElementById('numberpeople').value;
  const trips = 1;

  state.travelLines.push({
    type: prof.trip_type, trips, days, people,
    airfare: prof.airfare, perDiem: prof.per_diem, lodging: prof.lodging_caps
  });
  renderTravel();
  calcTotals();
}

//Step 3 - Travel, Calculates cost of the trip based on user input (#days, #people, dom/int)
function renderTravel() { // this just shows the travel on the page
  const tb = document.getElementById('travelBody');
  tb.innerHTML = state.travelLines.map(t => {
    const TotalPerPerson = (+t.days * +t.perDiem) + (+t.days * +t.lodging) + +t.airfare;
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

//Step 4 - Tuition and Fees, automatically adds student into step 4 when created
function addTuitionRow(createdStudent) {
  const tbody = document.getElementById('tuitionBody');
  const tr = document.createElement('tr');
  tr.dataset.studentId = createdStudent.student_id;

  tr.innerHTML = `
  <td>${createdStudent.name}</td>
  <td>
    <select class="semester">
      <option value="fall">Fall</option>
      <option value="spring">Spring</option>
      <option value="summer">Summer</option>
    </select>
  </td>
  <td>
    <select class="residency">
      <option value="in_state" ${createdStudent.residency_status === 'in_state' ? 'selected' : ''}>In-State</option>
      <option value="out_state" ${createdStudent.residency_status === 'out_state' ? 'selected' : ''}>Out-of-State</option>
    </select>
    </td>
    <td>
      <button class="saveTuition">Calculate</button>
    </td>
    <td class="tuitionCell">—</td>
  `;

  tbody.appendChild(tr);
}

//Step 5 - Subawards, Allows user to add subaward amount
function addSubawards(){

}


//Step 7 - Review Budget, Gets total from all the different categories and adds it together
function calcTotals() { // need to seperate travel cost from f and A
  const n = x => Number(x) || 0;

  // salaries & fringe
  const salary = state.people.reduce((sum, p) => sum + n(p.base) * (n(p.effort) / 100), 0);
  const fringe = state.people.reduce((sum, p) => {
    const sal = n(p.base) * (n(p.effort)/10000);
    return sum + sal * n(p.fringe);
  }, 0);

  // travel (includes people multiplier)
  const travel = state.travelLines.reduce((sum, t) => {
    const perTrip = n(t.airfare) + (n(t.perDiem) + n(t.lodging)) * n(t.days);
    return sum + perTrip * n(t.trips || 1) * n(t.people || 1);
  }, 0);

  const tuition = 0; // Step 6 will add real tuition later

  const direct = salary + fringe + travel + tuition;

  // EXCLUDE travel from F&A base (common policy). Flip to false if your policy differs.
  const excludeTravelFromFA = true;
  const faBase = excludeTravelFromFA ? (direct - travel) : direct;

  const fa = faBase * state.faRate;
  const total = direct + fa;

  document.getElementById('totals').innerHTML = `
      <p><strong>Direct Costs:</strong> ${fmt(direct)}</p>
      <p> Salary: ${fmt(salary)} | Fringe: ${fmt(fringe)} | Travel: ${fmt(travel)} | Tuition: ${fmt(tuition)}</p>
      <p><strong>F&A base:</strong> ${fmt(faBase)}  ${(state.faRate * 100).toFixed(1)}%</p>
      <p><strong>F&A:</strong> ${fmt(fa)}</p>
      <p><strong>Total:</strong> ${fmt(total)}</p>
    `;
}

//Step 7 - Review Budget, Creates budget with name and ID
function saveDraft() {
  const title = document.getElementById('title').value || 'Untitled Budget';
  const startYear = (document.getElementById('startDate').value || '2026-01-01').slice(0, 4);

  fetch(`${API}/budgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, fa_rate: state.faRate, start_year: +startYear })
  })
    .then(r => r.json())
    .then(j => {
      if (j.ok) alert(`Saved! Budget ID = ${j.budget_id}`);
      else alert('Save failed: ' + (j.error || 'unknown'));
    })
    .catch(e => alert('Save error: ' + e.message));
}

//Step 7 - Review Budget, Creates and stores data into Excel sheet
function exportXLSX() { // for the excel file

  const rows = [
    ['Name', 'Role', 'Effort%', 'Base', 'Fringe%'],
    ...state.people.map(p => [p.name, p.role, p.effort, p.base, (p.fringe).toFixed(1)]),
    [],
    ['TravelType', 'Trips', 'Days', 'Airfare', 'PerDiem', 'Lodging'],
    ...state.travelLines.map(t => [t.type, t.trips, t.days, t.airfare, t.perDiem, t.lodging])
  ];

  // Convert to worksheet 
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Budget');

  // Trigger download as .xlsx
  XLSX.writeFile(wb, 'budget.xlsx');
}

function fmt(n) { return `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }

document.addEventListener('DOMContentLoaded', () => {
  loadRefs().then(calcTotals);

  document.getElementById('addTravel').addEventListener('click', addTravelLine);
  //document.getElementById('recalc').addEventListener('click', calcTotals);
  document.getElementById('save').addEventListener('click', saveDraft);
  document.getElementById('export').addEventListener('click', exportXLSX);
  document.getElementById('generate').addEventListener('click', generateFromPlan);

});