const API = 'http://localhost:3000';

async function getJSON(url) { // async is is so the page doesn't freeze while fetching stuff
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

// Global variables
let budget_cost = 0;
let budget_len = 0;

// In-memory selections
const state = {
  faculty: [],
  students: [],
  travelProfiles: [],
  tuition_fee_schedules: [],
  people: [], // {name, role, effort, base, fringe}
  travelLines: [], // {type, trips, days, airfare, perDiem, lodging}
  subAwards: [],
  faRate: 0.50
};


//-------------------------FUNCTIONS----------------------------------\\

//Checks to see if user is logged in
async function session() {
  const response = await fetch('http://localhost:3000/session');
  const data = await response.json();
  const navbar = document.getElementById("navbar");

  if (data.loggedIn) {
    navbar.innerHTML = ` 
    <div class ="sameline">
      <p class ="spacing-text"> <strong>Welcome<Strong> <u>${data.name} </u> </p>
      <button id="logout" class="logout-btn"> Logout </button>
    </div>
    `;
    const logout = document.getElementById("logout");
    logout.addEventListener("click", async () => {
      const res = await fetch('http://localhost:3000/logout', { method: 'POST' });
      window.location.href = "login.html";
    }
    )
  }
}

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
  tuitionBody.innerHTML = '';
  stu.map(s => addTuitionRow(s));


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
  const role = document.getElementById('Role').value.trim();
  let salary_id = 4;
  let tuition_id = 1;
  let residency_status = "in_state";


  if(role !== "Student"){
    alert("Role must be set to Student before adding a student.")
    return;
  }

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

    const createdStudent = await res.json();

    if (!res.ok) {
      alert(createdStudent?.error || "Server error occurred");
      return;
    }

    if (!createdStudent.ok) {   //checks to see if the user is logged in to add people
      alert(`${createdStudent.error}`);
    } else {
      addTuitionRow(createdStudent);
      await loadRefs();
    }

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

  if(role === "Student"){
    alert("To add a student, click the Add Student button.");
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

    const data = await res.json();

    if (!res.ok) {
      alert(data?.error || "Server error occurred");
      return;
    }

    if (!data.ok)    //checks to see if the user is logged in to add people
      alert(`${data.error}`);
    else
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
                 data-idx="${i}" class="effort" style="min-width: 55px;" ></td>
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

// Step 4 - Tuition Fee Calculation
document.addEventListener('click', async function (event) {
  // Only run on Calculate button
  if (!event.target.classList.contains('saveTuition')) {
    return;
  }

  // Get table row
  const row = event.target.closest('tr');
  const studentId = row.getAttribute('data-student-id');
  const semester = row.querySelector('.semester').value;
  const residency = row.querySelector('.residency').value;

  try {
    // Fetch the tuition schedule from backend
    const res = await fetch('http://localhost:3000/tuition?semester=' + semester + '&residency=' + residency);
    const data = await res.json();

    // Calculate total tuition + fees
    const tuitionAmount = Number(data.tuition_semester);
    const feeAmount = Number(data.fee_semester);
    const totalCost = tuitionAmount + feeAmount;

    // Show in the UI
    row.querySelector('.tuitionCell').textContent = '$' + totalCost.toFixed(2);

    // Store in memory for Step 7 totals
    if (!state.tuitionLines) state.tuitionLines = []; // safety
    state.tuitionLines.push({
      studentId: studentId,
      semester: semester,
      residency: residency,
      tuition: tuitionAmount,
      fees: feeAmount,
      increaseRate: Number(data.annual_increase_semester),
      total: totalCost
    });

    // Recalculate totals
    calcTotals();

  } catch (error) {
    console.error(error);
    alert("Could not calculate tuition.");
  }
});

//Step 5 - Subawards, Allows user to add subaward amount
function addSubawards() {
  const box = document.getElementById("subawards");
  const subawardBody = document.getElementById("subawardBody");
  box.addEventListener("change", () => {
    if (box.checked) {
      //creates a form to enter amount when the box is checked
      subawardBody.innerHTML = `
      <form>
        <p> Enter Subaward amount: </p>
        <input type = "number" id = "subamount" placeholder ="Amount $" min=1>
        <button type="button" id="submit"> Add </button>
      </form>
      <h4 id="awardSum"> </h4>
      <div id="display_body"> </div>
      `;

      const submitbtn = document.getElementById("submit");

      submitbtn.addEventListener("click", () => {
        //Gets subaward amount from user and displays each on the card
        const value = Number(document.getElementById("subamount").value);
        const display = document.getElementById("display_body");
        state.subAwards.push(value);
        display.innerHTML = state.subAwards.map((award, i) => `<p class ="tight_text">Subaward ${i + 1}: ${fmt(award)} </p>`).join('');

        //Sums the total amount and displays it
        let total = state.subAwards.reduce((sum, curr) => sum + curr, 0);
        const sum = document.getElementById("awardSum");
        sum.innerHTML = `Subaward Total Amount: ${fmt(total)}`;
        calcTotals();
      })
    } else {
      //reset if nothing is clicked
      subawardBody.innerHTML = ``;
      state.subAwards = [];
      calcTotals();
    }
  })
}

//Step 6 - Year Planning, Allows user to select how long the budget will be
function planLength(salary, travel, tuition, subaward, fa, total) {
  const yearsSelect = document.getElementById("yearValue");
  const planningBody = document.getElementById("planningBody");

  budget_len = yearsSelect.value;
  //intailize the first row of the table
  adjustRows(Number(yearsSelect.value));

  //calls function to create a new table when a change happens
  yearsSelect.addEventListener("change", () => {
    let years = Number(yearsSelect.value);
    adjustRows(years);
  })

  //Function to update table everytime the user selects a new year
  function adjustRows(years) {
    //clears the table so old rows don't stack
    planningBody.innerHTML = ``;

    const rate = 0.03;

    for (let i = 0; i < years; i++) {
      const increasedTuition = tuition * Math.pow(1 + rate, i);

      const newTotal = salary + travel + increasedTuition + subaward + fa

      let row = document.createElement('tr');
      row.innerHTML =
        `<td> ${i + 1} </td>
         <td> ${fmt(salary)} </td>
         <td> ${fmt(travel)} </td>
         <td> ${fmt(increasedTuition)} </td>
         <td> ${fmt(subaward)} </td>
         <td> ${fmt(newTotal)} </td>`;

      //add a row for every year
      planningBody.appendChild(row);
    }
  }
}

function exportXLSX() {
  const rows = [];
  const boldRows = new Set();

  function addRow(row, bold = false) {
    const idx = rows.length;
    rows.push(row);
    if (bold) boldRows.add(idx + 1); // Excel is 1-indexed
  }


  addRow(["Title:", document.getElementById("title")?.value || ""], true);
  addRow(["Funding source:"]);
  addRow([]);


  addRow(["Personnel Compensation"], true);
  addRow(["Name", "Role", "Effort", "Salary", "Fringe"], true);

  let salaryTotal = 0;
  let fringeTotal = 0;

  state.people.forEach(p => {
    const salary = Number(p.base) * (Number(p.effort) / 100);
    const fringe = salary * (Number(p.fringe) / 100);
    salaryTotal += salary;
    fringeTotal += fringe;

    addRow([p.name, p.role, `${p.effort}%`, salary, fringe]);
  });

  addRow(["Personnel Subtotal", "", "", salaryTotal, fringeTotal], true);
  addRow([]);

  addRow(["Travel"], true);
  addRow(["Type", "People", "Days", "Description", "Total"], true);

  let travelTotal = 0;

  state.travelLines.forEach(t => {
    const airfare = Number(t.airfare);
    const perDiem = Number(t.perDiem);
    const lodging = Number(t.lodging);
    const days = Number(t.days);
    const people = Number(t.people);

    const perPerson = airfare + (perDiem + lodging) * days;
    const total = perPerson * people;
    travelTotal += total;

    addRow([
      t.type,
      people,
      days,
      "Airfare + Per Diem + Lodging",
      total
    ]);
  });

  addRow(["Travel Subtotal", "", "", "", travelTotal], true);
  addRow([]);

  // ---------------- Tuition ----------------
  addRow(["Graduate Student Tuition & Fees"], true);
  addRow(["Student", "Semester", "Residency", "", "Amount"], true);

  let tuitionTotal = 0;
  (state.tuitionLines || []).forEach(t => {
    tuitionTotal += Number(t.total);
    addRow([t.studentId, t.semester, t.residency, "", t.total]);
  });

  addRow(["Tuition Subtotal", "", "", "", tuitionTotal], true);
  addRow([]);

  // ---------------- Subawards ----------------
  addRow(["Consortia / Subawards"], true);

  let subawardTotal = 0;
  state.subAwards.forEach((amt, i) => {
    subawardTotal += Number(amt);
    addRow([`Subaward ${i + 1}`, "", "", "", amt]);
  });

  addRow(["Subaward Subtotal", "", "", "", subawardTotal], true);
  addRow([]);

  // ---------------- Totals ----------------
  const direct =
    salaryTotal + fringeTotal + travelTotal + tuitionTotal + subawardTotal;
  const faBase = salaryTotal + fringeTotal;
  const fa = faBase * state.faRate;
  const totalProject = direct + fa;

  addRow(["Total Direct Costs", "", "", "", direct], true);
  addRow([`Indirect Costs (${(state.faRate * 100).toFixed(1)}%)`, "", "", "", fa], true);
  addRow(["Total Project Cost", "", "", "", totalProject], true);
  addRow([]);

  // 5 year planning
  addRow(["5-Year Budget Planning"], true);
  addRow(["Year", "Salary", "Travel", "Tuition", "Subawards", "Total"], true);

  const years = Number(document.getElementById("yearValue")?.value || 1);
  const tuitionRate = 0.03;

  for (let i = 0; i < years; i++) {
    const yrTuition = tuitionTotal * Math.pow(1 + tuitionRate, i);
    const yrTotal =
      salaryTotal + fringeTotal + travelTotal + yrTuition + subawardTotal;

    addRow([
      i + 1,
      salaryTotal + fringeTotal,
      travelTotal,
      yrTuition,
      subawardTotal,
      yrTotal
    ]);
  }

 
  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws["!cols"] = [
    { wch: 28 },
    { wch: 14 },
    { wch: 12 },
    { wch: 30 },
    { wch: 14 },
    { wch: 14 }
  ];

  // Bold headers
  boldRows.forEach(r => {
    for (let c = 0; c < 6; c++) {
      const cell = XLSX.utils.encode_cell({ r: r - 1, c });
      if (!ws[cell]) continue;
      ws[cell].s = { font: { bold: true } };
    }
  });


  for (const cell in ws) {
    if (!cell.match(/^[EF]\d+$/)) continue;
    if (typeof ws[cell]?.v === "number") {
      ws[cell].z = "$#,##0.00";
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Budget");
  XLSX.writeFile(wb, "Grant_Budget.xlsx");
}

//Step 7 - Review Budget, Gets total from all the different categories and adds it together
function calcTotals() { // need to seperate travel cost from f and A
  const n = x => Number(x) || 0;

  // salaries & fringe
  const salary = state.people.reduce((sum, p) => sum + n(p.base) * (n(p.effort) / 100), 0);
  const fringe = state.people.reduce((sum, p) => {
    const sal = n(p.base) * (n(p.effort) / 10000);
    return sum + sal * n(p.fringe);
  }, 0);

  // travel (includes people multiplier)
  const travel = state.travelLines.reduce((sum, t) => {
    const perTrip = n(t.airfare) + (n(t.perDiem) + n(t.lodging)) * n(t.days);
    return sum + perTrip * n(t.trips || 1) * n(t.people || 1);
  }, 0);

  let tuition = 0;
  if (state.tuitionLines && state.tuitionLines.length > 0) {
    for (let i = 0; i < state.tuitionLines.length; i++) {
      tuition += state.tuitionLines[i].total;
    }
  }


  // Step 5 is adding subaward amount
  const subaward = state.subAwards.reduce((sum, curr) => sum + curr, 0);

  const direct = salary + fringe + travel + tuition + subaward;

  // EXCLUDE travel from F&A base (common policy).
  const excludeTravelFromFA = true;
  const faBase = excludeTravelFromFA ? (direct - travel - tuition - subaward) : direct;

  const fa = faBase * state.faRate;
  budget_cost = direct + fa;

  document.getElementById('totals').innerHTML = `
      <p><strong>Direct Costs:</strong> ${fmt(direct)}</p>
      <p> Salary: ${fmt(salary)} | Fringe: ${fmt(fringe)} | Travel: ${fmt(travel)} | Tuition: ${fmt(tuition)}| Subaward: ${fmt(subaward)}</p>
      <p><strong>F&A base:</strong> ${fmt(faBase)}  ${(state.faRate * 100).toFixed(1)}%</p>
      <p><strong>F&A:</strong> ${fmt(fa)}</p>
      <p><strong>Total:</strong> ${fmt(budget_cost)}</p>
    `;

  planLength(salary + fringe, travel, tuition, subaward, fa, budget_cost);
}

//Step 7 - saves the budget
async function saveDraft() {
  const title = document.getElementById('title').value;

  // get the fac and srudent ids from the post
  const facultyIDs = state.faculty.map(f => f.faculty_id);
  const studentIDs = state.students.map(s => s.student_id);

  try {
    const res = await fetch(`${API}/save-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // everything for budget
        title,
        budget_cost,
        budget_len,
        // extra stuff for members
        facultyIDs,
        studentIDs
      })
    });

    // Handle errors if no result
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || res.statusText);
    }

    const response = await res.json();

    alert(`Grant Saved`);

  } catch (e) {
    alert('Error with saving the Grant: ' + e.message);
  }
}
function fmt(n) { return `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`; }

document.addEventListener('DOMContentLoaded', () => {
  addSubawards();
  planLength();
  loadRefs().then(calcTotals);
  document.getElementById('addTravel').addEventListener('click', addTravelLine);
  //document.getElementById('recalc').addEventListener('click', calcTotals);
  document.getElementById('save').addEventListener('click', saveDraft);
  document.getElementById('export').addEventListener('click', exportXLSX);
  document.getElementById('generate').addEventListener('click', generateFromPlan);
});
document.addEventListener('DOMContentLoaded', session);