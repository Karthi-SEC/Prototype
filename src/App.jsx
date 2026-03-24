
import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

const CHENNAI={lat:13.0827,lng:80.2707};
const MOCK_AMBS=[
  {id:1,lat:13.0912,lng:80.2792,status:"vacant",driver:"Rajan M.",vehicle:"TN-01-AM-1001",phone:"98412 34567",paramedic:"Suresh V.",base:"Anna Nagar Base"},
  {id:2,lat:13.0748,lng:80.2614,status:"vacant",driver:"Priya K.",vehicle:"TN-01-AM-1002",phone:"98421 76543",paramedic:"Meena R.",base:"T. Nagar Base"},
  {id:3,lat:13.0967,lng:80.2646,status:"vacant",driver:"Selvam R.",vehicle:"TN-01-AM-1003",phone:"94455 11223",paramedic:"Karthik S.",base:"Kilpauk Base"},
  {id:4,lat:13.0695,lng:80.2827,status:"vacant",driver:"Kavitha S.",vehicle:"TN-01-AM-1004",phone:"96001 44567",paramedic:"Divya P.",base:"Adyar Base"},
];
const HOSPITALS=[
  {id:1,name:"Apollo Hospitals",type:"Multi-Specialty",dist:"1.2 km",lat:13.0675,lng:80.2782,rating:"4.8",beds:"550+",open:"24/7",icon:"🏥",phone:"044-2829 3333",emergency:"044-2829 0200",addr:"21 Greams Lane, Off Greams Rd, Chennai"},
  {id:2,name:"MIOT International",type:"Ortho & Trauma",dist:"2.1 km",lat:13.0126,lng:80.2100,rating:"4.7",beds:"400+",open:"24/7",icon:"🏨",phone:"044-4200 2288",emergency:"044-4200 2200",addr:"4/112 Mount Poonamallee Rd, Chennai"},
  {id:3,name:"Fortis Malar",type:"Cardiac Care",dist:"2.8 km",lat:13.0050,lng:80.2574,rating:"4.6",beds:"180+",open:"24/7",icon:"❤️",phone:"044-4289 2222",emergency:"044-4289 2100",addr:"52 1st Main Rd, Gandhi Nagar, Adyar"},
  {id:4,name:"Vijaya Hospital",type:"General",dist:"0.8 km",lat:13.0432,lng:80.2313,rating:"4.5",beds:"300+",open:"24/7",icon:"🩺",phone:"044-2471 4288",emergency:"044-2471 4111",addr:"180 NSK Salai, Vadapalani, Chennai"},
  {id:5,name:"Sri Ramachandra",type:"Teaching Hospital",dist:"4.2 km",lat:13.0358,lng:80.1590,rating:"4.7",beds:"1500+",open:"24/7",icon:"🎓",phone:"044-4592 8600",emergency:"044-4592 8700",addr:"No.1 Ramachandra Nagar, Porur, Chennai"},
];
const ENUMS=[
  {label:"Ambulance",num:"108",color:"#ff2d55",icon:"🚑",desc:"Free 24/7 emergency ambulance"},
  {label:"Police",num:"100",color:"#0a84ff",icon:"👮",desc:"Law enforcement & safety"},
  {label:"Fire & Rescue",num:"101",color:"#ff9f0a",icon:"🚒",desc:"Fire emergencies & rescue ops"},
  {label:"Disaster Mgmt",num:"1077",color:"#30d158",icon:"🌊",desc:"Natural disasters & floods"},
  {label:"Women Safety",num:"1091",color:"#bf5af2",icon:"🆘",desc:"Women in distress helpline"},
  {label:"Child Helpline",num:"1098",color:"#5ac8fa",icon:"👶",desc:"Child welfare & abuse"},
  {label:"Coast Guard",num:"1554",color:"#0a84ff",icon:"⚓",desc:"Marine & sea emergencies"},
  {label:"Mental Health",num:"9152987821",color:"#ffd60a",icon:"🧠",desc:"iCall psychological support"},
];
const TN_NUMS=[
  {label:"TN Ambulance EMRI",num:"108",icon:"🚑",color:"#ff2d55"},
  {label:"TN Fire & Rescue",num:"101",icon:"🚒",color:"#ff9f0a"},
  {label:"TN Disaster Response",num:"1070",icon:"🌊",color:"#30d158"},
  {label:"TN Health Helpline",num:"104",icon:"💊",color:"#5ac8fa"},
  {label:"Chennai Police Control",num:"1100",icon:"👮",color:"#0a84ff"},
  {label:"Road Accident Relief",num:"1073",icon:"🛣️",color:"#ffd60a"},
];

