var username;

// Vérifie si le JWT existe, sinon redirige vers le login
function getAuthHeader() {
  const jwt = localStorage.getItem("jwt");

  // Validation renforcée
  if (!jwt || typeof jwt !== "string") {
    console.error("JWT invalide ou manquant");
    localStorage.removeItem("jwt");
    window.location.href = "index.html";
    throw new Error("Session invalide");
  }

  // Nettoyage strict
  const cleanJwt = jwt.trim().replace(/['"]+/g, "");

  if (cleanJwt.split(".").length !== 3) {
    console.error("Format JWT invalide:", cleanJwt);
    localStorage.removeItem("jwt");
    window.location.href = "index.html";
    throw new Error("Token malformé");
  }

  return {
    Authorization: `Bearer ${cleanJwt}`,
    "Content-Type": "application/json",
  };
}



////////////////////////////////////////////////////////////////////////////////////////////
//////////                                   Logout                               /////////
//////////////////////////////////////////////////////////////////////////////////////////
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("jwt");
  window.location.href = "index.html";
});



////////////////////////////////////////////////////////////////////////////////////////////
//////////                    Fonction pour requêter GraphQL                      /////////
//////////////////////////////////////////////////////////////////////////////////////////
async function fetchGraphQL(query, variables = {}) {
  try {
    const headers = getAuthHeader();

    const response = await fetch(
      "https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
      }
    );

    const data = await response.json();

    if (data.errors) {
      const errorMessages = data.errors.map((e) => e.message).join(", ");
      if (errorMessages.includes("JWT")) {
        localStorage.removeItem("jwt");
        window.location.href = "index.html";
      }
      throw new Error(errorMessages);
    }

    return data;
  } catch (error) {
    console.error("Erreur fetchGraphQL:", error);
    throw error;
  }
}


////////////////////////////////////////////////////////////////////////////////////////////
//////////                        Charge les données du profil                    /////////
//////////////////////////////////////////////////////////////////////////////////////////
async function loadProfile() {
  try {
    // Vérifiez d'abord le JWT
    const jwt = localStorage.getItem("jwt");
    if (!jwt) {
      window.location.href = "index.html";
      return;
    }

    // 1. Récupère les infos utilisateur
    const userQuery = `
      query {
        user {
          firstName
          lastName
          login
          email
        }
      }`;
    const userData = await fetchGraphQL(userQuery);
    username = userData.data.user[0].login;
    displayUserInfo(userData);

    // 2. Récupère les données pour afficher le level
    const levelQuery = `
      query {
          transaction(
              where: {
                  _and: [
                      { type: { _eq: "level" } },
                      { event: { object: { name: { _eq: "Module" } } } }
                  ]
              },
              order_by: { amount: desc },
              limit: 1
          ) {
              amount
        }
    }`;

    const levelData = await fetchGraphQL(levelQuery);
    renderLevelInfo(levelData);

    // 3. Récupère les données pour afficher l'XP total
    const xpTotalQuery = `
      query {
        transaction_aggregate(
            where: {
                type: { _eq: "xp" }
                event: { object: { name: { _eq: "Module" } } }
            }
        ) {
        aggregate {
            sum {
                amount
            }
        }
        }
      }`;

    const xpTotalData = await fetchGraphQL(xpTotalQuery);
    renderXpAmount(xpTotalData);

    // 4. Récupère les données pour le graphique des skills
    const skillsQuery = `
      query {
        user {
          transactions(
            where: { type: { _nin: ["xp", "level", "up", "down"] } }
          ) {
            type
            amount
          }
        }
      }`;
    const skillsData = await fetchGraphQL(skillsQuery);
    renderSkillChart(skillsData);

    // 5. Récupère les données pour afficher les projets
    const projectsQuery = `
      query {
        user {
          transactions(
            where: {type: {_eq: "xp"}, event: {object: {name: {_eq: "Module"}}}}
              order_by: {createdAt: desc}
          ) {
          object {
            name
            progresses {
              group {
                members {
                  userLogin
                }
              }
            }
          }
          amount
          createdAt
        }
      }
    }`;
    const projectsData = await fetchGraphQL(projectsQuery);
    renderProjects(projectsData);

    // 6. Récupère les données pour le ratio des audits
    const auditQuery = `
      query {
        user {
          auditRatio
          audits_aggregate(where: { closureType: { _eq: succeeded } }) {
            aggregate {
            count
          }
        }
        failed_audits: audits_aggregate(where: { closureType: { _eq: failed } }) {
          aggregate {
          count
        }
      }
    }
  }`;
    const auditData = await fetchGraphQL(auditQuery);
    renderAuditChart(auditData);
  } catch (error) {
    console.error("Erreur:", error);
    alert(`Erreur: ${error.message}`);
  }
}


