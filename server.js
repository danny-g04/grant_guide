// Connect to the Database here
// This is my server using javascript
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create a MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Don't know if this will let Danny use the code but we will see
  password: '', // didn't use a password you just hit enter
  database: 'budget_path'
});

// Connect to MySQL
db.connect(err => {
  if (err) {
    console.error('Error connecting to MySQL:', err); // Connect first if not then we can't do anything. 
    return;
  }
  console.log('Connected to MySQL Database');
});

// Example route to test
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Actually query the database

app.post('/faculty', (req, res) => {
  const { name, role, salary_id, user_id, budget_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const sql = 'INSERT INTO faculty (name, role, salary_id) VALUES (?, ?, ?)';

  db.query(sql, [name, role, salary_id], (err, result) => {
    if(err){
      return res.status(500).json({ error: err.message });
    }

  // Insert into members right here
  // Grab the faculty ID 

  const newFacultyId = result.insertId;
  const memberSql = `INSERT INTO members (user_id, budget_id, member_type, people_id) Values (?, ?, 'faculty', ?)
  `;

  
  db.query(memberSql, [user_id, budget_id, newFacultyId], (err2) =>{
    if(err2){
       return res.status(500).json({error: err2.message})
    }
    res.status(201).json({
      ok: true,
      faculty_id: newFacultyId,
      name
      });
    });
  });
});

app.post('/students', (req, res) => {
  const { name, residency_status, salary_id, tuition_id, user_id, budget_id} = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const sql = 'INSERT INTO students (name, residency_status, salary_id, tuition_id) VALUES (?, ?, ?, ?)';

  db.query(sql, [name, residency_status, salary_id, tuition_id], (err, result) => {
    if (err) {
      return res.status(500).json({error: err.message });
    }

    // Insert into members here
    // And grab the studentID

    const newStudentId = result.insertId;
    const memberSql = `
      INSERT INTO members (user_id, budget_id, member_type, people_id) Values (?, ?, 'student', ?)
    `;

    db.query(memberSql, [user_id, budget_id, newStudentId], (err2) =>{
      if(err2){
        return res.status(500).json({error: err2.message})
      }

    res.status(201).json({ 
      ok: true, 
      student_id: newStudentId, name, 
      residency_status 
      });
    });
  });
});

//function to query db
function query(sql, param) {
  return new Promise((resolve, reject) => {
    db.query(sql, param, (err, result) => {
      if (err)
        return reject(err);
      resolve(result)
    })
  });
};

//adds users to db when they register
app.post('/register', async (req, res) => {     //async allows for await to be used since queries and hashing takes time
  const { name, email, password } = req.body;   //stores the info from frontend

  let error = [];
  if (!name || !email || !password)
    error.push("All fields are required");
  if (password.length < 8)
    error.push("Password needs to be at least 8 characters long");

  //checks to see if a user already has the same email
  let sql = 'SELECT email FROM users where email = ?';
  let rows = await query(sql, [email]);
  if (rows.length > 0)
    error.push("This email is already in use"); //returns how many rows it found in the db if sql is insert

  //sends error array to frontend to display
  if (error.length > 0) {
    res.status(400).json({ ok: false, error })
    //insert into db if no errors
  } else {
    try {   //try sees if the insert fails or not. 
      let hashPass = await bcrypt.hash(password, 10);
      sql = 'INSERT INTO users (name, email, password) VALUES (?,?,?)';
      await query(sql, [name, email, hashPass]);
      res.status(201).json({ ok: true, name });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  };
});

// Joins salary with the students table
app.get('/students', (req, res) => {
  const sql = `
      SELECT s.student_id,
             s.name,
             s.residency_status,
             s.salary_id,
             sal.salary,         
             sal.fringe_rate    
      FROM students s
      LEFT JOIN salary sal ON sal.salary_id = s.salary_id
      ORDER BY s.student_id
    `;
  db.query(sql, (err, rows) => {
    res.json(rows); // do I really need the json will dive deeper into this as we progress
  });
});

// Joins faculty with salary id
app.get('/faculty', (req, res) => {
  const sql = `
      SELECT f.faculty_id,
             f.name,
             f.role,
             s.salary,
             s.fringe_rate
      FROM faculty f
      JOIN salary s ON s.salary_id = f.salary_id
      ORDER BY f.name
    `;
  db.query(sql, (err, rows) => {
    res.json(rows);
  });
});

// Travel Profiles
app.get('/travel-profiles', (req, res) => {
  const sql = `
    SELECT id, 
      trip_type, 
      airfare, 
      per_diem, 
      lodging_caps 
    FROM travel_profiles 
    ORDER BY id
    `;
  db.query(sql, (err, rows) => {
    res.json(rows);
  });
});

app.get('/tuition', (req, res) => {
  const { semester, residency } = req.query;

  const sql = `
    SELECT tuition_semester,fee_semester 
    FROM tuition_fee_schedules 
    Where semester = ? AND residency_status = ? 
    `;
  db.query(sql, [semester, residency], (err, rows) => {
    res.json(rows[0]);
  });
});

// app.post is for actually changing the code through inserts and updates in the database
app.post('/budgets', (req, res) => {
  const { title, fa_rate, start_year } = req.body;
  db.query('INSERT INTO budgets (title, fa_rate, start_year) VALUES (?,?,?)',
    [title, fa_rate, start_year],
    (err, result) => { // This is just for all of the errors
      res.json({ ok: true, budget_id: result.insertId });
    }
  );
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)); // Should be on localhost3000
