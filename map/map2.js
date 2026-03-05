/* map/map.js */

const CSV_URLS = {
    due: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=0&single=true&output=csv",
    overdue: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=1712737757&single=true&output=csv",
    disburse: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAz577iK5UQ03hI6swaEZJaT8kpvYaUA7SRAXOAGkwwznaLe6KL6z5BP8CQ4tZLy0TQht2YWcjwzix/pub?gid=815669108&single=true&output=csv"
};

let dataSets = {
    due: [],
    overdue: [],
    disburse: []
};

let svgDoc;

const typeSelect = document.getElementById("typeSelect");
const tooltip = document.getElementById("mapTooltip");


/* ====================================================
   โหลดแผนที่
==================================================== */

fetch("map/thailandHigh.svg")
.then(r => r.text())
.then(svg => {

    document.getElementById("map").innerHTML = svg;

    const svgEl = document.querySelector("#map svg");

    svgEl.removeAttribute("width");
    svgEl.removeAttribute("height");

    if (!svgEl.getAttribute("viewBox")) {
        svgEl.setAttribute("viewBox", "0 0 900 1400");
    }

    svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");

    svgDoc = svgEl;

    updateView();

});


/* ====================================================
   โหลด CSV ทั้ง 3
==================================================== */

async function loadAllCSV(){

    for(const type in CSV_URLS){

        const res = await fetch(CSV_URLS[type]);
        const text = await res.text();

        const rows = text.trim().split("\n").map(r => r.split(","));
        const headers = rows.shift();

        dataSets[type] = rows.map(r =>
            Object.fromEntries(headers.map((h,i)=>[h.trim(),r[i]]))
        );
    }

    updateView();
}


/* ====================================================
   helper หา row จังหวัด
==================================================== */

function getRow(ds,pv,year,month){

    return ds.find(r =>
        r["จังหวัด"]===pv &&
        r["ปีงบ"]===year &&
        r["เดือน"]===month
    );
}


/* ====================================================
   helper ดึงค่าผลลัพธ์
==================================================== */

function getResult(ds,pv,year,month){

    const row = getRow(ds,pv,year,month);

    if(!row) return 0;

    const key = Object.keys(row).find(k=>k.includes("ผล"));

    return Number(row[key]||0);
}


/* ====================================================
   สี
==================================================== */

function colorScale(rank,green){

    const blues=[
        "#0a3d91",
        "#1f5fbf",
        "#4b84d9",
        "#8ab1f0",
        "#c7dcff"
    ];

    const grays=[
        "#d9d9d9",
        "#bfbfbf",
        "#8c8c8c",
        "#595959",
        "#262626"
    ];

    return green?blues[rank]:grays[rank];
}


/* ====================================================
   update view
==================================================== */

function updateView(){

    if(!svgDoc) return;

    const type=typeSelect.value;

    const rawData=dataSets[type];

    if(!rawData.length) return;

    const latestRow=rawData
    .slice()
    .sort((a,b)=>{

        if(a["ปีงบ"]!==b["ปีงบ"])
            return Number(b["ปีงบ"])-Number(a["ปีงบ"]);

        return Number(b["เดือน"])-Number(a["เดือน"]);

    })[0];

    const latestYear=latestRow["ปีงบ"];
    const latestMonth=latestRow["เดือน"];

    const rows=rawData.filter(r=>
        r["ปีงบ"]===latestYear &&
        r["เดือน"]===latestMonth
    );

    const percentKey=Object.keys(rows[0]).find(k=>k.includes("ร้อยละ"));


    if(type==="overdue")
        rows.sort((a,b)=>parseFloat(a[percentKey])-parseFloat(b[percentKey]));
    else
        rows.sort((a,b)=>parseFloat(b[percentKey])-parseFloat(a[percentKey]));


    const top5=rows.slice(0,5);
    const bottom5=rows.slice(-5);


    /* ====================================================
       TABLE
    ==================================================== */

    const tbody=document.querySelector("#mapTable tbody");

    tbody.innerHTML="";

    tbody.innerHTML+=`
<tr class="section-header"><td colspan="4">▶ Top 5 อันดับแรก</td></tr>
`;

    top5.forEach((r,i)=>{

        const pv=r["จังหวัด"];

        const disburse=getResult(dataSets.disburse,pv,latestYear,latestMonth);
        const due=getResult(dataSets.due,pv,latestYear,latestMonth);
        const overdue=getResult(dataSets.overdue,pv,latestYear,latestMonth);

        tbody.innerHTML+=`
<tr>
<td>${i+1}. ${pv}</td>
<td>${disburse.toLocaleString()}</td>
<td>${due.toLocaleString()}</td>
<td>${overdue.toLocaleString()}</td>
</tr>
`;
    });

    tbody.innerHTML+=`
<tr class="section-header"><td colspan="4">▶ 5 อันดับสุดท้าย</td></tr>
`;

    bottom5.forEach((r,i)=>{

        const pv=r["จังหวัด"];

        const disburse=getResult(dataSets.disburse,pv,latestYear,latestMonth);
        const due=getResult(dataSets.due,pv,latestYear,latestMonth);
        const overdue=getResult(dataSets.overdue,pv,latestYear,latestMonth);

        const rank=rows.length-5+i+1;

        tbody.innerHTML+=`
<tr>
<td>${rank}. ${pv}</td>
<td>${disburse.toLocaleString()}</td>
<td>${due.toLocaleString()}</td>
<td>${overdue.toLocaleString()}</td>
</tr>
`;
    });



    /* ====================================================
       MAP COLOR
    ==================================================== */

    svgDoc.querySelectorAll("path").forEach(p=>{

        const pv=mapping_pv[p.id];

        const rowTop=top5.find(r=>r["จังหวัด"]===pv);
        const rowBottom=bottom5.find(r=>r["จังหวัด"]===pv);

        const row=rows.find(r=>r["จังหวัด"]===pv);

        let color="#eee";

        if(rowTop){

            color=colorScale(top5.indexOf(rowTop),true);
            p.classList.remove("map-default");

        }
        else if(rowBottom){

            color=colorScale(bottom5.indexOf(rowBottom),false);
            p.classList.remove("map-default");

        }
        else{

            color="#e98ae7";
            p.classList.add("map-default");

        }

        p.style.fill=color;
        p.style.pointerEvents="visibleFill";


        /* tooltip */

        p.onmousemove=e=>{

            if(!row) return;

            const rect=document.querySelector(".map-area").getBoundingClientRect();

            const disburse=getResult(dataSets.disburse,pv,latestYear,latestMonth);
            const due=getResult(dataSets.due,pv,latestYear,latestMonth);
            const overdue=getResult(dataSets.overdue,pv,latestYear,latestMonth);

            tooltip.style.display="block";

            tooltip.style.left=(e.clientX-rect.left+12)+"px";
            tooltip.style.top=(e.clientY-rect.top+12)+"px";

            tooltip.innerHTML=`
<b>${pv}</b><br>
การใช้จ่ายเงินทุนหมุนเวียน : ${disburse.toLocaleString()}<br>
การรับชำระคืนเงินกู้ : ${due.toLocaleString()}<br>
หนี้ค้างชำระ : ${overdue.toLocaleString()}
`;

        };

        p.onmouseleave=()=>tooltip.style.display="none";

    });

}


/* ====================================================
   EVENTS
==================================================== */

typeSelect.onchange=updateView;


/* ====================================================
   INIT
==================================================== */

loadAllCSV();