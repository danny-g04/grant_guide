// Connect to the Database here
// This is my server using javascript
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


//sets up sessions
app.use(session({
  secret: 'supersecretstring',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

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
  const { name, role, salary_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (!req.session.user_id)
    return res.status(401).json({ ok: false, error: 'Log in to start grant' });  //user isn't logged in
  else {

    const sql = 'INSERT INTO faculty (name, role, salary_id) VALUES (?, ?, ?)';

    db.query(sql, [name, role, salary_id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        ok: true,
        faculty_id: result.insertId,
        name
      });
    });
  }
});

app.post('/students', (req, res) => {
  const { name, residency_status, salary_id, tuition_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  if (!req.session.user_id)
    return res.status(401).json({ ok: false, error: 'Log in to start grant' });  //user isn't logged in
  else {
    const sql = 'INSERT INTO students (name, residency_status, salary_id, tuition_id) VALUES (?, ?, ?, ?)';

    db.query(sql, [name, residency_status, salary_id, tuition_id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        ok: true,
        student_id: result.insertId,
        name,
        residency_status
      });
    });
  }
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
  const { name, email, password, passwordConfirm } = req.body;   //stores the info from frontend

  let error = [];
  if (!name || !email || !password || !passwordConfirm)
    error.push("All fields are required");
  else {
    if (password.length < 8)
      error.push("Password needs to be at least 8 characters long");
    if (password != passwordConfirm)
      error.push("Passwords do not match");

    //checks to see if a user already has the same email
    let sql = 'SELECT email FROM users where email = ?';
    let rows = await query(sql, [email]); //returns how many rows it found in the db if sql is insert
    if (rows.length > 0)
      error.push("This email is already in use");
  }
  //sends error array to frontend to display
  if (error.length > 0) {
    res.status(400).json({ ok: false, error })
    //insert into db if no errors
  } else {
    try {   //try sees if the insert fails or not. 
      let hashPass = await bcrypt.hash(password, 10);
      sql = 'INSERT INTO users (name, email, password) VALUES (?,?,?)';
      await query(sql, [name, email, hashPass]);
      res.status(201).json({ ok: true, name });   //201 is successful creation operations
    } catch (err) {
      console.error(err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  };
});

//user login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  //queries the db to see if the email exists
  let sql = 'SELECT * FROM users where email = ?';
  let rows = await query(sql, [email]);

  let error = [];
  if (!email || !password)
    error.push("All fields are required");
  else {
    if (rows.length == 0)       //checks to see if a user is in the db already
      error.push("Email does not exist");
    else {                      //if user exists, check if hash password is same as in db
      let validPass = await bcrypt.compare(password, rows[0].password);
      if (!validPass)
        error.push("Wrong password");
    }
  }
  //sends error array to frontend to display
  if (error.length > 0)
    res.status(400).json({ ok: false, error });
  else {
    req.session.name = rows[0].name;
    req.session.user_id = rows[0].user_id;
    res.status(200).json({ ok: true, name: req.session.name }); //200 is for successful operations
  }
});

//checks to see if the user is logged in
app.get('/session', (req, res) => {
  if (req.session.name)
    res.json({ loggedIn: true, name: req.session.name });
  else
    res.json({ loggedIn: false });
});


//destroy session when user logs out
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ ok: false, error: 'Failed to log out' });
    }
    // Session successfully destroyed
    res.json({ ok: true });
  });
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


// Have to have the members and budget be added to database at the end because we dont get the budget id until the last step
app.post('/save-draft', (req, res) => {
  const { title, budget_cost, facultyIDs, studentIDs } = req.body;

  // get budget stuff. 
  db.query(
    'INSERT INTO budgets (title, total_amount) VALUES (?,?)',
    [title, budget_cost],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      const budget_id = result.insertId;

      // fill the members table for faculty member
      for (let i = 0; i < facultyIDs.length; i++) {
        const fid = facultyIDs[i];
        db.query(
          'INSERT INTO members (user_id, budget_id, member_type, people_id) VALUES (?, ?, "faculty", ?)',
          [req.session.user_id, budget_id, fid]
        );
      }

      // fills the members table for students
      for (let i = 0; i < studentIDs.length; i++) {
        const sid = studentIDs[i];
        db.query(
          'INSERT INTO members (user_id, budget_id, member_type, people_id) VALUES (?, ?, "student", ?)',
          [req.session.user_id, budget_id, sid]
        );
      }

      // 
      res.json({ ok: true, budget_id });
    }
  );
});


// Start the server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)); // Should be on localhost3000
