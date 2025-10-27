const express = require('express');
const mysql = require('mysql2');
const cors = require('cors'); // Have to do this for node.js

const app = express();
app.use(cors());
app.use(express.json());

// Create a MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Don't know if this will let Danny use the code but we will see
  password: '', // didn't use a password you just hit enter
  database: 'budget_path' // 
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

// NEW (JOIN salary so the frontend gets numbers to show)
app.get('/students', (req, res) => {
    const sql = `
      SELECT s.student_id,
             s.name,
             s.residency_status,
             s.salary_id,
             sal.salary,         -- used by the UI as "base"
             sal.fringe_rate     -- used by the UI as "fringe"
      FROM students s
      LEFT JOIN salary sal ON sal.salary_id = s.salary_id
      ORDER BY s.student_id
    `;
    db.query(sql, (err, rows) => {
      if (err) {
        console.error('SQL error on /students:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });
  
  // FACULTY (join salary so UI gets numbers)
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
      if (err) {
        console.error('SQL error on /faculty:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });
  
  // TRAVEL PROFILES
  app.get('/travel-profiles', (req, res) => {
    db.query('SELECT id, trip_type, airfare, per_diem, lodging_caps FROM travel_profiles ORDER BY id',
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });
  
  // MINIMAL SAVE (one row in Budgets)
  app.post('/budgets', (req, res) => {
    const { title, fa_rate, start_year } = req.body;
    db.query('INSERT INTO budgets (title, fa_rate, start_year) VALUES (?,?,?)',
      [title, fa_rate, start_year],
      (err, result) => { // This is just for all of the errors
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok:true, budget_id: result.insertId });
      }
    );
  });  

// Start the server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)); // Should be on localhost3000