function hav(a,b,c,d){
  const R=6371,dL=(c-a)*Math.PI/180,dN=(d-b)*Math.PI/180;
  const x=Math.sin(dL/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dN/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

const Ctx=createContext(null);

function Provider({children}){
  const [theme,setTheme]=useState(()=>{
    const saved=localStorage.getItem("rescuegrid-theme");
    if(saved==="dark"||saved==="light") return saved;
    return "dark";
  });
  const [page,setPage]=useState("auth");
  const [authMode,setAuthMode]=useState("login");
  const [user,setUser]=useState(null);
  const [activePage,setActivePage]=useState("dashboard");
  const [ambs,setAmbs]=useState(MOCK_AMBS.map(a=>({...a})));
  const [assigned,setAssigned]=useState(null);
  const [trackSt,setTrackSt]=useState("idle");
  const [etaSec,setEtaSec]=useState(null);
  const [userLoc,setUserLoc]=useState(CHENNAI);
  const [health,setHealth]=useState({weight:72,heartRate:74,bp:"120/80",bloodO2:98,steps:6840,sleep:7.2,glucose:95,cholesterol:185});
  const [notif,setNotif]=useState(null);
  const [sideOpen,setSideOpen]=useState(false);
  const [docs,setDocs]=useState([
    {name:"Blood Test Report.pdf",date:"2025-03-10",type:"Lab Report",size:"245 KB"},
    {name:"ECG Scan.jpg",date:"2025-02-28",type:"Cardiac",size:"1.2 MB"},
    {name:"X-Ray Chest.jpg",date:"2025-01-15",type:"Radiology",size:"3.1 MB"},
  ]);
  const timer=useRef(null);

  useEffect(()=>{
    document.body.setAttribute("data-theme",theme);
    localStorage.setItem("rescuegrid-theme",theme);
  },[theme]);

  useEffect(()=>{
    navigator.geolocation?.getCurrentPosition(
      p=>setUserLoc({lat:p.coords.latitude,lng:p.coords.longitude}),
      ()=>setUserLoc(CHENNAI)
    );
  },[]);

  const showNotif=useCallback((msg,color="#30d158")=>{
    setNotif({msg,color});
    setTimeout(()=>setNotif(null),3400);
  },[]);

  const login=useCallback((email,pass,name,blood,age)=>{
    const u={email,name:name||email.split("@")[0],blood:blood||"O+",allergies:"Penicillin",age:age||28};
    setUser(u); setPage("app"); showNotif("Welcome back, "+u.name+" 👋");
  },[showNotif]);

  const signup=useCallback((email,pass,name,blood,age)=>{
    const uname=(name&&name.trim())?name.trim():email.split("@")[0];
    const u={email,name:uname,blood:blood||"O+",allergies:"None",age:age||25};
    setUser(u); setPage("app"); showNotif("Account created! Welcome, "+u.name+" 🎉");
  },[showNotif]);

  const logout=useCallback(()=>{
    setUser(null); setPage("auth");
    setTrackSt("idle"); setAssigned(null);
    setAmbs(MOCK_AMBS.map(a=>({...a})));
    clearInterval(timer.current);
  },[]);

  const triggerSOS=useCallback(()=>{
    const vac=ambs.filter(a=>a.status==="vacant");
    if(!vac.length){showNotif("No ambulances available","#ff9f0a");return;}
    setTrackSt("dispatching");
    let best=null,bd=Infinity;
    for(const a of vac){const d=hav(userLoc.lat,userLoc.lng,a.lat,a.lng);if(d<bd){bd=d;best=a;}}
    const amb={...best,status:"en_route"};
    setAssigned(amb);
    setAmbs(prev=>prev.map(a=>a.id===best.id?{...a,status:"en_route"}:a));
    setEtaSec(Math.round((bd/60)*3600));
    showNotif("🚑 "+best.vehicle+" dispatched!","#ff2d55");
    setTimeout(()=>{
      setTrackSt("en_route");
      setActivePage("tracking");
      setPage(p=>p==="auth"?"guesttrack":p);
    },900);
  },[ambs,userLoc,showNotif]);

  const reachedRef=useRef(false);
  const intervalId=useRef(null);

  useEffect(()=>{
    if(trackSt!=="en_route"||!assigned) return;
    reachedRef.current=false;
    clearInterval(intervalId.current);
    const id=setInterval(()=>{
      if(reachedRef.current){
        clearInterval(id);
        return;
      }
      setAssigned(prev=>{
        if(!prev) return prev;
        if(reachedRef.current) return prev;
        const dist=hav(prev.lat,prev.lng,userLoc.lat,userLoc.lng);
        if(dist<0.04){
          reachedRef.current=true;
          clearInterval(id);
          setTimeout(()=>{
            setTrackSt("reached");
            setEtaSec(0);
            showNotif("✅ Ambulance has arrived!","#30d158");
          },0);
          return {...prev,lat:userLoc.lat,lng:userLoc.lng};
        }
        const dLat=userLoc.lat-prev.lat,dLng=userLoc.lng-prev.lng;
        const remainingDeg=Math.hypot(dLat,dLng);
        if(remainingDeg<0.00001){
          reachedRef.current=true;
          clearInterval(id);
          setTimeout(()=>{
            setTrackSt("reached");
            setEtaSec(0);
            showNotif("✅ Ambulance has arrived!","#30d158");
          },0);
          return {...prev,lat:userLoc.lat,lng:userLoc.lng};
        }
        const stepDeg=Math.min(remainingDeg,Math.max(0.00004,remainingDeg*0.28));
        const ratio=stepDeg/remainingDeg;
        const nL=prev.lat+dLat*ratio,nN=prev.lng+dLng*ratio;
        setEtaSec(Math.max(0,Math.round((hav(nL,nN,userLoc.lat,userLoc.lng)/60)*3600)));
        return {...prev,lat:nL,lng:nN};
      });
    },1700);
    intervalId.current=id;
    return ()=>{ clearInterval(id); };
  },[trackSt,assigned,userLoc,showNotif]);

  const cancelSOS=useCallback(()=>{
    reachedRef.current=true;
    clearInterval(intervalId.current);
    clearInterval(timer.current);
    setTrackSt("idle");setAssigned(null);setEtaSec(null);
    setAmbs(MOCK_AMBS.map(a=>({...a})));
    setPage(p=>p==="guesttrack"?"auth":p);
    setActivePage("dashboard");
    showNotif("Emergency cancelled","#ffd60a");
  },[showNotif]);

  const toggleTheme=useCallback(()=>{
    setTheme(prev=>prev==="dark"?"light":"dark");
  },[]);

  return(
    <Ctx.Provider value={{theme,toggleTheme,page,authMode,setAuthMode,user,login,signup,logout,activePage,setActivePage,ambs,assigned,trackSt,etaSec,userLoc,health,setHealth,notif,sideOpen,setSideOpen,triggerSOS,cancelSOS,docs,setDocs,showNotif}}>
      {children}
    </Ctx.Provider>
  );
}

function Notif(){
  const {notif}=useContext(Ctx);
  if(!notif) return null;
  return(
    <div className="notif-bar">
      <div style={{width:9,height:9,borderRadius:"50%",background:notif.color,boxShadow:`0 0 8px ${notif.color}`,flexShrink:0}}/>
      <span style={{fontSize:"0.84rem",fontWeight:500,flex:1}}>{notif.msg}</span>
    </div>
  );
}

function AuthPage(){
  const {authMode,setAuthMode,login,signup,triggerSOS}=useContext(Ctx);
  const [email,setEmail]=useState("demo@rescuegrid.in");
  const [pass,setPass]=useState("demo123");
  const [name,setName]=useState("");
  const [blood,setBlood]=useState("O+");
  const [age,setAge]=useState("28");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  const submit=(e)=>{
    e.preventDefault();
    setErr("");
    if(authMode==="signup"&&name.trim().length<2){setErr("Please enter your full name.");return;}
    if(email.trim().length<4){setErr("Enter a valid email.");return;}
    if(pass.length<4){setErr("Password must be at least 4 characters.");return;}
    setLoading(true);
    setTimeout(()=>{
      if(authMode==="login") login(email.trim(),pass,null,blood,age);
      else signup(email.trim(),pass,name.trim(),blood,age);
      setLoading(false);
    },650);
  };

  return(
    <div className="auth-root">
      <div className="auth-grid">
        <div className="auth-left">
          <div>
            <div className="auth-logo">Rescue<span>Grid</span></div>
            <p style={{fontSize:"0.78rem",color:"var(--text2)",marginTop:4}}>India's Emergency Response Platform</p>
          </div>
          <div>
            <div className="auth-tagline">Every second counts in an emergency.</div>
            <p style={{fontSize:"0.82rem",color:"var(--text2)",marginTop:10,lineHeight:1.65}}>
              Real-time ambulance dispatch, health monitoring, and emergency coordination — all in one place.
            </p>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[["🚑","Instant ambulance with live GPS tracking"],["🏥","Nearby hospitals & emergency contacts"],["📊","Personal health dashboard & report uploads"],["🆘","One-tap SOS even before you log in"]].map(([ic,t])=>(
              <div key={t} className="auth-feat"><span style={{fontSize:"1.1rem"}}>{ic}</span><span>{t}</span></div>
            ))}
          </div>
          <div style={{marginTop:"auto",paddingTop:12}}>
            <p style={{fontSize:"0.68rem",color:"var(--text3)",textAlign:"center",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:12}}>Emergency? No login needed</p>
            <div className="sos-ring-wrap" style={{marginBottom:12}}>
              <div className="sos-ring"/><div className="sos-ring"/>
              <button className="big-sos" onClick={triggerSOS}>SOS<span className="big-sos-sub">EMERGENCY</span></button>
            </div>
            <p style={{fontSize:"0.7rem",color:"var(--text3)",textAlign:"center",lineHeight:1.5}}>
              Tap SOS to dispatch the nearest ambulance to your GPS location instantly — free, no account needed.
            </p>
          </div>
        </div>

        <div className="auth-right">
          <div>
            <h2 style={{fontFamily:"var(--fh)",fontSize:"1.45rem",fontWeight:800,marginBottom:4}}>
              {authMode==="login"?"Welcome back 👋":"Create your account"}
            </h2>
            <p style={{fontSize:"0.81rem",color:"var(--text2)"}}>
              {authMode==="login"?"New here? ":"Already registered? "}
              <span style={{color:"var(--blue)",cursor:"pointer",fontWeight:600}} onClick={()=>setAuthMode(authMode==="login"?"signup":"login")}>
                {authMode==="login"?"Create account →":"Sign in →"}
              </span>
            </p>
          </div>

          <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:13}}>
            {authMode==="signup"&&(
              <div><label className="lbl">Full Name</label><input className="inp" placeholder="Arjun Sharma" value={name} onChange={e=>setName(e.target.value)} required/></div>
            )}
            <div><label className="lbl">Email Address</label><input className="inp" type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
            <div><label className="lbl">Password</label><input className="inp" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} required/></div>
            {authMode==="signup"&&(
              <div className="grid2">
                <div><label className="lbl">Blood Group</label>
                  <select className="inp" style={{appearance:"none"}} value={blood} onChange={e=>setBlood(e.target.value)}>
                    {["O+","A+","B+","AB+","O-","A-","B-","AB-"].map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div><label className="lbl">Age</label><input className="inp" type="number" placeholder="25" min="1" max="120" value={age} onChange={e=>setAge(e.target.value)}/></div>
              </div>
            )}
            {err&&<div style={{background:"rgba(255,45,85,0.1)",border:"1px solid rgba(255,45,85,0.3)",borderRadius:9,padding:"9px 13px",fontSize:"0.8rem",color:"var(--red)"}}>⚠️ {err}</div>}
            <button type="submit" className="btn btn-blue" style={{width:"100%",padding:"13px",marginTop:2}}>
              {loading?(
                <><div className="spin" style={{width:18,height:18,borderWidth:2}}/>&nbsp;Verifying…</>
              ):(
                authMode==="login"?"Sign In →":"Create Account →"
              )}
            </button>
          </form>

          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1,height:1,background:"var(--border)"}}/>
            <span style={{fontSize:"0.7rem",color:"var(--text3)"}}>OR</span>
            <div style={{flex:1,height:1,background:"var(--border)"}}/>
          </div>

          <div>
            <p style={{fontSize:"0.68rem",color:"var(--text3)",textAlign:"center",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>⚡ Immediate Emergency Access</p>
            <button className="sos-main-btn" onClick={triggerSOS}>
              🚑 &nbsp; EMERGENCY SOS — DISPATCH AMBULANCE
            </button>
            <p style={{fontSize:"0.7rem",color:"var(--text3)",textAlign:"center",marginTop:7,lineHeight:1.5}}>
              Dispatches to your GPS instantly. Completely free. No account required.
            </p>
          </div>

          <div style={{background:"rgba(10,132,255,0.07)",border:"1px solid rgba(10,132,255,0.2)",borderRadius:10,padding:"10px 14px"}}>
            <p style={{fontSize:"0.74rem",color:"var(--text2)"}}>
              <strong style={{color:"var(--blue)"}}>Demo: </strong>Use <code style={{background:"rgba(255,255,255,0.08)",padding:"1px 6px",borderRadius:4}}>demo@rescuegrid.in</code> / <code style={{background:"rgba(255,255,255,0.08)",padding:"1px 6px",borderRadius:4}}>demo123</code> to log in instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarInner(){
  const {activePage,setActivePage,user,logout,setSideOpen}=useContext(Ctx);
  const {trackSt}=useContext(Ctx);
  const items=[
    {id:"dashboard",icon:"📊",label:"Dashboard"},
    {id:"tracking",icon:"🗺️",label:"Live Tracking",live:trackSt==="en_route"||trackSt==="dispatching"},
    {id:"health",icon:"❤️",label:"Health Records"},
    {id:"hospitals",icon:"🏥",label:"Nearby Hospitals"},
    {id:"emergency",icon:"🆘",label:"Emergency Numbers"},
  ];
  const go=(id)=>{setActivePage(id);setSideOpen(false);};
  return(
    <>
      <div className="sidebar-logo">Rescue<span>Grid</span></div>
      {items.map(it=>(
        <div key={it.id} className={`ni ${activePage===it.id?"active":""}`} onClick={()=>go(it.id)}>
          <span className="ni-icon">{it.icon}</span>
          <span style={{flex:1}}>{it.label}</span>
          {it.live&&<div className="badge b-red" style={{padding:"2px 7px",fontSize:"0.6rem"}}><div className="pdot"/>LIVE</div>}
        </div>
      ))}
      <div className="sidebar-bot">
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",marginBottom:6}}>
          <div className="av" style={{width:34,height:34,fontSize:"0.84rem"}}>{user?.name?.[0]||"U"}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:600,fontSize:"0.82rem",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user?.name}</div>
            <div style={{fontSize:"0.67rem",color:"var(--text2)"}}>{user?.blood} · {user?.age} yrs</div>
          </div>
        </div>
        <div className="ni" onClick={logout}><span className="ni-icon">🚪</span>Sign Out</div>
      </div>
    </>
  );
}

function LiveMap(){
  const {userLoc,assigned,theme}=useContext(Ctx);
  const ref=useRef(null);const mR=useRef(null);
  const pM=useRef(null);const aM=useRef(null);const poly=useRef(null);const trail=useRef(null);const tc=useRef([]);const done=useRef(false);const tileRef=useRef(null);
  const tileUrl=theme==="light"?"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png":"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  useEffect(()=>{
    if(done.current||!ref.current) return;done.current=true;
    const m=L.map(ref.current,{zoomControl:false,attributionControl:false}).setView([userLoc.lat,userLoc.lng],14);
    L.control.zoom({position:"bottomright"}).addTo(m);
    mR.current=m;
  },[]);
  useEffect(()=>{
    const m=mR.current;
    if(!m) return;
    if(tileRef.current) m.removeLayer(tileRef.current);
    tileRef.current=L.tileLayer(tileUrl,{maxZoom:19}).addTo(m);
  },[tileUrl]);
  useEffect(()=>{
    const m=mR.current;if(!m||!assigned) return;
    const pH=`<div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;width:22px;height:22px;border-radius:50%;background:rgba(255,45,85,0.2);animation:pAR 1.6s ease-out infinite;"></div><div style="width:13px;height:13px;border-radius:50%;background:#ff2d55;border:2.5px solid #fff;box-shadow:0 0 12px rgba(255,45,85,0.75);position:relative;z-index:1;"></div></div><style>@keyframes pAR{0%{transform:scale(1);opacity:0.6}100%{transform:scale(2.5);opacity:0}}</style>`;
    const aH=`<div style="background:linear-gradient(135deg,#1a95ff,#004db8);width:42px;height:42px;border-radius:13px;border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 0 22px rgba(10,132,255,0.7);display:flex;align-items:center;justify-content:center;font-size:20px;">🚑</div>`;
    const pI=L.divIcon({className:"",html:pH,iconSize:[22,22],iconAnchor:[11,11]});
    const aI=L.divIcon({className:"",html:aH,iconSize:[42,42],iconAnchor:[21,21]});
    if(!pM.current) pM.current=L.marker([userLoc.lat,userLoc.lng],{icon:pI,zIndexOffset:100}).addTo(m).bindPopup("<b>📍 Your Location</b>",{closeButton:false});
    if(!aM.current) aM.current=L.marker([assigned.lat,assigned.lng],{icon:aI,zIndexOffset:200}).addTo(m).bindPopup(`<b>🚑 ${assigned.vehicle}</b><br>Driver: ${assigned.driver}<br>📞 ${assigned.phone}`,{closeButton:false});
    else aM.current.setLatLng([assigned.lat,assigned.lng]);
    tc.current.push([assigned.lat,assigned.lng]);
    if(tc.current.length>100) tc.current.shift();
    const mid={lat:(assigned.lat*0.55+userLoc.lat*0.45)+(userLoc.lng-assigned.lng)*0.055,lng:(assigned.lng*0.55+userLoc.lng*0.45)+(userLoc.lat-assigned.lat)*0.055};
    const rc=[[assigned.lat,assigned.lng],[mid.lat,mid.lng],[userLoc.lat,userLoc.lng]];
    if(poly.current) poly.current.setLatLngs(rc);
    else poly.current=L.polyline(rc,{color:"#0a84ff",weight:5,opacity:0.9,dashArray:"13 7",lineCap:"round"}).addTo(m);
    if(tc.current.length>1){if(trail.current) trail.current.setLatLngs(tc.current);else trail.current=L.polyline(tc.current,{color:"rgba(10,132,255,0.3)",weight:3,lineCap:"round"}).addTo(m);}
    m.fitBounds(L.latLngBounds([[userLoc.lat,userLoc.lng],[assigned.lat,assigned.lng]]),{padding:[80,80],maxZoom:16});
  },[assigned,userLoc]);
  return <div ref={ref} id="live-map" style={{width:"100%",height:"100%"}}/>;
}

