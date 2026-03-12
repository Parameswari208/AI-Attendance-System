// File: frontend/src/components/FaceLogin.js
import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import * as tf from "@tensorflow/tfjs";
import axios from "axios";

const API_BASE = "http://localhost:5050/api/admin";

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

  // ================= LOAD FACE MODELS =================
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
    return () => stopCamera();
  }, []);

  // ================= CAMERA =================
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
    videoRef.current?.play();
    setCameraOn(true);

    // Turn off camera after 5 seconds
    setTimeout(() => stopCamera(), 5000);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraOn(false);
  };

  // ================= FACE SCAN =================
  const scanFace = async () => {
    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) return null;
    return Array.from(detection.descriptor);
  };

  // ================= LOGIN =================
  const handleLogin = async () => {
    setLoading(true);
    await startCamera();
    setStatus("Scanning face...");

    const interval = setInterval(async () => {
      const descriptor = await scanFace();
    if (!descriptor) {
  setStatus("Scanning face...");
  return;
}

      try {
      const res = await axios.post(`${API_BASE}/face-login`, 
  { faceDescriptor: descriptor },
  { validateStatus: () => true }
);
        clearInterval(interval);
        stopCamera();
        setLoading(false);

        if (res.data.success) {
          const emp = res.data.employee;
          setEmployee(emp);
          const loginT = res.data.lastSession?.loginTime || new Date();
          setLoginTime(new Date(loginT));
          setDashboardOpen(true);
          setStatus("Login Successful ✅");

          // Start working timer
          timerRef.current = setInterval(() => setCurrentTime(Date.now()), 1000);

        } else {
          setStatus(res.data.message || "Face not recognized ❌");
        }
      } catch (err) {

  clearInterval(interval);
  stopCamera();
  setLoading(false);

  if (err.response) {
    // Show backend message
    setStatus(err.response.data.message);
  } else {
    setStatus("Server error ❌");
  }

  console.error("Login error:", err);

}
    }, 500);
  };

  // ================= PAUSE / RESUME =================
  const handlePause = async () => {
    if (!employee) return;
    setPaused(true);
    setPauseStart(Date.now());
    await axios.post(`${API_BASE}/employee/action`, { employeeId: employee.employeeId, action: "pause" });
  };

  const handleResume = async () => {
    if (!employee || !paused) return;
    const pauseDuration = Date.now() - pauseStart;
    setTotalPaused((prev) => prev + pauseDuration);
    setPaused(false);
    setPauseStart(null);
    await axios.post(`${API_BASE}/employee/action`, { employeeId: employee.employeeId, action: "resume" });
  };

  // ================= LOGOUT =================
  const handleLogout = async () => {
    if (!employee) return;

    const logoutTime = Date.now();
    let workedTime = logoutTime - loginTime - totalPaused;
    if (paused && pauseStart) workedTime -= logoutTime - pauseStart;

    setLogoutSummary({
      login: new Date(loginTime).toLocaleTimeString(),
      logout: new Date(logoutTime).toLocaleTimeString(),
      total: new Date(workedTime).toISOString().substr(11, 8),
    });

    await axios.post(`${API_BASE}/employee/action`, { employeeId: employee.employeeId, action: "logout" });

    // Stop timer and reset state
    clearInterval(timerRef.current);
    setEmployee(null);
    setLoginTime(null);
    setPaused(false);
    setPauseStart(null);
    setTotalPaused(0);
    setDashboardOpen(false);
    setStatus("Logged out ✅");
  };

  const getWorkingTime = () => {
    if (!loginTime) return "00:00:00";
    let diff = currentTime - loginTime - totalPaused;
    if (paused && pauseStart) diff -= currentTime - pauseStart;
    const h = Math.floor(diff / 3600000).toString().padStart(2, "0");
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, "0");
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2>TechNG Nexus 💙</h2>
        <p>{status}</p>

        <div style={styles.cameraBox}>
          <img src="/placeholder.png" alt="placeholder"
               style={{ ...styles.placeholder, display: cameraOn ? "none" : "block" }} />
          <video ref={videoRef} autoPlay muted width="320" height="240"
                 style={{ ...styles.video, display: cameraOn ? "block" : "none" }} />
        </div>

        {employee && (
          <p>Logged in as <b>{employee.name}</b><br />Employee ID: <b>{employee.employeeId}</b></p>
        )}

        <div style={styles.buttonGroup}>
          <button onClick={handleLogin} style={styles.button} disabled={loading || employee}>
            {loading ? "Processing..." : "Login"}
          </button>
          <button onClick={handleLogout} style={styles.button} disabled={!employee}>Logout</button>
        </div>
      </div>

      {dashboardOpen && employee && (
        <div style={styles.dashboardPanel}>
          <div style={styles.dashboardHeader}><b>Employee Dashboard</b>
            <button style={styles.closeBtn} onClick={() => setDashboardOpen(false)}>_</button>
          </div>
          <div style={styles.row}><span>Name</span><b>{employee?.name}</b></div>
          <div style={styles.row}><span>Employee ID</span><b>{employee?.employeeId}</b></div>
          <div style={styles.row}><span>Login Time</span><b>{new Date(loginTime).toLocaleTimeString()}</b></div>
          <div style={styles.row}><span>Working</span><b style={{color:"#1565c0"}}>{getWorkingTime()}</b></div>
          {!paused && <button style={styles.button} onClick={handlePause}>Pause</button>}
          {paused && <button style={styles.button} onClick={handleResume}>Resume</button>}
        </div>
      )}

      {logoutSummary && (
        <div style={styles.popup}>
          <h3>Work Summary</h3>
          <div style={styles.row}><span>Login</span><b>{logoutSummary.login}</b></div>
          <div style={styles.row}><span>Logout</span><b>{logoutSummary.logout}</b></div>
          <div style={styles.row}><span>Total</span><b style={{color:"#1565c0"}}>{logoutSummary.total}</b></div>
          <button style={styles.button} onClick={() => setLogoutSummary(null)}>Close</button>
        </div>
      )}
    </div>
  );
};