////////////////////////////////////////////////////////////////////////////////////////////
//////////                        Affiche les infos utilisateur                   /////////
//////////////////////////////////////////////////////////////////////////////////////////
function displayUserInfo(userData) {
  const container = document.getElementById("userInfo");

  // Vérification en profondeur
  if (!userData?.data?.user?.length) {
    container.innerHTML =
      '<div class="error">Aucune donnée utilisateur trouvée</div>';
    return;
  }

  const user = userData.data.user[0]; // Prenez le premier élément du tableau

  container.innerHTML = `
        <div class="info-card">
          <h3>Username : <span class="user-name">${user.login}</span></h3>
          <h3>FirstName : <span class="user-name">${user.firstName}</span></h3>
          <h3>LastName : <span class="user-name">${user.lastName}</span></h3>
          <h3>Email : <span class="user-name">${user.email}</span></h3>
        </div>
    `;
}


////////////////////////////////////////////////////////////////////////////////////////////
//////////                        Affiche le level de l'utilisateur              //////////
//////////////////////////////////////////////////////////////////////////////////////////
function renderLevelInfo(level) {
  const container = document.getElementById("level-info");

  if (!container) return;

  const levelAmount = level?.data?.transaction?.[0]?.amount ?? "N/A";

  container.innerHTML = `
    <h2 class="card-title">Current Level</h2>
    <div class="level-info-container">
        <span>${levelAmount}</span>
    </div>
    `;
}


////////////////////////////////////////////////////////////////////////////////////////////
//////////                     Affiche le XP total de l'utilisateur              //////////
//////////////////////////////////////////////////////////////////////////////////////////
function renderXpAmount(data) {
  const xpContainer = document.getElementById("xpAmount");
  xpContainer.innerHTML = "";

  // Vérification des données
  if (!data?.data?.transaction_aggregate?.aggregate?.sum?.amount) {
    xpContainer.innerHTML = `
      <h2 class="card-title">Total XP</h2>
      <div class="xp-text">
        <p class="xp-value">N/A</p>
      </div>
    `;
    return;
  }

  const amount = data.data.transaction_aggregate.aggregate.sum.amount;
  const xp = (amount / 1000).toFixed(2); // Format kXP avec une décimale

  xpContainer.innerHTML = `
    <h2 class="card-title">Total XP</h2>
    <div class="xp-text">
      <p class="xp-value">
        <span class="xp-number">0.00</span>
        <span class="xp-label">KB</span>
      </p>
    </div>
  `;

  // Animation "count-up"
  let count = 0;
  const target = parseFloat(xp);
  const duration = 1000; // ms
  const increment = target / (duration / 16); // approx. 60fps

  const counter = setInterval(() => {
    count += increment;
    if (count >= target) {
      count = target;
      clearInterval(counter);
    }
    xpContainer.querySelector(".xp-number").textContent = count.toFixed(2);
  }, 16);
}



