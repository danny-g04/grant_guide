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

async function createGrants(){
    const API = 'http://localhost:3000';
    const grant_body = document.getElementById("grant-body");
    // Clear previous content
    grant_body.innerHTML = 'Loading your grants...';

    try {
        // 1. Fetch the list of grants for the logged-in user
        const response = await fetch(`${API}/my-grants`);
        const data = await response.json();

        if (response.status === 401) {
             // Not logged in
            grant_body.innerHTML = '<p>Please <a href="login.html">log in</a> to view your grants.</p>';
            return;
        }

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch grants.');
        }

        if (data.grants.length === 0) {
            grant_body.innerHTML = '<p>You have no saved grants. Go to the <a href="index.html">Budget Builder</a> to create one!</p>';
            return;
        }

        // Helper function to format currency
        function fmt(n) { return `$${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`; }

        // 2. Render the list of grants using the existing 'card' class
        grant_body.innerHTML = data.grants.map(grant => {
            // Format created_at to a readable date
            const createdAtDate = new Date(grant.created_at).toLocaleDateString();

            return `
                <div class="card">
                    <h3>${grant.title} (ID: ${grant.budget_id})</h3>
                    <p><strong>Total Amount:</strong> ${fmt(grant.total_amount)}</p>
                    <p><strong>Length:</strong> ${grant.length} years</p>
                    <p><strong>Members:</strong> ${grant.total_members}</p>
                    <p><strong>Created On:</strong> ${createdAtDate}</p>
                    <button class="details-btn" data-id="${grant.budget_id}">View Details</button>
                    <div id="details-${grant.budget_id}" class="grant-details-placeholder"></div>
                </div>
            `;
        }).join('');

        // 3. Attach event listeners for the new View Details buttons
        document.querySelectorAll('.details-btn').forEach(button => {
            button.addEventListener('click', () => {
                showGrantDetails(button.dataset.id);
            });
        });

    } catch (error) {
        console.error("Error fetching grants:", error);
        grant_body.innerHTML = `<p class="error">An error occurred while loading your grants: ${error.message}</p>`;
    }
}

// Function to fetch and display grant details
async function showGrantDetails(budget_id) {
    const API = 'http://localhost:3000';
    const detailPlaceholder = document.getElementById(`details-${budget_id}`);
    const detailButton = document.querySelector(`.details-btn[data-id="${budget_id}"]`);
    
    // Toggle functionality: If visible, hide it and change button text
    if (detailPlaceholder.style.display === 'block') {
        detailPlaceholder.style.display = 'none';
        detailButton.textContent = 'View Details';
        return;
    }
    
    // Show the placeholder and update button text
    detailPlaceholder.style.display = 'block';
    detailPlaceholder.innerHTML = 'Loading members...';
    detailButton.textContent = 'Hide Details';


    try {
        const response = await fetch(`${API}/budget-members/${budget_id}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch grant details.');
        }

        // Format and display the members list
        const membersList = data.members.map(member =>
            `<li>${member.name} (Role: ${member.role || member.member_type})</li>`
        ).join('');

        detailPlaceholder.innerHTML = `
            <div>
                <h4>Grant Members</h4>
                <ul>${membersList}</ul>
            </div>
        `;
    } catch (error) {
        console.error("Error fetching grant details:", error);
        detailPlaceholder.innerHTML = `<p style="color: red;">Error loading details: ${error.message}</p>`;
    }
}

// Check session and load grants on page load
document.addEventListener('DOMContentLoaded', () => {
    createGrants();
});

session();