function TrackingPage(){
  const {assigned,trackSt,etaSec,cancelSOS,userLoc,triggerSOS,showNotif}=useContext(Ctx);
  const mins=etaSec!=null?Math.floor(etaSec/60):"--";
  const secs=etaSec!=null?String(etaSec%60).padStart(2,"0"):"--";
  const dist=assigned?hav(userLoc.lat,userLoc.lng,assigned.lat,assigned.lng):0;
  const speed=assigned&&etaSec>0?(dist/(etaSec/3600)).toFixed(1):"--";
  const sl=trackSt==="reached"?"Arrived 🎉":trackSt==="en_route"?"En Route ▶":"Dispatching…";
  const sc=trackSt==="reached"?"b-green":trackSt==="en_route"?"b-blue":"b-amber";

  if(trackSt==="idle"||!assigned) return(
    <div className="dispatch-screen fu">
      <div style={{fontSize:"4rem",marginBottom:8}}>🚑</div>
      <div style={{fontFamily:"var(--fh)",fontSize:"1.3rem",fontWeight:800}}>No Active Emergency</div>
      <p style={{color:"var(--text2)",fontSize:"0.88rem",maxWidth:340,lineHeight:1.6}}>
        Press the SOS button to dispatch the nearest available ambulance to your location instantly.
      </p>
      <button className="btn btn-red" style={{marginTop:8,fontSize:"0.95rem",padding:"13px 30px"}} onClick={triggerSOS}>
        🚑 Trigger SOS Now
      </button>
    </div>
  );

  if(trackSt==="dispatching") return(
    <div className="dispatch-screen">
      <div className="spin" style={{width:52,height:52,borderWidth:4}}/>
      <div style={{fontFamily:"var(--fh)",fontSize:"1.2rem",fontWeight:700}}>Dispatching nearest ambulance…</div>
      <p style={{color:"var(--text2)",fontSize:"0.85rem"}}>Running Haversine shortest-path algorithm…</p>
    </div>
  );

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
      <div className="track-wrap" style={{flex:1}}>
        <LiveMap/>
        <div className="ov-top">
          <div className="eta-card">
            <div style={{fontSize:"0.61rem",color:"var(--text2)",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:5}}>⏱ Est. Arrival</div>
            <div className="eta-v">{mins}<span style={{fontSize:"1rem",opacity:0.65}}>m</span> {secs}<span style={{fontSize:"1rem",opacity:0.65}}>s</span></div>
            <div style={{fontSize:"0.7rem",color:"var(--text2)",marginTop:3}}>{dist.toFixed(2)} km · {speed} km/h</div>
          </div>
          <div className="stat-pill">
            <div className={"badge "+sc} style={{marginBottom:7}}><div className="pdot"/>{sl}</div>
            <div style={{fontSize:"0.7rem",color:"var(--text2)",fontFamily:"var(--fh)",fontWeight:700,marginBottom:1}}>{assigned.vehicle}</div>
            <div style={{fontSize:"0.67rem",color:"var(--text2)",marginBottom:4}}>{assigned.driver}</div>
            <a href={"tel:"+assigned.phone} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 8px",background:"rgba(48,209,88,0.12)",border:"1px solid rgba(48,209,88,0.25)",borderRadius:7,textDecoration:"none",cursor:"pointer"}} onClick={e=>{e.preventDefault();showNotif("📞 Calling driver "+assigned.driver+": "+assigned.phone,"#30d158");}}>
              <span style={{fontSize:"0.8rem"}}>📞</span>
              <span style={{fontFamily:"var(--fm)",fontWeight:700,fontSize:"0.7rem",color:"var(--green)"}}>{assigned.phone}</span>
            </a>
          </div>
        </div>
        <div className="ov-bot">
          <div style={{marginBottom:9}}>
            <div style={{fontSize:"0.6rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:7,fontWeight:700}}>🚑 Assigned Ambulance</div>
            <div className="live-row" style={{marginBottom:0,alignItems:"stretch",flexDirection:"column",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:42,height:42,borderRadius:12,background:"linear-gradient(135deg,#1a95ff,#004db8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem",flexShrink:0,border:"2px solid rgba(255,255,255,0.15)"}}>🚑</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"var(--fh)",fontWeight:800,fontSize:"0.95rem"}}>{assigned.vehicle}</div>
                  <div style={{fontSize:"0.7rem",color:"var(--text2)",marginTop:1}}>{assigned.base||"City Base"}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}><div className="live-dot"/><span style={{fontSize:"0.64rem",color:"var(--green)",fontFamily:"var(--fh)",fontWeight:700}}>LIVE GPS</span></div>
                  <span style={{fontSize:"0.64rem",color:"var(--text2)",fontFamily:"var(--fm)"}}>{dist.toFixed(2)} km</span>
                </div>
              </div>
              <div style={{height:1,background:"var(--border)"}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div>
                  <div style={{fontSize:"0.6rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>Driver</div>
                  <div style={{fontWeight:600,fontSize:"0.84rem"}}>{assigned.driver}</div>
                  <a href={"tel:"+assigned.phone} style={{display:"flex",alignItems:"center",gap:5,marginTop:5,padding:"6px 10px",background:"rgba(48,209,88,0.12)",border:"1px solid rgba(48,209,88,0.25)",borderRadius:8,cursor:"pointer",textDecoration:"none"}} onClick={e=>{e.preventDefault();showNotif("📞 Calling driver: "+assigned.phone,"#30d158");}}>
                    <span style={{fontSize:"0.85rem"}}>📞</span>
                    <span style={{fontFamily:"var(--fm)",fontWeight:700,fontSize:"0.78rem",color:"var(--green)"}}>{assigned.phone}</span>
                  </a>
                </div>
                <div>
                  <div style={{fontSize:"0.6rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>Paramedic</div>
                  <div style={{fontWeight:600,fontSize:"0.84rem"}}>{assigned.paramedic||"On Board"}</div>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginTop:5,padding:"6px 10px",background:"rgba(10,132,255,0.1)",border:"1px solid rgba(10,132,255,0.22)",borderRadius:8}}>
                    <span style={{fontSize:"0.85rem"}}>🩺</span>
                    <span style={{fontSize:"0.75rem",color:"var(--blue)"}}>Certified EMT</span>
                  </div>
                </div>
              </div>
              <div style={{height:1,background:"var(--border)"}}/>
              <div style={{fontSize:"0.6rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>Nearest Hospitals En Route</div>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {HOSPITALS.slice(0,2).map(h=>(
                  <div key={h.id} style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:"0.95rem"}}>{h.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:"0.78rem",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.name}</div>
                      <div style={{fontSize:"0.67rem",color:"var(--text2)"}}>{h.dist}</div>
                    </div>
                    <a href={"tel:"+h.emergency} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",background:"rgba(255,45,85,0.1)",border:"1px solid rgba(255,45,85,0.22)",borderRadius:7,textDecoration:"none",cursor:"pointer"}} onClick={e=>{e.preventDefault();showNotif("📞 Calling "+h.name+": "+h.emergency,"#ff2d55");}}>
                      <span style={{fontSize:"0.75rem"}}>📞</span>
                      <span style={{fontFamily:"var(--fm)",fontSize:"0.7rem",color:"var(--red)",fontWeight:700}}>{h.emergency}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost" style={{width:"100%",borderColor:"rgba(255,45,85,0.3)",color:"var(--red)"}} onClick={cancelSOS}>
            ✕ Cancel Emergency
          </button>
        </div>
        {trackSt==="reached"&&(
          <div className="reached-ov">
            <div className="reach-icon">✅</div>
            <div style={{fontFamily:"var(--fh)",fontSize:"1.5rem",fontWeight:800,textAlign:"center"}}>Ambulance Arrived!</div>
            <p style={{color:"var(--text2)",fontSize:"0.86rem",textAlign:"center",maxWidth:260,lineHeight:1.55}}>Help has reached your location. Stay calm and follow the paramedic's instructions.</p>
            <button className="btn btn-ghost" style={{marginTop:4}} onClick={cancelSOS}>Close & Reset</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardPage(){
  const {user,health,userLoc,ambs,trackSt,setActivePage,triggerSOS,docs}=useContext(Ctx);
  const vacant=ambs.filter(a=>a.status==="vacant").length;
  return(
    <div className="page fu">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26,flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontFamily:"var(--fh)",fontSize:"1.55rem",fontWeight:800}}>
            Good day, {(user?.name||"User").split(" ")[0]} 👋
          </h1>
          <p style={{color:"var(--text2)",fontSize:"0.83rem",marginTop:3}}>Your emergency & health overview</p>
        </div>
        <button className="btn btn-red" style={{fontSize:"0.88rem"}} onClick={triggerSOS}>🚑 SOS Emergency</button>
      </div>

      <div className="grid4" style={{marginBottom:20}}>
        {[
          {icon:"🚑",label:"Ambulances Ready",val:vacant,color:"var(--green)",bc:"b-green",sub:"Available now"},
          {icon:"📍",label:"Location",val:"Chennai",color:"var(--blue)",bc:"b-blue",sub:`${userLoc.lat.toFixed(3)}°N`},
          {icon:"🏥",label:"Nearby Hospitals",val:HOSPITALS.length,color:"var(--teal)",bc:"b-teal",sub:"Within 5 km"},
          {icon:"📋",label:"My Documents",val:docs.length,color:"var(--amber)",bc:"b-amber",sub:"Uploaded"},
        ].map(s=>(
          <div key={s.label} className="glass3 hov" style={{padding:"16px 17px",cursor:"default"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:"1.35rem"}}>{s.icon}</span>
              <div className={"badge "+s.bc}>{s.label}</div>
            </div>
            <div className="stat-v" style={{color:s.color,fontSize:"1.6rem"}}>{s.val}</div>
            <div style={{fontSize:"0.71rem",color:"var(--text2)",marginTop:4}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid2" style={{marginBottom:22}}>
        <div>
          <div className="shead">Vital Signs</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[
              {icon:"❤️",label:"Heart Rate",val:health.heartRate,unit:"bpm",color:"var(--red)",pct:74},
              {icon:"🩸",label:"Blood Oxygen",val:health.bloodO2,unit:"%",color:"var(--blue)",pct:98},
              {icon:"⚖️",label:"Weight",val:health.weight,unit:"kg",color:"var(--amber)",pct:60},
              {icon:"🩺",label:"Blood Pressure",val:health.bp,unit:"mmHg",color:"var(--green)",pct:80},
            ].map(m=>(
              <div key={m.label} className="glass3" style={{padding:"13px 15px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
                  <span style={{fontSize:"1.1rem"}}>{m.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.65rem",color:"var(--text2)",textTransform:"uppercase",letterSpacing:"0.06em"}}>{m.label}</div>
                    <div style={{fontFamily:"var(--fh)",fontSize:"1.15rem",fontWeight:700,color:m.color,lineHeight:1.15}}>
                      {m.val} <span style={{fontSize:"0.7rem",color:"var(--text2)",fontFamily:"var(--fb)",fontWeight:400}}>{m.unit}</span>
                    </div>
                  </div>
                  <div className="badge b-green">Normal</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div className="health-bar-wrap"><div className="health-bar" style={{width:m.pct+"%",background:m.color}}/></div>
                  <span style={{fontSize:"0.69rem",color:"var(--text2)",width:28,textAlign:"right"}}>{m.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="shead">Quick Actions</div>
          <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:18}}>
            {[
              {icon:"🗺️",label:"Track Live Ambulance",sub:"View real-time GPS",action:()=>setActivePage("tracking"),c:"var(--blue)"},
              {icon:"🏥",label:"Find Nearest Hospital",sub:"Map & directory",action:()=>setActivePage("hospitals"),c:"var(--teal)"},
              {icon:"📂",label:"Upload Health Record",sub:"Add medical reports",action:()=>setActivePage("health"),c:"var(--amber)"},
              {icon:"🆘",label:"Emergency Numbers",sub:"All helplines",action:()=>setActivePage("emergency"),c:"var(--red)"},
            ].map(q=>(
              <div key={q.label} className="glass3 hov" style={{padding:"13px 15px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}} onClick={q.action}>
                <div style={{width:38,height:38,borderRadius:11,background:q.c+"1a",border:"1px solid "+q.c+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.15rem",flexShrink:0}}>{q.icon}</div>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:"0.87rem"}}>{q.label}</div><div style={{fontSize:"0.72rem",color:"var(--text2)"}}>{q.sub}</div></div>
                <span style={{color:"var(--text3)",fontSize:"0.9rem"}}>›</span>
              </div>
            ))}
          </div>

          <div className="shead">Recent Documents</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {docs.slice(-3).map((d,i)=>(
              <div key={i} className="glass3" style={{padding:"10px 13px",display:"flex",alignItems:"center",gap:9}}>
                <span style={{fontSize:"1.1rem"}}>{d.name.endsWith(".pdf")?"📄":"🖼️"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:500,fontSize:"0.81rem",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.name}</div>
                  <div style={{fontSize:"0.67rem",color:"var(--text2)"}}>{d.date}</div>
                </div>
                <div className="badge b-blue">{d.type}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="shead">Emergency Profile</div>
      <div className="glass3" style={{padding:"16px 18px"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div className="av" style={{width:50,height:50,fontSize:"1.15rem"}}>{user?.name?.[0]}</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"var(--fh)",fontWeight:700,fontSize:"0.98rem"}}>{user?.name}</div>
            <div style={{fontSize:"0.76rem",color:"var(--text2)",marginTop:2}}>{user?.email}</div>
          </div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
            <div className="badge b-red">🩸 {user?.blood||"O+"}</div>
            <div className="badge b-amber">⚠️ {user?.allergies||"Penicillin"}</div>
            <div className="badge b-blue">👤 {user?.age||28} yrs</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthPage(){
  const {health,setHealth,docs,setDocs,showNotif}=useContext(Ctx);
  const [drag,setDrag]=useState(false);
  const [showModal,setShowModal]=useState(false);
  const [newDoc,setNewDoc]=useState({name:"",type:"Lab Report",date:new Date().toISOString().slice(0,10)});

  const handleDrop=e=>{
    e.preventDefault();setDrag(false);
    const f=e.dataTransfer?.files?.[0];
    if(f){setDocs(p=>[...p,{name:f.name,date:new Date().toISOString().slice(0,10),type:"Document",size:(f.size/1024).toFixed(0)+" KB"}]);showNotif("Uploaded: "+f.name);}
  };
  const addDoc=()=>{
    if(!newDoc.name){showNotif("Enter a document name","#ff9f0a");return;}
    setDocs(p=>[...p,{...newDoc,size:"—"}]);
    setNewDoc({name:"",type:"Lab Report",date:new Date().toISOString().slice(0,10)});
    setShowModal(false);showNotif("Record added ✅");
  };

  const metrics=[
    {key:"heartRate",label:"Heart Rate",unit:"bpm",icon:"❤️",color:"#ff2d55",min:40,max:180,normal:"60–100 bpm"},
    {key:"bloodO2",label:"Blood Oxygen",unit:"%",icon:"🩸",color:"#0a84ff",min:85,max:100,normal:"95–100%"},
    {key:"weight",label:"Weight",unit:"kg",icon:"⚖️",color:"#ffd60a",min:30,max:200,normal:"BMI 18–25"},
    {key:"glucose",label:"Blood Glucose",unit:"mg/dL",icon:"🧪",color:"#30d158",min:60,max:300,normal:"70–100"},
    {key:"steps",label:"Steps Today",unit:"steps",icon:"🚶",color:"#5ac8fa",min:0,max:20000,normal:"10,000+"},
    {key:"sleep",label:"Sleep Hours",unit:"hrs",icon:"😴",color:"#bf5af2",min:0,max:12,normal:"7–9 hrs"},
  ];

  return(
    <div className="page fu">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div><h1 style={{fontFamily:"var(--fh)",fontSize:"1.45rem",fontWeight:800}}>❤️ Health Records</h1>
        <p style={{color:"var(--text2)",fontSize:"0.82rem",marginTop:3}}>Track vitals & manage medical documents</p></div>
        <button className="btn btn-blue" onClick={()=>setShowModal(true)}>📂 Add Record</button>
      </div>

      <div className="shead">Live Vitals — Drag sliders to update</div>
      <div className="grid3" style={{marginBottom:26}}>
        {metrics.map(m=>(
          <div key={m.key} className="glass3 hov" style={{padding:"15px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:11}}>
              <span style={{fontSize:"1.2rem"}}>{m.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:"0.63rem",color:"var(--text2)",textTransform:"uppercase",letterSpacing:"0.06em"}}>{m.label}</div>
                <div style={{fontFamily:"var(--fh)",fontSize:"1.25rem",fontWeight:700,color:m.color,lineHeight:1.1}}>
                  {health[m.key]} <span style={{fontSize:"0.68rem",color:"var(--text2)",fontFamily:"var(--fb)",fontWeight:400}}>{m.unit}</span>
                </div>
              </div>
            </div>
            <input type="range" min={m.min} max={m.max} value={health[m.key]} onChange={e=>setHealth(p=>({...p,[m.key]:Number(e.target.value)}))} style={{width:"100%",accentColor:m.color,cursor:"pointer",height:4}}/>
            <div style={{fontSize:"0.61rem",color:"var(--text3)",marginTop:5}}>Normal: {m.normal}</div>
          </div>
        ))}
      </div>

      <div className="grid2">
        <div>
          <div className="shead">Upload Documents</div>
          <div className={"upload-zone"+(drag?" drag":"")} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={handleDrop} onClick={()=>setShowModal(true)}>
            <div style={{fontSize:"2.4rem",marginBottom:10}}>📁</div>
            <div style={{fontWeight:600,marginBottom:5}}>Drop files or click to browse</div>
            <div style={{fontSize:"0.77rem",color:"var(--text2)"}}>PDF, JPG, PNG, DICOM · Max 20MB</div>
            <button className="btn btn-blue" style={{marginTop:14,padding:"9px 20px",fontSize:"0.82rem"}} onClick={e=>{e.stopPropagation();setShowModal(true);}}>+ Add Record</button>
          </div>
        </div>
        <div>
          <div className="shead">My Documents ({docs.length})</div>
          <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:340,overflowY:"auto"}}>
            {docs.map((d,i)=>(
              <div key={i} className="glass3" style={{padding:"11px 14px",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:"1.25rem"}}>{d.name.match(/\.(jpg|jpeg|png)$/i)?"🖼️":d.name.endsWith(".pdf")?"📄":"📋"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:500,fontSize:"0.82rem",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.name}</div>
                  <div style={{fontSize:"0.67rem",color:"var(--text2)"}}>{d.date} · {d.size}</div>
                </div>
                <div className="badge b-blue" style={{marginRight:6}}>{d.type}</div>
                <button onClick={()=>{setDocs(p=>p.filter((_,j)=>j!==i));showNotif("Removed");}} style={{color:"var(--text3)",fontSize:"0.88rem",lineHeight:1,padding:2}}>✕</button>
              </div>
            ))}
            {docs.length===0&&<div style={{color:"var(--text3)",fontSize:"0.83rem",textAlign:"center",padding:"20px 0"}}>No documents yet. Upload your first record.</div>}
          </div>
        </div>
      </div>

      {showModal&&(
        <div className="overlay-modal">
          <div className="modal-box">
            <h3 style={{fontFamily:"var(--fh)",fontSize:"1.1rem",fontWeight:700,marginBottom:18}}>📂 Add Health Record</h3>
            <div style={{display:"flex",flexDirection:"column",gap:13}}>
              <div><label className="lbl">Document Name</label><input className="inp" placeholder="e.g. Blood Test Report.pdf" value={newDoc.name} onChange={e=>setNewDoc(p=>({...p,name:e.target.value}))}/></div>
              <div><label className="lbl">Type</label>
                <select className="inp" style={{appearance:"none"}} value={newDoc.type} onChange={e=>setNewDoc(p=>({...p,type:e.target.value}))}>
                  {["Lab Report","Cardiac","Radiology","Prescription","Discharge Summary","Vaccination","Other"].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="lbl">Date</label><input className="inp" type="date" value={newDoc.date} onChange={e=>setNewDoc(p=>({...p,date:e.target.value}))}/></div>
              <div style={{display:"flex",gap:10,marginTop:2}}>
                <button className="btn btn-blue" style={{flex:1}} onClick={addDoc}>Add Record</button>
                <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setShowModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HospitalsPage(){
  const {userLoc,showNotif,theme}=useContext(Ctx);
  const mapRef=useRef(null);const done=useRef(false);const mapInst=useRef(null);const tileRef=useRef(null);
  const tileUrl=theme==="light"?"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png":"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  useEffect(()=>{
    if(done.current||!mapRef.current) return;done.current=true;
    const m=L.map(mapRef.current,{zoomControl:false,attributionControl:false}).setView([userLoc.lat,userLoc.lng],12);
    L.control.zoom({position:"bottomright"}).addTo(m);
    mapInst.current=m;
    const uI=L.divIcon({className:"",html:`<div style="width:14px;height:14px;border-radius:50%;background:#ff2d55;border:3px solid #fff;box-shadow:0 0 14px rgba(255,45,85,0.7)"></div>`,iconSize:[14,14],iconAnchor:[7,7]});
    L.marker([userLoc.lat,userLoc.lng],{icon:uI}).addTo(m).bindPopup("<b>📍 You are here</b>",{closeButton:false});
    HOSPITALS.forEach(h=>{
      const hI=L.divIcon({className:"",html:`<div style="background:linear-gradient(135deg,#30d158,#1a7a38);width:36px;height:36px;border-radius:10px;border:2px solid rgba(255,255,255,0.85);box-shadow:0 0 14px rgba(48,209,88,0.5);display:flex;align-items:center;justify-content:center;font-size:17px;">${h.icon}</div>`,iconSize:[36,36],iconAnchor:[18,18]});
      L.marker([h.lat,h.lng],{icon:hI}).addTo(m).bindPopup(`<b>${h.name}</b><br>${h.type}<br>⭐ ${h.rating} · 🛏 ${h.beds}`,{closeButton:false});
    });
  },[]);
  useEffect(()=>{
    const m=mapInst.current;
    if(!m) return;
    if(tileRef.current) m.removeLayer(tileRef.current);
    tileRef.current=L.tileLayer(tileUrl,{maxZoom:19}).addTo(m);
  },[tileUrl]);
  return(
    <div className="page fu">
      <div style={{marginBottom:20}}>
        <h1 style={{fontFamily:"var(--fh)",fontSize:"1.45rem",fontWeight:800}}>🏥 Nearby Hospitals</h1>
        <p style={{color:"var(--text2)",fontSize:"0.82rem",marginTop:3}}>All hospitals within your vicinity — open 24/7</p>
      </div>
      <div id="hosp-map-div" ref={mapRef} style={{height:350,borderRadius:16,overflow:"hidden",marginBottom:22}}/>
      <div className="shead">Hospital Directory</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {HOSPITALS.map(h=>(
          <div key={h.id} className="glass3 hov" style={{padding:"15px 18px",cursor:"default"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:14,flexWrap:"wrap"}}>
              <div style={{width:46,height:46,borderRadius:14,background:"rgba(48,209,88,0.11)",border:"1px solid rgba(48,209,88,0.22)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.35rem",flexShrink:0}}>{h.icon}</div>
              <div style={{flex:1,minWidth:160}}>
                <div style={{fontFamily:"var(--fh)",fontWeight:700,fontSize:"0.95rem"}}>{h.name}</div>
                <div style={{fontSize:"0.74rem",color:"var(--text2)",marginTop:2}}>{h.type}</div>
                <div style={{fontSize:"0.72rem",color:"var(--text3)",marginTop:3,lineHeight:1.4}}>📍 {h.addr}</div>
                <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                  <a href={"tel:"+h.phone} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",background:"rgba(10,132,255,0.1)",border:"1px solid rgba(10,132,255,0.25)",borderRadius:9,textDecoration:"none",cursor:"pointer"}} onClick={e=>{e.preventDefault();showNotif("📞 Calling "+h.name+": "+h.phone,"#0a84ff");}}>
                    <span style={{fontSize:"0.9rem"}}>📞</span>
                    <div>
                      <div style={{fontSize:"0.6rem",color:"var(--text3)",letterSpacing:"0.06em"}}>MAIN</div>
                      <div style={{fontFamily:"var(--fm)",fontWeight:700,fontSize:"0.76rem",color:"var(--blue)"}}>{h.phone}</div>
                    </div>
                  </a>
                  <a href={"tel:"+h.emergency} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",background:"rgba(255,45,85,0.1)",border:"1px solid rgba(255,45,85,0.25)",borderRadius:9,textDecoration:"none",cursor:"pointer"}} onClick={e=>{e.preventDefault();showNotif("🚨 Calling Emergency: "+h.emergency,"#ff2d55");}}>
                    <span style={{fontSize:"0.9rem"}}>🚨</span>
                    <div>
                      <div style={{fontSize:"0.6rem",color:"var(--text3)",letterSpacing:"0.06em"}}>EMERGENCY</div>
                      <div style={{fontFamily:"var(--fm)",fontWeight:700,fontSize:"0.76rem",color:"var(--red)"}}>{h.emergency}</div>
                    </div>
                  </a>
                </div>
              </div>
              <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"flex-start"}}>
                <div className="badge b-green">⭐ {h.rating}</div>
                <div className="badge b-teal">🛏 {h.beds}</div>
                <div className="badge b-blue">🕒 {h.open}</div>
                <div className="badge b-amber">📍 {h.dist}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmergencyPage(){
  const {showNotif,assigned,trackSt}=useContext(Ctx);
  const call=(num,label)=>showNotif("📞 Calling "+label+": "+num,"#ff2d55");
  return(
    <div className="page fu">
      <div style={{marginBottom:20}}>
        <h1 style={{fontFamily:"var(--fh)",fontSize:"1.45rem",fontWeight:800}}>🆘 Emergency Helplines</h1>
        <p style={{color:"var(--text2)",fontSize:"0.82rem",marginTop:3}}>India's official emergency numbers — toll-free, 24/7</p>
      </div>
      <div style={{background:"rgba(255,45,85,0.08)",border:"1px solid rgba(255,45,85,0.25)",borderRadius:14,padding:"14px 18px",marginBottom:22,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
        <span style={{fontSize:"1.5rem"}}>⚡</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:600,fontSize:"0.9rem"}}>Life-threatening emergency?</div>
          <div style={{fontSize:"0.77rem",color:"var(--text2)"}}>Call 112 (National Emergency) or tap SOS for instant ambulance dispatch</div>
        </div>
        <button className="btn btn-red" style={{flexShrink:0}} onClick={()=>call("112","National Emergency")}>📞 Call 112</button>
      </div>

      <div className="shead">National Emergency Numbers</div>
      <div className="grid2" style={{marginBottom:22}}>
        {ENUMS.map(e=>(
          <div key={e.num} className="ec-card" onClick={()=>call(e.num,e.label)}>
            <div style={{width:44,height:44,borderRadius:13,background:e.color+"1a",border:"1px solid "+e.color+"30",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem",flexShrink:0}}>{e.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"var(--fh)",fontWeight:700,fontSize:"0.9rem"}}>{e.label}</div>
              <div style={{fontSize:"0.72rem",color:"var(--text2)",marginTop:2}}>{e.desc}</div>
            </div>
            <div style={{fontFamily:"var(--fm)",fontWeight:700,fontSize:"1rem",color:e.color,flexShrink:0}}>{e.num}</div>
          </div>
        ))}
      </div>

      <div className="shead">Tamil Nadu State Helplines</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:24}}>
        {TN_NUMS.map(e=>(
          <div key={e.num} className="glass3" style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:13,cursor:"pointer"}} onClick={()=>call(e.num,e.label)}>
            <span style={{fontSize:"1.2rem"}}>{e.icon}</span>
            <span style={{flex:1,fontWeight:500,fontSize:"0.85rem"}}>{e.label}</span>
            <span style={{fontFamily:"var(--fm)",fontWeight:700,fontSize:"0.95rem",color:e.color}}>{e.num}</span>
            <span style={{color:"var(--text3)"}}>›</span>
          </div>
        ))}
      </div>

      {assigned&&(
        <div style={{marginBottom:24}}>
          <div style={{background:"rgba(255,45,85,0.07)",border:"1px solid rgba(255,45,85,0.22)",borderRadius:16,padding:"16px 18px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:"var(--red)",boxShadow:"0 0 8px var(--red)",animation:"pdA 1.2s ease-in-out infinite"}}/>
              <div style={{fontFamily:"var(--fh)",fontWeight:700,fontSize:"0.85rem",color:"var(--red)",textTransform:"uppercase",letterSpacing:"0.06em"}}>Active Emergency — Assigned Unit</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,padding:"12px 14px",background:"rgba(255,255,255,0.04)",borderRadius:12,border:"1px solid var(--border)"}}>
              <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#1a95ff,#004db8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",flexShrink:0}}>🚑</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"var(--fh)",fontWeight:800,fontSize:"0.95rem"}}>{assigned.vehicle}</div>
                <div style={{fontSize:"0.73rem",color:"var(--text2)",marginTop:2}}>{assigned.base} · Driver: {assigned.driver}</div>
                <div style={{fontSize:"0.71rem",color:"var(--text2)"}}>Paramedic: {assigned.paramedic}</div>
              </div>
              <div className={"badge "+(trackSt==="reached"?"b-green":trackSt==="en_route"?"b-red":"b-amber")}>
                <div className="pdot"/>{trackSt==="reached"?"Arrived":trackSt==="en_route"?"En Route":"Dispatching"}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:"0.62rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>Driver Contact</div>
                <a href={"tel:"+assigned.phone} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"rgba(48,209,88,0.1)",border:"1px solid rgba(48,209,88,0.25)",borderRadius:11,textDecoration:"none",cursor:"pointer"}} onClick={e=>{e.preventDefault();call(assigned.phone,assigned.driver);}}>
                  <span style={{fontSize:"1.1rem"}}>📞</span>
                  <div>
                    <div style={{fontWeight:600,fontSize:"0.82rem"}}>{assigned.driver}</div>
                    <div style={{fontFamily:"var(--fm)",fontWeight:700,fontSize:"0.78rem",color:"var(--green)",marginTop:1}}>{assigned.phone}</div>
                  </div>
                </a>
              </div>
              <div>
                <div style={{fontSize:"0.62rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>National Ambulance</div>
                <a href="tel:108" style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"rgba(255,45,85,0.1)",border:"1px solid rgba(255,45,85,0.25)",borderRadius:11,textDecoration:"none",cursor:"pointer"}} onClick={e=>{e.preventDefault();call("108","EMRI Ambulance");}}>
                  <span style={{fontSize:"1.1rem"}}>🚑</span>
                  <div>
                    <div style={{fontWeight:600,fontSize:"0.82rem"}}>EMRI Ambulance</div>
                    <div style={{fontFamily:"var(--fm)",fontWeight:700,fontSize:"0.78rem",color:"var(--red)",marginTop:1}}>108</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="shead">Nearby Hospital Emergency Lines</div>
      <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:8}}>
        {HOSPITALS.map(h=>(
          <div key={h.id} className="glass3" style={{padding:"13px 16px"}}>
            <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:10}}>
              <span style={{fontSize:"1.2rem"}}>{h.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"var(--fh)",fontWeight:700,fontSize:"0.88rem"}}>{h.name}</div>
                <div style={{fontSize:"0.71rem",color:"var(--text2)"}}>{h.type} · {h.dist}</div>
              </div>
              <div className="badge b-green">⭐ {h.rating}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <a href={"tel:"+h.phone} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 11px",background:"rgba(10,132,255,0.08)",border:"1px solid rgba(10,132,255,0.2)",borderRadius:9,textDecoration:"none",cursor:"pointer"}} onClick={e=>{e.preventDefault();call(h.phone,h.name);}}>
                <span style={{fontSize:"0.9rem"}}>📞</span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:"0.58rem",color:"var(--text3)",letterSpacing:"0.06em"}}>RECEPTION</div>
                  <div style={{fontFamily:"var(--fm)",fontWeight:700,fontSize:"0.72rem",color:"var(--blue)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.phone}</div>
                </div>
              </a>
              <a href={"tel:"+h.emergency} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 11px",background:"rgba(255,45,85,0.08)",border:"1px solid rgba(255,45,85,0.2)",borderRadius:9,textDecoration:"none",cursor:"pointer"}} onClick={e=>{e.preventDefault();call(h.emergency,h.name+" Emergency");}}>
                <span style={{fontSize:"0.9rem"}}>🚨</span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:"0.58rem",color:"var(--text3)",letterSpacing:"0.06em"}}>EMERGENCY</div>
                  <div style={{fontFamily:"var(--fm)",fontWeight:700,fontSize:"0.72rem",color:"var(--red)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.emergency}</div>
                </div>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppLayout(){
  const {activePage,setActivePage,sideOpen,setSideOpen,triggerSOS,trackSt,user,logout,theme,toggleTheme}=useContext(Ctx);
  const pages={
    dashboard:<DashboardPage/>,
    tracking:<TrackingPage/>,
    health:<HealthPage/>,
    hospitals:<HospitalsPage/>,
    emergency:<EmergencyPage/>,
  };
  const pageTitles={
    dashboard:"Dashboard",
    tracking:"Live Tracking",
    health:"Health Records",
    hospitals:"Nearby Hospitals",
    emergency:"Emergency Helplines",
  };
  const tabItems=[
    {id:"dashboard",icon:"📊",label:"Home"},
    {id:"tracking",icon:"🗺️",label:"Track"},
    {id:"health",icon:"❤️",label:"Health"},
    {id:"hospitals",icon:"🏥",label:"Nearby"},
    {id:"emergency",icon:"🆘",label:"Helplines"},
  ];
  return(
    <div className="layer">
      <div className="topbar">
        <button className="hamburger" onClick={()=>setSideOpen(o=>!o)}>
          <span/><span/><span/>
        </button>
        <div style={{fontFamily:"var(--fh)",fontSize:"1.05rem",fontWeight:800}}>{pageTitles[activePage]||"Dashboard"}</div>
        <div style={{flex:1}}/>
        <button className="theme-toggle-inline" onClick={toggleTheme} title={theme==="dark"?"Switch to light theme":"Switch to dark theme"}>
          {theme==="dark"?"☀️ Light":"🌙 Dark"}
        </button>
        <div className="badge b-green" style={{marginRight:8}}><div className="pdot"/>System Live</div>
        <div className="av" style={{width:34,height:34,fontSize:"0.84rem",cursor:"pointer"}} onClick={logout} title="Sign out">{user?.name?.[0]||"U"}</div>
      </div>

      <div className="app-layout" style={{flex:1,overflow:"hidden",position:"relative"}}>
        {sideOpen&&<div className="mob-overlay" onClick={()=>setSideOpen(false)}/>}
        <div className={"sidebar"+(sideOpen?" open":"")}>
          <SidebarInner/>
        </div>
        <div className="main-content">
          {activePage==="tracking"?<TrackingPage/>:pages[activePage]}
        </div>
      </div>

      <div className="tab-bar">
        <div className="tab-items">
          {tabItems.map(t=>(
            <button key={t.id} className={"tab-btn"+(activePage===t.id?" active":"")} onClick={()=>setActivePage(t.id)}>
              <span className="tab-icon-wrap">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <button className="sos-fab" onClick={triggerSOS} title="Emergency SOS">
        <span style={{fontSize:"1.25rem"}}>🚑</span>
        <span className="sos-fab-lbl">SOS</span>
      </button>
    </div>
  );
}

function GuestTrackPage(){
  const {assigned,trackSt,etaSec,cancelSOS,userLoc,showNotif}=useContext(Ctx);
  const mins=etaSec!=null?Math.floor(etaSec/60):"--";
  const secs=etaSec!=null?String(etaSec%60).padStart(2,"0"):"--";
  const dist=assigned?hav(userLoc.lat,userLoc.lng,assigned.lat,assigned.lng):0;
  const speed=assigned&&etaSec>0?(dist/(etaSec/3600)).toFixed(1):"--";
  const sl=trackSt==="reached"?"Arrived 🎉":trackSt==="en_route"?"En Route ▶":"Dispatching…";
  const sc=trackSt==="reached"?"b-green":trackSt==="en_route"?"b-red":"b-amber";

  if(trackSt==="dispatching"||!assigned) return(
    <div className="layer" style={{alignItems:"center",justifyContent:"center",gap:16}}>
      <div className="bg-mesh"/><div className="bg-grid"/>
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:14,textAlign:"center",padding:24}}>
        <div className="spin" style={{width:52,height:52,borderWidth:4}}/>
        <div style={{fontFamily:"var(--fh)",fontSize:"1.2rem",fontWeight:700}}>Finding nearest ambulance…</div>
        <p style={{color:"var(--text2)",fontSize:"0.84rem"}}>Calculating shortest route via GPS</p>
      </div>
    </div>
  );

  return(
    <div className="layer">
      <div className="bg-mesh"/><div className="bg-grid"/>
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",height:"100%"}}>
        <div className="guest-topbar" style={{padding:"12px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid var(--border)",flexShrink:0}}>
          <div style={{fontFamily:"var(--fh)",fontSize:"1.15rem",fontWeight:800}}>Rescue<span style={{color:"var(--red)"}}>Grid</span></div>
          <div className={"badge "+sc}><div className="pdot"/>{sl}</div>
          <div style={{fontSize:"0.72rem",color:"var(--text2)"}}>Guest Mode</div>
        </div>
        <div style={{flex:1,position:"relative",overflow:"hidden"}}>
          <LiveMap/>
          <div className="ov-top">
            <div className="eta-card">
              <div style={{fontSize:"0.61rem",color:"var(--text2)",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:5}}>⏱ Est. Arrival</div>
              <div className="eta-v">{mins}<span style={{fontSize:"1rem",opacity:0.65}}>m</span> {secs}<span style={{fontSize:"1rem",opacity:0.65}}>s</span></div>
              <div style={{fontSize:"0.7rem",color:"var(--text2)",marginTop:3}}>{dist.toFixed(2)} km · {speed} km/h</div>
            </div>
            <div className="stat-pill">
              <div className={"badge "+sc} style={{marginBottom:7}}><div className="pdot"/>{sl}</div>
              <div style={{fontSize:"0.7rem",color:"var(--text2)",fontFamily:"var(--fh)",fontWeight:700,marginBottom:1}}>{assigned.vehicle}</div>
              <div style={{fontSize:"0.67rem",color:"var(--text2)",marginBottom:4}}>{assigned.driver}</div>
              <a href={"tel:"+assigned.phone} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 8px",background:"rgba(48,209,88,0.12)",border:"1px solid rgba(48,209,88,0.25)",borderRadius:7,textDecoration:"none",cursor:"pointer"}} onClick={e=>{e.preventDefault();showNotif("📞 Calling "+assigned.driver+": "+assigned.phone,"#30d158");}}>
                <span style={{fontSize:"0.8rem"}}>📞</span>
                <span style={{fontFamily:"var(--fm)",fontWeight:700,fontSize:"0.7rem",color:"var(--green)"}}>{assigned.phone}</span>
              </a>
            </div>
          </div>
          <div className="ov-bot">
            <div style={{marginBottom:9}}>
              <div style={{fontSize:"0.6rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:7,fontWeight:700}}>🚑 Assigned Ambulance</div>
              <div className="live-row" style={{marginBottom:0,alignItems:"stretch",flexDirection:"column",gap:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:42,height:42,borderRadius:12,background:"linear-gradient(135deg,#1a95ff,#004db8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem",flexShrink:0,border:"2px solid rgba(255,255,255,0.15)"}}>🚑</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"var(--fh)",fontWeight:800,fontSize:"0.95rem"}}>{assigned.vehicle}</div>
                    <div style={{fontSize:"0.7rem",color:"var(--text2)",marginTop:1}}>{assigned.base||"City Base"}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}><div className="live-dot"/><span style={{fontSize:"0.64rem",color:"var(--green)",fontFamily:"var(--fh)",fontWeight:700}}>LIVE GPS</span></div>
                    <span style={{fontSize:"0.64rem",color:"var(--text2)",fontFamily:"var(--fm)"}}>{dist.toFixed(2)} km</span>
                  </div>
                </div>
                <div style={{height:1,background:"var(--border)"}}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div>
                    <div style={{fontSize:"0.6rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>Driver</div>
                    <div style={{fontWeight:600,fontSize:"0.84rem"}}>{assigned.driver}</div>
                    <a href={"tel:"+assigned.phone} style={{display:"flex",alignItems:"center",gap:5,marginTop:5,padding:"6px 10px",background:"rgba(48,209,88,0.12)",border:"1px solid rgba(48,209,88,0.25)",borderRadius:8,cursor:"pointer",textDecoration:"none"}} onClick={e=>{e.preventDefault();showNotif("📞 Calling driver: "+assigned.phone,"#30d158");}}>
                      <span style={{fontSize:"0.85rem"}}>📞</span>
                      <span style={{fontFamily:"var(--fm)",fontWeight:700,fontSize:"0.78rem",color:"var(--green)"}}>{assigned.phone}</span>
                    </a>
                  </div>
                  <div>
                    <div style={{fontSize:"0.6rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:3}}>Paramedic</div>
                    <div style={{fontWeight:600,fontSize:"0.84rem"}}>{assigned.paramedic||"On Board"}</div>
                    <div style={{display:"flex",alignItems:"center",gap:5,marginTop:5,padding:"6px 10px",background:"rgba(10,132,255,0.1)",border:"1px solid rgba(10,132,255,0.22)",borderRadius:8}}>
                      <span style={{fontSize:"0.85rem"}}>🩺</span>
                      <span style={{fontSize:"0.75rem",color:"var(--blue)"}}>Certified EMT</span>
                    </div>
                  </div>
                </div>
                <div style={{height:1,background:"var(--border)"}}/>
                <div style={{fontSize:"0.6rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>Nearest Hospitals En Route</div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {HOSPITALS.slice(0,2).map(h=>(
                    <div key={h.id} style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:"0.95rem"}}>{h.icon}</span>
                      <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:"0.78rem",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{h.name}</div><div style={{fontSize:"0.67rem",color:"var(--text2)"}}>{h.dist}</div></div>
                      <a href={"tel:"+h.emergency} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",background:"rgba(255,45,85,0.1)",border:"1px solid rgba(255,45,85,0.22)",borderRadius:7,textDecoration:"none",cursor:"pointer"}} onClick={e=>{e.preventDefault();showNotif("📞 "+h.name+": "+h.emergency,"#ff2d55");}}>
                        <span style={{fontSize:"0.75rem"}}>📞</span>
                        <span style={{fontFamily:"var(--fm)",fontSize:"0.7rem",color:"var(--red)",fontWeight:700}}>{h.emergency}</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button className="btn btn-ghost" style={{width:"100%",borderColor:"rgba(255,45,85,0.3)",color:"var(--red)"}} onClick={cancelSOS}>
              ✕ Cancel Emergency
            </button>
          </div>
          {trackSt==="reached"&&(
            <div className="reached-ov">
              <div className="reach-icon">✅</div>
              <div style={{fontFamily:"var(--fh)",fontSize:"1.5rem",fontWeight:800,textAlign:"center"}}>Ambulance Arrived!</div>
              <p style={{color:"var(--text2)",fontSize:"0.86rem",textAlign:"center",maxWidth:260,lineHeight:1.55}}>Help has reached your location. Stay calm.</p>
              <button className="btn btn-ghost" style={{marginTop:4}} onClick={cancelSOS}>Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App(){
  const {page,theme,toggleTheme}=useContext(Ctx);
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div className="bg-mesh"/><div className="bg-grid"/>
      <div style={{position:"relative",zIndex:1,flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {page==="auth"&&<div className="layer"><AuthPage/></div>}
        {page==="guesttrack"&&<GuestTrackPage/>}
        {page==="app"&&<AppLayout/>}
      </div>
      {page!=="app"&&(
        <button className="theme-toggle" onClick={toggleTheme} title={theme==="dark"?"Switch to light theme":"Switch to dark theme"}>
          {theme==="dark"?"☀️ Light":"🌙 Dark"}
        </button>
      )}
      <Notif/>
    </div>
  );
}

export default function AppRoot(){
  return (<Provider><App/></Provider>);
}
