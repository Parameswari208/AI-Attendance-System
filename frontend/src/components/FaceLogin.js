//e: frontend/src/components/FaceLogin.js

import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import * as tf from "@tensorflow/tfjs";
import axios from "axios";

const API_BASE = "http://localhost:5050/api/admin";

const officeLat = 12.9698;
const officeLng = 80.2446;
const allowedRadius = 2000;

const FaceLogin = () => {

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const [status, setStatus] = useState("Initializing AI...");
  const [loading, setLoading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  const [employee, setEmployee] = useState(null);
  const [loginTime, setLoginTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [paused, setPaused] = useState(false);
  const [pauseStart, setPauseStart] = useState(null);
  const [totalPaused, setTotalPaused] = useState(0);
  const [logoutSummary, setLogoutSummary] = useState(null);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [locationValid, setLocationValid] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [loginHistory, setLoginHistory] = useState([]); // Track all sessions
  

  useEffect(() => {

    const loadModels = async () => {

      await tf.setBackend("webgl");
      await tf.ready();

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);

      setStatus("Face Login Ready ✅");

    };

    loadModels();
    checkLocation();

    // RESTORE SESSION
// RESTORE SESSION
const savedSession = localStorage.getItem("employeeSession");

if(savedSession){

  const session = JSON.parse(savedSession);

  setEmployee(session.employee);
  setLoginTime(new Date(session.loginTime));
  setDashboardOpen(true);

  // ===== Restore login history if exists =====
  if(session.loginHistory){
    setEmployee(prev => ({ ...prev, loginHistory: session.loginHistory }));
  }

  timerRef.current = setInterval(
    ()=> setCurrentTime(Date.now()),
    1000
  );

}

    return () => stopCamera();

  }, []);

  const startCamera = async () => {

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });

    streamRef.current = stream;

    if (videoRef.current) videoRef.current.srcObject = stream;

    videoRef.current?.play();

    setCameraOn(true);

  };

  const stopCamera = () => {

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    setCameraOn(false);

  };

  const scanFace = async () => {

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;

    return Array.from(detection.descriptor);

  };

  const getDistance = (lat1, lon1, lat2, lon2) => {

    const R = 6371e3;

    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;

    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a =
      Math.sin(Δφ/2) * Math.sin(Δφ/2) +
      Math.cos(φ1) *
      Math.cos(φ2) *
      Math.sin(Δλ/2) *
      Math.sin(Δλ/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;

  };

  const checkLocation = () => {

    navigator.geolocation.getCurrentPosition(

      (pos) => {

        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        const distance = getDistance(userLat,userLng,officeLat,officeLng);

        if(distance <= allowedRadius){

          setLocationValid(true);
          setLocationText("TechNG Training and Placement");

        } else {

          setLocationValid(false);
          setLocationText("Outside TechNG campus ❌");

        }

      },

      () => {

        setLocationValid(false);
        setLocationText("Location not available ❌");

      }

    );

  };

  const handleLogin = async () => {

    if(employee){
      setStatus("Employee already logged in");
      return;
    }

    if(!locationValid){

      setStatus("You are outside TechNG campus ❌");
      return;

    }

    setLoading(true);

    await startCamera();

    setStatus("Scanning face...");

    const interval = setInterval(async () => {

      const descriptor = await scanFace();

      if(!descriptor) return;

      clearInterval(interval);

      stopCamera();

      try{

        const res = await axios.post(
          `${API_BASE}/face-login`,
          { faceDescriptor: descriptor }
        );

        setLoading(false);

        if(res.data.success){

          const emp = res.data.employee;

          setEmployee(emp);

          const loginT = new Date();

          setLoginTime(loginT);

          // SAVE SESSION
          localStorage.setItem("employeeSession", JSON.stringify({
            employee: emp,
            loginTime: loginT
          }));

          setDashboardOpen(true);

          setStatus("Login Successful ✅");

          timerRef.current = setInterval(
            ()=> setCurrentTime(Date.now()),
            1000
          );

        } else {

          setStatus(res.data.message || "Face not recognized ❌");

        }

      } catch(err){

        setStatus("Server error ❌");
        setLoading(false);

      }

    },500);

  };

const handlePause =  async() => {
  try {
  if (employee) {
    await axios.post(`${API_BASE}/employee/action`, {
      employeeId: employee.employeeId,
      action: "pause"
    });
  }
} catch (err) {
  console.error("Pause API error:", err);
}
  const startTime = Date.now();
  setPaused(true);
  setPauseStart(startTime);

  // Save pause start in loginHistory
  setEmployee(prev => {
    if(!prev) return prev;

    const updatedHistory = prev.loginHistory ? [...prev.loginHistory] : [];
    const lastSession = updatedHistory.length > 0 ? { ...updatedHistory[updatedHistory.length - 1] } : { loginTime: loginTime, logoutTime: null, pauseTime: [] };

    if(!lastSession.pauseTime) lastSession.pauseTime = [];
    lastSession.pauseTime.push({ start: startTime, end: null });

    if(updatedHistory.length > 0){
      updatedHistory[updatedHistory.length - 1] = lastSession;
    } else {
      updatedHistory.push(lastSession);
    }

    return { ...prev, loginHistory: updatedHistory };
  });
};

  const handleResume = async () => {
    try {
  if (employee) {
    await axios.post(`${API_BASE}/employee/action`, {
      employeeId: employee.employeeId,
      action: "resume"
    });
  }
} catch (err) {
  console.error("Resume API error:", err);
}
  const endTime = Date.now();
  const pauseDuration = endTime - pauseStart;
  setTotalPaused(prev => prev + pauseDuration);
  setPaused(false);

  // Save pause end in loginHistory
  setEmployee(prev => {
    if(!prev) return prev;

    const updatedHistory = prev.loginHistory ? [...prev.loginHistory] : [];
    const lastSession = updatedHistory.length > 0 ? { ...updatedHistory[updatedHistory.length - 1] } : null;

    if(lastSession && lastSession.pauseTime && lastSession.pauseTime.length > 0){
      const lastPauseIndex = lastSession.pauseTime.length - 1;
      if(!lastSession.pauseTime[lastPauseIndex].end){
        lastSession.pauseTime[lastPauseIndex].end = endTime;
      }
    }

    if(lastSession){
      updatedHistory[updatedHistory.length - 1] = lastSession;
    }

    return { ...prev, loginHistory: updatedHistory };
  });

  setPauseStart(null);
};

 const handleLogout = async() => {
  try {
  if (employee) {
    await axios.post(`${API_BASE}/employee/action`, {
      employeeId: employee.employeeId,
      action: "logout"
    });
  }
} catch (err) {
  console.error("Logout API error:", err);
}
  const logoutTime = Date.now();
  let workedTime = logoutTime - loginTime - totalPaused;

  if(paused && pauseStart){
    workedTime -= logoutTime - pauseStart;
  }

  // Save logoutTime in loginHistory
  setEmployee(prev => {
    if(!prev) return prev;

    const updatedHistory = prev.loginHistory ? [...prev.loginHistory] : [];
    const lastSession = updatedHistory.length > 0 ? { ...updatedHistory[updatedHistory.length - 1] } : { loginTime: loginTime, logoutTime: null, pauseTime: [] };

    lastSession.logoutTime = logoutTime;

    if(updatedHistory.length > 0){
      updatedHistory[updatedHistory.length - 1] = lastSession;
    } else {
      updatedHistory.push(lastSession);
    }

    return { ...prev, loginHistory: updatedHistory };
  });

  setLogoutSummary({
    login: new Date(loginTime).toLocaleTimeString(),
    logout: new Date(logoutTime).toLocaleTimeString(),
    total: new Date(workedTime).toISOString().substr(11,8)
  });

  clearInterval(timerRef.current);
  localStorage.removeItem("employeeSession");

  setEmployee(null);
  setLoginTime(null);
  setPaused(false);
  setPauseStart(null);
  setTotalPaused(0);
  setDashboardOpen(false);

  setStatus("Logged out ✅");
};

  const getWorkingTime = () => {

    if(!loginTime) return "00:00:00";

    let diff = currentTime - loginTime - totalPaused;

    if(paused && pauseStart){
      diff -= currentTime - pauseStart;
    }

    const h = Math.floor(diff/3600000).toString().padStart(2,"0");
    const m = Math.floor((diff%3600000)/60000).toString().padStart(2,"0");
    const s = Math.floor((diff%60000)/1000).toString().padStart(2,"0");

    return `${h}:${m}:${s}`;

  };

  return (

    <div style={styles.page}>

      <div style={styles.card}>

        <h2>TechNG Nexus 💙</h2>

        <p>{status}</p>

        <p style={{fontSize:"14px",color:"#1565c0"}}>{locationText}</p>

        <div style={styles.cameraBox}>

          {!cameraOn && (
            <img
              src="/placeholder.png"
              alt="Camera Off"
              style={styles.placeholder}
            />
          )}

          <video
            ref={videoRef}
            autoPlay
            muted
            style={{
              ...styles.video,
              display: cameraOn ? "block" : "none"
            }}
          />

          {cameraOn && <div style={styles.oval}></div>}

        </div>

        {employee && (

          <p>
            Logged in as <b>{employee.name}</b>
            <br/>
            Employee ID: <b>{employee.employeeId}</b>
          </p>

        )}

        <button
          onClick={handleLogin}
          style={styles.button}
          disabled={loading || employee}
        >
          {loading ? "Processing..." : "Login"}
        </button>

        <button
          onClick={handleLogout}
          style={styles.button}
          disabled={!employee}
        >
          Logout
        </button>

      </div>

      <div style={styles.dashboardPanel}>

        <h3>Employee Dashboard</h3>

        {!employee && (
          <p style={{marginTop:"20px",textAlign:"center"}}>
            No employee logged in
          </p>
        )}

        {employee && (

          <>
            <div style={styles.row}>
              <span>Name</span>
              <b>{employee.name}</b>
            </div>

            <div style={styles.row}>
              <span>ID</span>
              <b>{employee.employeeId}</b>
            </div>

            <div style={styles.row}>
              <span>Login</span>
              <b>{new Date(loginTime).toLocaleTimeString()}</b>
            </div>

            <div style={styles.row}>
              <span>Working</span>
              <b style={{color:"#1565c0"}}>{getWorkingTime()}</b>
            </div>

            {!paused && (
              <button style={styles.button} onClick={handlePause}>
                Pause
              </button>
            )}

            {paused && (
              <button style={styles.button} onClick={handleResume}>
                Resume
              </button>
            )}
          </>

        )}

      </div>

      {logoutSummary && (

        <div style={styles.popup}>

          <h3>Work Summary</h3>

          <p>Login: {logoutSummary.login}</p>
          <p>Logout: {logoutSummary.logout}</p>
          <p>Total: {logoutSummary.total}</p>

          <button
            style={styles.button}
            onClick={()=>setLogoutSummary(null)}
          >
            Close
          </button>

        </div>

      )}

    </div>

  );

};

