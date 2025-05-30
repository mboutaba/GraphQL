

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function logout() {

  window.location.href = "login.html";

  localStorage.removeItem("jwt");

}

function createSlice(startAngle, endAngle, color) {
  // Convert angles to radians
  const startRad = (startAngle - 90) * Math.PI / 180;
  const endRad = (endAngle - 90) * Math.PI / 180;

  // Calculate coordinates
  const x1 = 50 + 50 * Math.cos(startRad);
  const y1 = 50 + 50 * Math.sin(startRad);
  const x2 = 50 + 50 * Math.cos(endRad);
  const y2 = 50 + 50 * Math.sin(endRad);

  // Determine if this is a large arc (angles > 180 degrees)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  // Create the path data
  const pathData = [
    `M 50 50`,
    `L ${x1} ${y1}`,
    `A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2}`,
    `Z`
  ].join(' ');

  // Create the path element
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData);
  path.setAttribute('fill', color);
  return path;
}





function createPieChart(passedPercent, failedPercent) {

 
    

  const svg = document.getElementById('auditPieChart');
  svg.innerHTML = ''; // Clear any existing content

  let passedCount = passedPercent
  let failedCount = failedPercent
  // Ensure percentages add up to 100
  const total = passedPercent + failedPercent;

  if (total !== 100) {
    passedPercent = (passedPercent / total) * 100;
    failedPercent = (failedPercent / total) * 100;
  }

  // Update the legend text
  document.getElementById('passedPercent').textContent = passedPercent.toFixed(1) + "% / " +  passedCount ;
  document.getElementById('failedPercent').textContent = failedPercent.toFixed(1)  + "% / " + failedCount  ;



  // Calculate the end angles for each segment
  const passedAngle = (passedPercent / total) * 360;
  const failedAngle = 360;




  // Add slices to the SVG
  svg.appendChild(createSlice(0, passedAngle, '#4CAF50')); // Green for passed
  svg.appendChild(createSlice(passedAngle, failedAngle, '#d63031')); // Red for failed




  // Optional: Add a center circle to make it a donut chart
  const centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  centerCircle.setAttribute('cx', '50');
  centerCircle.setAttribute('cy', '50');
  centerCircle.setAttribute('r', '30');
  centerCircle.setAttribute('fill', '#ffffff');
  svg.appendChild(centerCircle);


}











