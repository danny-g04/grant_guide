async function login() {
    const submit = document.getElementById("submit");
    submit.addEventListener("click", async (e) => {
        e.preventDefault();     //prevents page from reloading when submitting so it can display messages from backend

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        //sends input results to the backend
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        //the info sent had errors and couldn't insert into db
        const data = await response.json();
        const errBody = document.getElementById("errBody");
        //prints out error messages from the backend
        if (!response.ok) {
            errBody.innerHTML = data.error.map((message) => `<div class ='alert alert-danger'> ${message} </div>`).join('');
        } else {
            // errBody.innerHTML = `
            //     <div class ='alert alert-success'>Logged in Successfully </div>`;
            window.location.href = "index.html";
        }
    });
};

document.addEventListener('DOMContentLoaded', login);

