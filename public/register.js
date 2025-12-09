async function getInfo() {
    const submit = document.getElementById("submit");
    submit.addEventListener("click", async (e) => {
        e.preventDefault();     //prevents page from reloading when submitting so it can display messages from backend

        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const passwordConfirm = document.getElementById("passwordConfirm").value;

        //sends input results to the backend
        const response = await fetch('http://localhost:3000/register', {  
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, passwordConfirm })
        });

        //the info sent had errors and couldn't insert into db
        const data = await response.json();
        const errBody = document.getElementById("errBody");
        //prints out error messages from the backend
        if(!response.ok){
            errBody.innerHTML= data.error.map((message)=>`<div class ='alert alert-danger'> ${message} </div>` ).join('');
        } else{
            const form = document.getElementById("formBody");
            form.reset();
            errBody.innerHTML =`
                <div class ='alert alert-success'>Registered Successfully </div>`;
        }
    });
};

document.addEventListener('DOMContentLoaded', getInfo);