document.addEventListener("DOMContentLoaded", function () {

  const endpoint = 'https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql';

  let name = document.getElementById("firstName")

  let lastname = document.getElementById("lastName")

  let level = document.getElementById("level")

  let xp = document.getElementById("xp")

  let audit = document.getElementById("audit")

  const svg = document.getElementById("graph1");

  const svgWidth = Number(svg.getAttribute('width'));

  const svgHeight = Number(svg.getAttribute("height"));




  const jwt = localStorage.getItem("jwt");

  console.log(jwt)

  if (!jwt) {

    window.location.href = "login.html";

  }












  const query = `
   {
   
    user {
      firstName
      lastName
      auditRatio
     
    }

   transaction (
   
    where: { type: { _eq: "level"} }
    )
     {
      type
      amount
      path
      }

      myTransaction : transaction  (
   
    where: {
    type: { _eq: "xp" },
    path: { _like: "/oujda/module/%" } 
    _not: { path: { _like: "/oujda/module/piscine-js/%" }}

  }
    )
       {
      type
      amount
      path
      }


      
  skills : transaction (

   distinct_on: type
    order_by: [{ type: asc }, { id: desc }]

  where: {    

  type: { _like: "skill_%" } ,

     _and: [
      
      { _not: { path: { _like: "/oujda/module/piscine%" }} },
     
    ]
  }
  
  ){
  
  path
  type
  amount
  
  id
    user {
      id
      login
     
    }
  }
user {
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
        


}
  `;
  //
  fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${jwt}`
    },
    body: JSON.stringify({ query })                                    //graphql query
  }).then(res => res.json())

    //first last name

    //level
    //total xp

    //skills (   bar chart  )
    //audit ratio ( pie chart for svg grqph )

    .then(data => {

      console.log(data)


      //////////////////////////   NAME & LASTNAME & AUDIT RATIO ///////////////////////////////////////////

      name.textContent = capitalize(data.data.user[0].firstName)
      lastname.textContent = capitalize(data.data.user[0].lastName)

      audit.textContent = data.data.user[0].auditRatio.toFixed(1);

      /////////////////////////// LEVEL AMOUNT //////////////////////////////////////////     



      level.textContent = data.data.transaction[(data.data.transaction.length) - 1].amount   /// level

      ////////////////////////////  TOTAL XP   ///////////////////////////////////////     

      let count = 0;
      for (i = 0; i < data.data.myTransaction.length; i++) {

        count += parseInt(data.data.myTransaction[i].amount)

      }

      xp.textContent = Math.ceil(count / 1000) + "Kb"

 //////////////////////////////   Audit ratio  //////////////////////////////

const userData = data.data.user[0];
  const successCount = userData.audits_aggregate.aggregate.count;
  const failCount = userData.failed_audits.aggregate.count;





      ///////////////////////////////   SKILLS GRAPH GRID   ///////////////////////////////////



      const gridSpacing = (data.data.skills.length); // You can change this value to make the grid finer or coarser
      for (let i = 0; i <= svgHeight + 1; i += (svgHeight / 10)) {  // 10 steps
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", 0); // Starting X (left edge)
        line.setAttribute("y1", i); // Starting Y
        line.setAttribute("x2", svgWidth); // Ending X (right edge)
        line.setAttribute("y2", i); // Ending Y (same as starting Y)
        line.setAttribute("stroke", "#dddd"); // Light gray color
        line.setAttribute("stroke-width", "1");
        svg.appendChild(line);
      }

      // Draw vertical grid lines (every 10 units)
      for (let i = 0; i <= svgWidth + 1; i += (svgWidth / gridSpacing)) { // 10 steps
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", i); // Starting X
        line.setAttribute("y1", 0); // Starting Y (top edge)
        line.setAttribute("x2", i); // Ending X (same as starting X)
        line.setAttribute("y2", svgHeight); // Ending Y (bottom edge)
        line.setAttribute("stroke", "#dddd"); // Light gray color
        line.setAttribute("stroke-width", "1");
        svg.appendChild(line);
      }



      //////////////////////////////////////////////////////////////////////////////////



      //////////////////////////    SKILLS  //////////////////////////////////////////

      data.data.skills.sort((a, b) => b.amount - a.amount);

      let spacing = 10

      let barWidth = 30

      const totalBars = (data.data.skills.length);

      const totalWidth = totalBars * (barWidth + spacing);

      svg.setAttribute("width", totalWidth);

      for (i = 0; i < data.data.skills.length; i++) {

        const totalBars = (data.data.skills.length);

        let skill = data.data.skills[i].type    // skill_prog

        let amount = Number(data.data.skills[i].amount)    // 25

        let spacing = 10

        let barWidth = 30

        const totalWidth = totalBars * (barWidth + spacing);



        let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

        rect.setAttribute("x", i * (spacing + barWidth) + 5)
        rect.setAttribute("y", (svgHeight - amount))
        rect.setAttribute("width", barWidth);
        rect.setAttribute("height", amount);
        rect.setAttribute("fill", "#4CAF50");
        rect.setAttribute("id", skill)

        svg.appendChild(rect);

        let textTop = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textTop.setAttribute("x", i * (spacing + barWidth) + 20);
        textTop.setAttribute("y", svgHeight - amount - 5); // 5px above the bar
        textTop.setAttribute("text-anchor", "middle");
        textTop.setAttribute("font-size", "10");
        textTop.textContent = amount + "%";
        svg.appendChild(textTop);

        let textBottom = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textBottom.setAttribute("x", i * (spacing + barWidth) + 20);
        textBottom.setAttribute("y", svgHeight - amount - 20); // 12px below the SVG bottom edge
        textBottom.setAttribute("text-anchor", "middle");
        textBottom.setAttribute("font-size", "9");
        textBottom.textContent = skill.replace("skill_", ""); // Optional: remove prefix
        svg.appendChild(textBottom);


      }

      //////////////////////  PIE GRAPH /////////////////////////


      createPieChart(successCount, failCount)

      ////////////////////////////////////////////

      //////////////////////////////////////////////////////////////////////////

      //////////////////////////////////////////////////////////////////////////////


    }).catch(err =>
      console.log(err)
    );






});