const styles = {
  page:{height:"100vh", display:"flex", justifyContent:"center", alignItems:"center", background:"#eef4ff"},
  card:{background:"#fff", padding:"30px", borderRadius:"20px", width:"400px", textAlign:"center", boxShadow:"0 8px 25px rgba(0,0,0,0.08)"},
  cameraBox:{marginTop:"15px", width:"320px", height:"240px", margin:"0 auto", position:"relative"},
  placeholder:{position:"absolute", width:"100%", height:"100%", objectFit:"contain", border:"2px solid #1565c0", borderRadius:"12px"},
  video:{position:"absolute", borderRadius:"12px", border:"2px solid #1565c0"},
  buttonGroup:{marginTop:"15px", display:"flex", gap:"10px", flexDirection:"column"},
  button:{padding:"10px", background:"#1565c0", color:"#fff", border:"none", borderRadius:"8px", cursor:"pointer", marginTop:"8px"},
  dashboardPanel:{position:"fixed", top:"20px", right:"20px", width:"280px", background:"#fff", borderRadius:"16px", padding:"16px", boxShadow:"0 12px 30px rgba(0,0,0,0.15)"},
  dashboardHeader:{display:"flex", justifyContent:"space-between", marginBottom:"10px"},
  row:{display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #eee", fontSize:"14px"},
  closeBtn:{border:"none", background:"#e53935", color:"#fff", borderRadius:"6px", cursor:"pointer", padding:"2px 8px"},
  popup:{position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"#fff", padding:"25px", borderRadius:"16px", boxShadow:"0 12px 35px rgba(0,0,0,0.25)", width:"320px", textAlign:"center"},
};

export default FaceLogin;