const styles = {

  page:{
    height:"100vh",
    display:"flex",
    justifyContent:"center",
    alignItems:"center",
    background:"#eef4ff"
  },

  card:{
    background:"#fff",
    padding:"30px",
    borderRadius:"20px",
    width:"400px",
    textAlign:"center",
    boxShadow:"0 8px 25px rgba(0,0,0,0.08)"
  },

  cameraBox:{
    position:"relative",
    width:"320px",
    height:"240px",
    margin:"20px auto",
    display:"flex",
    justifyContent:"center",
    alignItems:"center"
  },

  video:{
    width:"320px",
    height:"240px",
    borderRadius:"10px",
    objectFit:"cover"
  },

  placeholder:{
    width:"320px",
    height:"240px",
    borderRadius:"10px",
    objectFit:"contain",
    background:"#fff"
  },

  oval:{
    position:"absolute",
    top:"50%",
    left:"50%",
    transform:"translate(-50%,-50%)",
    width:"160px",
    height:"200px",
    border:"3px solid #00ff88",
    borderRadius:"50%",
    pointerEvents:"none"
  },

  button:{
    padding:"10px",
    background:"#1565c0",
    color:"#fff",
    border:"none",
    borderRadius:"8px",
    cursor:"pointer",
    marginTop:"10px",
    width:"100%"
  },

  dashboardPanel:{
    position:"fixed",
    top:"20px",
    right:"20px",
    width:"260px",
    background:"#fff",
    borderRadius:"16px",
    padding:"16px",
    boxShadow:"0 12px 30px rgba(0,0,0,0.15)"
  },

  row:{
    display:"flex",
    justifyContent:"space-between",
    padding:"6px 0",
    borderBottom:"1px solid #eee",
    fontSize:"14px"
  },

  popup:{
    position:"fixed",
    top:"50%",
    left:"50%",
    transform:"translate(-50%,-50%)",
    background:"#fff",
    padding:"25px",
    borderRadius:"16px",
    boxShadow:"0 12px 35px rgba(0,0,0,0.25)",
    width:"300px",
    textAlign:"center"
  }

};

export default FaceLogin;