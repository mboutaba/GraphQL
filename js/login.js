
let  submit  = document.getElementById("btn");

submit.addEventListener("click", async function () {
  const identifier = document.getElementById("identifier").value;
  const password = document.getElementById("password").value;
  const errorMsg = document.getElementById("errorMsg");
  errorMsg.textContent = "";

  if (!identifier || !password) {
    errorMsg.textContent = "Please enter both fields.";
    return;
  }

  const credentials = btoa(`${identifier}:${password}`);

  try {
    const response = await fetch("https://learn.zone01oujda.ma/api/auth/signin", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      errorMsg.textContent = "Invalid credentials.";
      return;
    }

    const token = await response.json();

    if (!token) {
      errorMsg.textContent = "Failed to retrieve token.";
      return;
    }

    localStorage.setItem("jwt", token); 

    
    window.location.href = "home.html";

  } catch (err) {
    console.error(err);
    errorMsg.textContent = "Something went wrong!";
  }
});
