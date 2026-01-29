"use client";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { Sun, Moon, Calendar, BarChart2, Heart, FileText, LogOut, Plus, Trash2, Bluetooth, User } from "lucide-react";

/* ---------------- TYPES ---------------- */
type DayLog = { date: string };
type Habit = { name: string; category: string; logs: DayLog[]; notes: string[] };
type HealthLog = { date: string; heartRate: number; spo2: number; sugar: number; bp: string; steps: number };

/* ---------------- DATE HELPERS ---------------- */
function formatDate(d: Date) { return d.toISOString().split("T")[0]; }
function getToday() { return formatDate(new Date()); }
function getMonthDays(year:number, month:number) {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) { days.push(new Date(d)); d.setDate(d.getDate()+1); }
  return days;
}

/* ---------------- APP ---------------- */
export default function Home() {
  const [tab, setTab] = useState<"Daily"|"Calendar"|"Charts"|"Health"|"Profile">("Daily");
  const [dark, setDark] = useState(true);

  const [user, setUser] = useState<string|null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [habits, setHabits] = useState<Habit[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [filterCategory, setFilterCategory] = useState("All");
  const [noteText, setNoteText] = useState<string[]>([]);

  const [healthInput, setHealthInput] = useState({ heartRate:"", spo2:"", sugar:"", bp:"", steps:0 });
  const [bluetoothConnected, setBluetoothConnected] = useState(false);

  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const [modalMsg, setModalMsg] = useState<string|null>(null);

  /* ---------- INIT ---------- */
  useEffect(()=>{
    const u = localStorage.getItem("currentUser");
    const theme = localStorage.getItem("theme");
    if(theme==="light") setDark(false);

    if(u){
      const h = JSON.parse(localStorage.getItem("habits_"+u) || "[]");
      const hl = JSON.parse(localStorage.getItem("healthLogs_"+u) || "[]");
      setUser(u);
      setHabits(h);
      setHealthLogs(hl);
      setNoteText(h.map(()=> ""));
    }
  },[]);

  useEffect(()=>{
    if(user){
      localStorage.setItem("habits_"+user, JSON.stringify(habits));
      localStorage.setItem("healthLogs_"+user, JSON.stringify(healthLogs));
    }
    localStorage.setItem("theme", dark?"dark":"light");
  },[habits, healthLogs, user, dark]);

  /* ---------- AUTH ---------- */
  function login(){
    if(!username || !password) return setModalMsg("Enter username & password");

    const saved = localStorage.getItem("user_"+username);

    if(!saved){
      // New user
      localStorage.setItem("user_"+username, password);
      localStorage.setItem("currentUser", username);

      setUser(username);
      setHabits([]);
      setHealthLogs([]);
      setNoteText([]);
    } else {
      if(saved === password){
        localStorage.setItem("currentUser", username);

        const h = JSON.parse(localStorage.getItem("habits_"+username) || "[]");
        const hl = JSON.parse(localStorage.getItem("healthLogs_"+username) || "[]");

        setUser(username);
        setHabits(h);
        setHealthLogs(hl);
        setNoteText(h.map(()=> ""));
      } else {
        setModalMsg("Wrong password");
      }
    }
  }

  function logout(){
    localStorage.removeItem("currentUser");
    setUser(null);
    setHabits([]);
    setHealthLogs([]);
    setNoteText([]);
  }

  /* ---------- HABITS ---------- */
  function addHabit(){
    if(!name) return;
    setHabits([...habits,{name,category,logs:[],notes:[]}]);
    setNoteText([...noteText,""]);
    setName("");
  }

  function toggleHabit(i:number){
    const updated=[...habits];
    const today=getToday();
    const idx=updated[i].logs.findIndex(l=>l.date===today);
    if(idx===-1) updated[i].logs.push({date:today});
    else updated[i].logs.splice(idx,1);
    setHabits(updated);
  }

  function isDoneToday(h:Habit){ return h.logs.some(l=>l.date===getToday()); }

  function deleteHabit(i:number){
    const h=[...habits]; h.splice(i,1);
    const nt=[...noteText]; nt.splice(i,1);
    setHabits(h); setNoteText(nt);
  }

  function addNote(i:number){
    if(!noteText[i]) return;
    const updated=[...habits];
    updated[i].notes.push(noteText[i]);
    const nt=[...noteText]; nt[i]="";
    setNoteText(nt); setHabits(updated);
  }

  function deleteNote(hi:number, ni:number){
    const updated=[...habits];
    updated[hi].notes.splice(ni,1);
    setHabits(updated);
  }

  /* ---------- HEALTH ---------- */
  function saveHealth(){
    const today=getToday();
    const newLog:HealthLog={
      date:today,
      heartRate:+healthInput.heartRate,
      spo2:+healthInput.spo2,
      sugar:+healthInput.sugar,
      bp:healthInput.bp,
      steps:healthInput.steps
    };
    const updated=healthLogs.filter(h=>h.date!==today);
    updated.push(newLog);
    setHealthLogs(updated);
    setModalMsg("Health saved");
  }

  function addSteps(c:number){
    setHealthInput({...healthInput, steps:healthInput.steps+c});
  }

  function connectBluetooth(){
    setBluetoothConnected(true);
    setModalMsg("Bluetooth connected (demo)");
  }

  /* ---------- PDF ---------- */
  function exportPDF(){
    const doc=new jsPDF();
    let y=10;

    doc.text("HABIT REPORT",10,y); y+=8;
    doc.text("Date | Habit | Category | Done",10,y); y+=6;

    const dates = new Set<string>();
    habits.forEach(h=>h.logs.forEach(l=>dates.add(l.date)));

    Array.from(dates).sort().forEach(d=>{
      habits.forEach(h=>{
        const done = h.logs.some(l=>l.date===d) ? "Yes":"No";
        doc.text(`${d} | ${h.name} | ${h.category} | ${done}`,10,y);
        y+=6;
        if(y>280){doc.addPage();y=10;}
      });
    });

    y+=10;
    doc.text("HEALTH REPORT",10,y); y+=8;
    doc.text("Date | HR | SpO2 | Sugar | BP | Steps",10,y); y+=6;

    healthLogs.forEach(h=>{
      doc.text(`${h.date} | ${h.heartRate} | ${h.spo2} | ${h.sugar} | ${h.bp} | ${h.steps}`,10,y);
      y+=6;
      if(y>280){doc.addPage();y=10;}
    });

    doc.save("habit_health_report.pdf");
  }

  const filteredHabits = filterCategory==="All"
    ? habits
    : habits.filter(h=>h.category===filterCategory);

  const monthDays = getMonthDays(calYear, calMonth);

  /* ---------- LOGIN PAGE ---------- */
  if(!user) return (
    <>
      <style>{css(dark)}</style>
      <div className="loginPage">
        <h1>🌱 Habit World</h1>
        <input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)}/>
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/>
        <button onClick={login}>Login / Register</button>
      </div>
      {modalMsg && <Modal msg={modalMsg} onClose={()=>setModalMsg(null)}/>}
    </>
  );

  /* ---------- MAIN ---------- */
  return (
    <>
      <style>{css(dark)}</style>
      <div className="layout">
        <div className="sidebar">
          <h2>🌱 Habit</h2>

          <div className="themeToggle" onClick={()=>setDark(!dark)}>
            <div className={`toggleCircle ${dark?"on":""}`}>{dark?<Moon size={14}/> : <Sun size={14}/>}</div>
          </div>

          <button onClick={()=>setTab("Daily")}><Plus/> Daily</button>
          <button onClick={()=>setTab("Calendar")}><Calendar/> Calendar</button>
          <button onClick={()=>setTab("Health")}><Heart/> Health</button>
          <button onClick={()=>setTab("Profile")}><User/> Profile</button>
          <button onClick={exportPDF}><FileText/> Export PDF</button>
          <button className="logoutBtn" onClick={logout}><LogOut/> Logout</button>
        </div>

        <div className="main">
          {tab==="Daily" && (
            <>
              <div className="card">
                <input placeholder="Habit name" value={name} onChange={e=>setName(e.target.value)}/>
                <select value={category} onChange={e=>setCategory(e.target.value)}>
                  <option>General</option><option>Study</option><option>Fitness</option>
                  <option>Work</option><option>Health</option><option>Personal</option>
                </select>
                <button onClick={addHabit}>Add Habit</button>
              </div>

              <div className="card">
                <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
                  <option>All</option><option>General</option><option>Study</option>
                  <option>Fitness</option><option>Work</option>
                  <option>Health</option><option>Personal</option>
                </select>
              </div>

              <div className="habitsGrid">
                {filteredHabits.map((h,i)=>(
                  <div key={i} className="habitCard">
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <b>{h.name}</b>
                      <button onClick={()=>deleteHabit(i)}><Trash2 size={14}/></button>
                    </div>
                    <span className="catTag">🏷 {h.category}</span>
                    <input type="checkbox" checked={isDoneToday(h)} onChange={()=>toggleHabit(i)}/>
                    <div className="dateList">{h.logs.map((l,idx)=><span key={idx}>{l.date}</span>)}</div>

                    <input placeholder="Note" value={noteText[i]||""}
                      onChange={e=>{const nt=[...noteText];nt[i]=e.target.value;setNoteText(nt)}}/>
                    <button onClick={()=>addNote(i)}>Add Note</button>

                    <div className="savedNotes">
                      {h.notes.map((n,idx)=>(
                        <div key={idx} style={{display:"flex",justifyContent:"space-between"}}>
                          <span>📝 {n}</span>
                          <button onClick={()=>deleteNote(i,idx)}><Trash2 size={12}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab==="Calendar" && (
            <>
              <div className="calendarHeader">
                <button onClick={()=>{
                  if(calMonth===0){ setCalMonth(11); setCalYear(calYear-1); }
                  else setCalMonth(calMonth-1);
                }}>◀</button>

                <h3>
                  {new Date(calYear, calMonth).toLocaleString("default",{month:"long"})}
                  {" "} {calYear}
                </h3>

                <button onClick={()=>{
                  if(calMonth===11){ setCalMonth(0); setCalYear(calYear+1); }
                  else setCalMonth(calMonth+1);
                }}>▶</button>
              </div>

              <div className="calendarGrid">
                {monthDays.map(d=>{
                  const ds=formatDate(d);
                  const done=habits.filter(h=>h.logs.some(l=>l.date===ds));
                  return(
                    <div key={ds} className="calendarCell">
                      <b>{d.getDate()}</b>
                      {done.map((h,i)=><div key={i} className="calHabit">{h.name}</div>)}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {tab==="Health" && (
            <div className="card">
              <h3>Bluetooth</h3>
              {bluetoothConnected ? <p style={{color:"green"}}>Connected</p> :
                <button onClick={connectBluetooth}><Bluetooth/> Connect</button>}

              <h3>Steps: {healthInput.steps}</h3>
              <button onClick={()=>addSteps(100)}>+100</button>
              <button onClick={()=>addSteps(500)}>+500</button>

              <input placeholder="Heart Rate" value={healthInput.heartRate} onChange={e=>setHealthInput({...healthInput,heartRate:e.target.value})}/>
              <input placeholder="SpO₂" value={healthInput.spo2} onChange={e=>setHealthInput({...healthInput,spo2:e.target.value})}/>
              <input placeholder="Sugar" value={healthInput.sugar} onChange={e=>setHealthInput({...healthInput,sugar:e.target.value})}/>
              <input placeholder="BP" value={healthInput.bp} onChange={e=>setHealthInput({...healthInput,bp:e.target.value})}/>
              <button onClick={saveHealth}>Save Health</button>
            </div>
          )}

          {tab==="Profile" && (
            <div className="card">
              <h2>👤 Profile</h2>
              <p><b>Username:</b> {user}</p>
              <p><b>Total Habits:</b> {habits.length}</p>
              <p><b>Total Habit Logs:</b> {habits.reduce((s,h)=>s+h.logs.length,0)}</p>
              <p><b>Total Notes:</b> {habits.reduce((s,h)=>s+h.notes.length,0)}</p>
              <p><b>Health Entries:</b> {healthLogs.length}</p>

              <hr/>

              <h3>Change Password</h3>
              <input type="password" placeholder="New password" onChange={e=>setPassword(e.target.value)}/>
              <button onClick={()=>{
                if(!password) return alert("Enter new password");
                localStorage.setItem("user_"+user, password);
                alert("Password updated");
              }}>Update Password</button>
            </div>
          )}
        </div>
      </div>
      {modalMsg && <Modal msg={modalMsg} onClose={()=>setModalMsg(null)}/>}
    </>
  );
}

/* ---------------- MODAL ---------------- */
function Modal({msg,onClose}:{msg:string,onClose:()=>void}){
  return(
    <div className="modalBg">
      <div className="modalBox">
        <p>{msg}</p>
        <button onClick={onClose}>OK</button>
      </div>
    </div>
  );
}

/* ---------------- CSS ---------------- */
function css(dark:boolean){
return `
*{box-sizing:border-box}

body{
  margin:0;
  font-family:"Segoe UI",sans-serif;
  background:${dark
    ? "linear-gradient(135deg,#020617,#0f172a,#1e293b)"
    : "linear-gradient(135deg,#f1f5f9,#e0f2fe)"};
  color:${dark?"#e5e7eb":"#020617"};
  transition:all .3s ease;
}

/* LAYOUT */
.layout{display:flex;min-height:100vh}

/* SIDEBAR */
.sidebar{
  width:240px;
  background:${dark?"rgba(2,6,23,.85)":"rgba(255,255,255,.8)"};
  backdrop-filter:blur(12px);
  padding:20px;
  display:flex;
  flex-direction:column;
  gap:12px;
  box-shadow:2px 0 15px rgba(0,0,0,.2);
}

.sidebar h2{margin-bottom:10px}

.sidebar button{
  display:flex;
  align-items:center;
  gap:8px;
  padding:12px;
  border:none;
  border-radius:14px;
  background:${dark?"#334155":"#dbeafe"};
  color:${dark?"white":"black"};
  cursor:pointer;
  transition:.2s;
}

.sidebar button:hover{
  transform:translateX(5px);
  background:#22c55e;
  color:black;
}

.logoutBtn{
  margin-top:auto;
  background:#ef4444 !important;
  color:white;
}

/* MAIN */
.main{flex:1;padding:25px}

/* CARDS */
.card,.habitCard{
  background:${dark?"rgba(30,41,59,.85)":"rgba(255,255,255,.95)"};
  backdrop-filter:blur(12px);
  padding:16px;
  border-radius:18px;
  margin-top:12px;
  box-shadow:0 10px 25px rgba(0,0,0,.15);
  animation:fadeIn .4s ease;
}

/* HABITS GRID */
.habitsGrid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(320px,1fr));
  gap:15px;
}

/* INPUTS */
input,select{
  width:100%;
  padding:10px;
  margin-top:6px;
  border-radius:12px;
  border:none;
  outline:none;
  background:${dark?"#020617":"#f1f5f9"};
  color:${dark?"white":"black"};
}

/* CATEGORY TAG */
.catTag{
  display:inline-block;
  padding:4px 10px;
  border-radius:999px;
  font-size:11px;
  margin-top:4px;
  background:#22c55e;
  color:black;
}

/* DATE BADGES */
.dateList span{
  background:#38bdf8;
  color:black;
  padding:3px 8px;
  border-radius:999px;
  margin:2px;
  font-size:11px;
}

/* CALENDAR */
.calendarHeader{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:10px;
}

.calendarHeader button{
  padding:6px 14px;
  border:none;
  border-radius:999px;
  background:#22c55e;
  cursor:pointer;
}

.calendarGrid{
  display:grid;
  grid-template-columns:repeat(7,1fr);
  gap:10px;
}

.calendarCell{
  background:${dark?"#1e293b":"#e5e7eb"};
  padding:8px;
  border-radius:14px;
  min-height:90px;
  transition:.2s;
}

.calendarCell:hover{transform:scale(1.05)}

.calHabit{
  font-size:11px;
  background:#22c55e;
  color:black;
  border-radius:6px;
  margin-top:3px;
  padding:2px 4px;
}

/* TOGGLE */
.themeToggle{
  width:60px;
  height:30px;
  border-radius:20px;
  background:${dark?"#334155":"#cbd5f5"};
  display:flex;
  align-items:center;
  padding:4px;
  cursor:pointer;
}

.toggleCircle{
  width:22px;
  height:22px;
  border-radius:50%;
  background:white;
  display:flex;
  align-items:center;
  justify-content:center;
  transition:.3s;
}

.toggleCircle.on{transform:translateX(30px)}

/* LOGIN */
.loginPage{
  max-width:320px;
  margin:120px auto;
  text-align:center;
  padding:25px;
  border-radius:20px;
  background:${dark?"rgba(30,41,59,.9)":"white"};
  box-shadow:0 10px 30px rgba(0,0,0,.2);
}

/* MODAL */
.modalBg{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.5);
  display:flex;
  align-items:center;
  justify-content:center;
}

.modalBox{
  background:white;
  padding:20px;
  border-radius:12px;
  min-width:250px;
  text-align:center;
}

/* ANIMATIONS */
@keyframes fadeIn{
  from{opacity:0;transform:translateY(10px)}
  to{opacity:1}
}
`;
}