////////////////////////////////////////////////////////////////////////////////////////////
//////////                             Graphique XP                              //////////
//////////////////////////////////////////////////////////////////////////////////////////
function renderSkillChart(data) {
  const svg = document.getElementById("xpChart");
  svg.innerHTML = "";

  if (!data?.data?.user?.[0]?.transactions) {
    svg.innerHTML =
      '<text x="50%" y="50%" text-anchor="middle">Aucune donnée Skill disponible</text>';
    return;
  }

  const transactions = data.data.user[0].transactions;

  // ✅ Garder uniquement la valeur maximale par skill
  const skillMaxValues = {};
  transactions.forEach((t) => {
    if (!t.type.startsWith("skill_")) return;

    const skillName = t.type.replace("skill_", "");
    skillMaxValues[skillName] = Math.max(
      skillMaxValues[skillName] || 0,
      t.amount
    );
  });

  const skills = Object.keys(skillMaxValues);
  const amounts = Object.values(skillMaxValues);
  const maxAmount = Math.max(...amounts);

  const chartHeight = 280;
  const barSpacing = 45;
  const barWidth = 30;

  svg.innerHTML += `
    <defs>
      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6e8efb" />
        <stop offset="100%" stop-color="#a777e3" />
      </linearGradient>
    </defs>
  `;

  skills.forEach((skill, i) => {
    const amount = skillMaxValues[skill];
    const barHeight = (amount / maxAmount) * 250;
    const x = i * barSpacing;

    svg.innerHTML += `
      <rect x="${x}" y="${
      chartHeight - barHeight
    }" width="${barWidth}" height="${barHeight}" fill="url(#barGradient)" rx="5" ry="5" opacity="0">
        <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="${
          i * 100
        }ms" fill="freeze" />
      </rect>
      <text x="${x + barWidth / 2}" y="${
      chartHeight - barHeight - 5
    }" font-size="10" fill="#fff" text-anchor="middle">${amount}%</text>
      <text x="${x + barWidth / 2}" y="${
      chartHeight + 15
    }" font-size="10" fill="#fff" text-anchor="middle">${skill}</text>
    `;
  });

  svg.setAttribute("width", skills.length * barSpacing);
  svg.setAttribute("height", 350);
}



////////////////////////////////////////////////////////////////////////////////////////////
//////////                            Projects done                              //////////
//////////////////////////////////////////////////////////////////////////////////////////
let currentPage = 0;
const projectsPerPage = 5;
let allProjects = [];

function renderProjects(data) {
  const projectsList = document.getElementById("projectsList");
  projectsList.innerHTML = "";

  if (!data?.data?.user?.[0]?.transactions?.length) {
    projectsList.innerHTML = '<p class="no-projects">Aucun projet trouvé</p>';
    return;
  }

  allProjects = data.data.user[0].transactions;
  currentPage = 0;
  loadMoreProjects();
}

async function loadMoreProjects() {
  const projectsList = document.getElementById("projectsList");
  const start = currentPage * projectsPerPage;
  const end = start + projectsPerPage;
  const projectsToShow = allProjects.slice(start, end);

  projectsToShow.forEach((project) => {
    const projectName = project.object?.name || "Projet sans nom";
    const rawAmount = project.amount || 0;
    const formattedAmount = (rawAmount / 1000).toFixed(2); // KB
    const createdAt = project.createdAt
      ? new Date(project.createdAt).toLocaleDateString("fr-FR")
      : "Date inconnue";

    let membersHtml = "";
    const progresses = project.object?.progresses || [];
    if (progresses.length > 0) {
      const members = progresses[0]?.group?.members || [];

      membersHtml = members
        .map(
          (member) =>
            `<span class="member-tag ${
              member.userLogin === username ? "you" : ""
            }">
          ${member.userLogin || "Membre inconnu"}
        </span>`
        )
        .join("");
    } else {
      membersHtml = "N/A";
    }

    const projectRow = document.createElement("div");
    projectRow.className = "project-row";
    projectRow.innerHTML = `
      <div class="project-name">${projectName}</div>
      <div class="project-xp">${formattedAmount} KB</div>
      <div class="project-date">${createdAt}</div>
      <div class="project-members">${membersHtml}</div>
    `;

    projectsList.appendChild(projectRow);
  });

  currentPage++;
}

