(() => {
"use strict";

if(typeof TOPICS!=="undefined"){
  TOPICS.tables="Property Tables";
  TOPICS.steady="Steady Flow Devices";
}

if(typeof flashcards!=="undefined"){
  flashcards.push(
    ["tables","If P and T are given for water, what should you determine before grabbing numbers from a table?","Identify the phase/region first so you know which table applies."],
    ["tables","What does quality x represent?","The mass fraction of vapor in a saturated liquid-vapor mixture."],
    ["tables","Quality x is valid in what region?","Only inside the saturated liquid-vapor mixture region."],
    ["tables","For a saturated mixture, how do you find a property y?","y = yf + x(yfg)."],
    ["steady","Steady-flow energy equation, one inlet and one outlet?","q - w = (h2-h1) + (V2²-V1²)/2 + g(z2-z1)."],
    ["steady","Ideal nozzle: what commonly happens to enthalpy?","Enthalpy decreases as kinetic energy increases."],
    ["steady","Ideal turbine produces or consumes work?","Produces work."],
    ["steady","Ideal compressor produces or consumes work?","Consumes work."],
    ["steady","Throttling valve key relation?","h1 ≈ h2 for steady, adiabatic throttling with negligible KE/PE changes."]
  );
}

if(typeof formulas!=="undefined"){
  formulas.push(
    ["Quality / Saturated Mixture","y = yf + x yfg","Use only in the saturated liquid-vapor mixture region."],
    ["Quality from Property","x = (y - yf) / yfg","Solve for vapor mass fraction when a mixture property is known."],
    ["Ideal Gas","Pv = RT","Use when ideal-gas behavior is appropriate."],
    ["Boundary Work at Constant Pressure","Wb = P(V2 - V1)","Closed-system moving-boundary work at constant pressure."],
    ["Closed-System First Law","Q - W = ΔU + ΔKE + ΔPE","Start here for a fixed mass."],
    ["Steady-Flow Energy","q - w = Δh + Δ(V²/2) + gΔz","Start here for one-inlet/one-outlet steady devices."]
  );
}

const style=document.createElement("style");
style.textContent=`
#thermoSolver .solver-grid{
 display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px
}
#thermoSolver input,#thermoSolver select{
 width:100%;padding:11px;border-radius:10px;border:1px solid #777;
 font:inherit;margin:5px 0 12px
}
#thermoSolver .solve-output{white-space:pre-wrap}
`;
document.head.appendChild(style);

const nav=document.querySelector("nav");
if(nav){
  const b=document.createElement("button");
  b.textContent="🧮 Thermo Solver";
  b.onclick=()=>go("thermoSolver");
  nav.appendChild(b);
}

const main=document.querySelector("main");
if(main){
  const section=document.createElement("section");
  section.id="thermoSolver";
  section.innerHTML=`
    <h2>🧮 Thermo Guided Solver</h2>
    <p>
      Do not jump straight to equations. Classify the problem first.
      The solver below gives you the setup path.
    </p>

    <div class="challenge">
      <label>What type of problem is this?</label>
      <select id="tq-type">
        <option value="state">State / property-table problem</option>
        <option value="closed">Closed-system energy balance</option>
        <option value="turbine">Turbine</option>
        <option value="compressor">Compressor / pump</option>
        <option value="nozzle">Nozzle / diffuser</option>
        <option value="throttle">Throttling valve</option>
        <option value="hex">Heat exchanger</option>
      </select>

      <button class="btn" id="tq-build">Build solving path</button>

      <div id="tq-path" class="feedback solve-output" style="margin-top:14px"></div>
    </div>

    <div class="challenge">
      <h3>Quality Calculator</h3>
      <p>For a saturated liquid-vapor mixture: y = yf + x(yfg)</p>

      <div class="solver-grid">
        <div>
          <label>yf</label>
          <input id="tq-yf" type="number" step="any">
        </div>
        <div>
          <label>yg</label>
          <input id="tq-yg" type="number" step="any">
        </div>
        <div>
          <label>Quality x (0 to 1)</label>
          <input id="tq-x" type="number" step="any">
        </div>
      </div>

      <button class="btn" id="tq-quality">Calculate mixture property</button>
      <div id="tq-quality-result" class="feedback"></div>
    </div>

    <div class="challenge">
      <h3>Thermo Answer Checklist</h3>
      <ol>
        <li>Write every given with units.</li>
        <li>Identify closed system vs. control volume.</li>
        <li>Determine the state/phase before using tables.</li>
        <li>Sketch the process or device.</li>
        <li>Write the full governing equation.</li>
        <li>Cross out terms that are actually zero.</li>
        <li>Substitute values with consistent units.</li>
        <li>Check sign convention.</li>
        <li>Check whether the numerical answer makes physical sense.</li>
      </ol>
    </div>
  `;
  main.appendChild(section);
}

const paths={
state:`STATE / PROPERTY TABLE

1. List the two independent intensive properties you know.
2. Identify the substance.
3. Compare the known values with saturation data.
4. Decide the region:
   • compressed/subcooled liquid
   • saturated liquid
   • saturated mixture
   • saturated vapor
   • superheated vapor
5. Choose the correct table.
6. Interpolate only if needed.
7. If mixture: y = yf + x(yfg).
8. Check units and whether the value fits the phase.`,

closed:`CLOSED SYSTEM

1. Fixed mass? Good → closed-system model.
2. Write:
   Q - W = ΔU + ΔKE + ΔPE
3. Decide whether KE and PE changes are negligible.
4. Identify boundary work, electrical work, etc.
5. Find u1 and u2 from the correct property source.
6. Substitute using your class sign convention.
7. Solve and check sign + units.`,

turbine:`TURBINE

1. Use a steady-flow control volume.
2. Usually one inlet + one outlet.
3. Start:
   q - w = (h2-h1) + Δke + Δpe
4. If adiabatic → q ≈ 0.
5. If velocity/elevation effects are negligible → cancel them.
6. Turbine work is OUTPUT.
7. For the common idealized case:
   w_out ≈ h1 - h2.`,

compressor:`COMPRESSOR / PUMP

1. Steady-flow control volume.
2. Start with the SFEE.
3. Compressors/pumps require WORK INPUT.
4. If adiabatic and KE/PE negligible:
   w_in ≈ h2 - h1.
5. For an incompressible pump approximation:
   w_in ≈ v(P2-P1).
6. Check that outlet pressure is higher.`,

nozzle:`NOZZLE / DIFFUSER

1. Steady-flow control volume.
2. Usually q ≈ 0 and shaft work ≈ 0.
3. Usually ΔPE ≈ 0.
4. Reduced equation:
   h1 + V1²/2 ≈ h2 + V2²/2
5. Nozzle: velocity usually increases.
6. Diffuser: velocity usually decreases.
7. Watch J/kg ↔ kJ/kg conversion.`,

throttle:`THROTTLING VALVE

1. Steady flow.
2. Usually adiabatic.
3. No shaft work.
4. KE and PE changes usually negligible.
5. Therefore:
   h1 ≈ h2
6. Pressure drops across the restriction.
7. Use h1=h2 to determine the downstream state.`,

hex:`HEAT EXCHANGER

1. Draw a control volume around the exchanger.
2. At steady state, apply mass conservation to each stream.
3. Often external heat loss and work are negligible.
4. Energy lost by the hot stream ≈ energy gained by the cold stream.
5. Use enthalpy changes:
   Σṁh_in ≈ Σṁh_out
6. Keep each stream's mass flow rate straight.`
};

const build=document.getElementById("tq-build");
if(build){
  build.onclick=()=>{
    document.getElementById("tq-path").textContent=
      paths[document.getElementById("tq-type").value];
  };
  build.click();
}

const qc=document.getElementById("tq-quality");
if(qc){
  qc.onclick=()=>{
    const yf=Number(document.getElementById("tq-yf").value);
    const yg=Number(document.getElementById("tq-yg").value);
    const x=Number(document.getElementById("tq-x").value);
    const box=document.getElementById("tq-quality-result");

    if(!Number.isFinite(yf)||!Number.isFinite(yg)||!Number.isFinite(x)){
      box.textContent="Enter yf, yg, and x.";
      return;
    }
    if(x<0||x>1){
      box.textContent="Quality x must be between 0 and 1.";
      return;
    }

    const yfg=yg-yf;
    const y=yf+x*yfg;

    box.textContent=
      `yfg = yg - yf = ${yg} - ${yf} = ${yfg.toFixed(5)}\n`+
      `y = yf + x(yfg)\n`+
      `y = ${yf} + ${x}(${yfg.toFixed(5)})\n`+
      `ANSWER: ${y.toFixed(5)}`;
  };
}

if(typeof populateTopics==="function") populateTopics();
if(typeof renderMastery==="function") renderMastery();

})();