// Détecter le scroll en bas pour charger plus
document.getElementById("projectsList").addEventListener("scroll", function () {
  const { scrollTop, scrollHeight, clientHeight } = this;
  if (scrollTop + clientHeight >= scrollHeight - 10) {
    if (currentPage * projectsPerPage < allProjects.length) {
      loadMoreProjects();
    }
  }
});


////////////////////////////////////////////////////////////////////////////////////////////
//////////                            Graphique Audit                            //////////
//////////////////////////////////////////////////////////////////////////////////////////
function renderAuditChart(data) {
  const svg = document.getElementById("auditChart");
  svg.innerHTML = "";

  // Vérification des données
  if (!data?.data?.user?.[0]) {
    svg.innerHTML =
      '<text x="50%" y="50%" text-anchor="middle">Données d\'audit indisponibles</text>';
    return;
  }

  const userData = data.data.user[0];
  const successCount = userData.audits_aggregate.aggregate.count;
  const failCount = userData.failed_audits.aggregate.count;
  const total = successCount + failCount;

  // Dimensions
  const width = 300;
  const height = 300;
  const radius = Math.min(width, height) / 2;
  const center = { x: width / 2, y: height / 2 };
  const innerRadius = radius * 0.6; // Pour créer le trou du donut

  // Données pour le donut
  const pieData = [
    { value: successCount, color: "#4CAF50", label: "Success" },
    { value: failCount, color: "#F44336", label: "Failed" },
  ];

  // Dessin du donut
  let cumulativeAngle = 0;
  pieData.forEach((slice) => {
    const sliceAngle = (slice.value / total) * 2 * Math.PI;

    const x1 = center.x + radius * Math.cos(cumulativeAngle);
    const y1 = center.y + radius * Math.sin(cumulativeAngle);
    const x2 = center.x + radius * Math.cos(cumulativeAngle + sliceAngle);
    const y2 = center.y + radius * Math.sin(cumulativeAngle + sliceAngle);

    const x3 = center.x + innerRadius * Math.cos(cumulativeAngle + sliceAngle);
    const y3 = center.y + innerRadius * Math.sin(cumulativeAngle + sliceAngle);
    const x4 = center.x + innerRadius * Math.cos(cumulativeAngle);
    const y4 = center.y + innerRadius * Math.sin(cumulativeAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const pathData = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", slice.color);
    svg.appendChild(path);

    cumulativeAngle += sliceAngle;
  });

  // Texte au centre (nombre total d'audits)
  const centerText = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );
  centerText.setAttribute("x", center.x);
  centerText.setAttribute("y", center.y);
  centerText.setAttribute("text-anchor", "middle");
  centerText.setAttribute("dominant-baseline", "middle");
  centerText.setAttribute("font-size", "20px");
  centerText.setAttribute("font-weight", "bold");
  centerText.setAttribute("fill", "white");
  centerText.textContent = `${total} Audits`;
  svg.appendChild(centerText);

  // Légende en dessous
  let legendY = height + 20;
  pieData.forEach((slice, i) => {
    // Carré de couleur
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", 80);
    rect.setAttribute("y", legendY + i * 20);
    rect.setAttribute("width", 10);
    rect.setAttribute("height", 10);
    rect.setAttribute("fill", slice.color);
    svg.appendChild(rect);

    // Texte de la légende
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", 100);
    text.setAttribute("y", legendY + i * 20 + 9);
    text.setAttribute("font-size", "12px");
    text.setAttribute("fill", "white");
    text.textContent = `${slice.label} (${slice.value} - ${(
      (slice.value / total) *
      100
    ).toFixed(1)}%)`;
    svg.appendChild(text);
  });

  // Ajustement hauteur du SVG
  svg.setAttribute("width", width);
  svg.setAttribute("height", height + 60);
}

// Charge les données au chargement de la page
window.addEventListener("DOMContentLoaded", loadProfile);