// frontend/src/components/FaceEnroll.js
import React, { useRef, useState, useEffect } from "react";
import * as faceapi from "@vladmandic/face-api";
import axios from "axios";

const FaceEnroll = ({ name, email, empId, onRegisterSuccess }) => {

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [status, setStatus] = useState("");
  const [descriptor, setDescriptor] = useState(null);
  const [detectCount, setDetectCount] = useState(0);

  // ================= LOAD MODELS =================
  useEffect(() => {

    const loadModels = async () => {

      setStatus("Loading models...");

      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

      setStatus("Models loaded ✅");

    };

    loadModels();

  }, []);


  // ================= START CAMERA =================
  const startCamera = async () => {

    setCameraOn(true);
    setCaptured(false);
    setDetectCount(0);
    setStatus("Camera starting...");

    try {

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      if (videoRef.current) {

        videoRef.current.srcObject = stream;
        streamRef.current = stream;

      }

      setStatus("Camera on. Click Capture Face.");

    } catch (err) {

      console.error(err);
      setStatus("Camera access denied ❌");
      setCameraOn(false);

    }

  };


  // ================= STOP CAMERA =================
  const stopCamera = () => {

    if (streamRef.current) {

      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;

    }

    if (videoRef.current) videoRef.current.srcObject = null;

    setCameraOn(false);

  };


  // ================= CAPTURE FACE =================
  const handleCapture = async () => {

    if (!videoRef.current || !canvasRef.current) {

      setStatus("Camera not ready ❌");
      return;

    }

    setStatus("Detecting face...");

    try {

      // detect ALL faces
      const detections = await faceapi
        .detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks()
        .withFaceDescriptors();

      // ================= MULTIPLE FACE CHECK =================
      if (detections.length === 0) {

        setStatus("No face detected ❌");
        setDetectCount(0);
        return;

      }

      if (detections.length > 1) {

        setStatus("Please show only one face ❌");
        setDetectCount(0);
        return;

      }

      const detection = detections[0];

      // ================= FACE QUALITY CHECK =================
      if (detection.detection.score < 0.8) {

        setStatus("Face not clear. Move closer ❌");
        return;

      }

      // ================= OVAL POSITION CHECK =================

      const box = detection.detection.box;

      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;

      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      const ovalCenterX = videoWidth / 2;
      const ovalCenterY = videoHeight / 2;

      const ovalWidth = videoWidth * 0.35;
      const ovalHeight = videoHeight * 0.45;

      const dx = (centerX - ovalCenterX) / ovalWidth;
      const dy = (centerY - ovalCenterY) / ovalHeight;

      if ((dx * dx + dy * dy) > 1) {

        setStatus("Please keep your face inside the oval ❌");
        return;

      }

      // ================= STABLE DETECTION =================

      if (detectCount < 2) {

        setDetectCount(prev => {

          const newCount = prev + 1;
          setStatus(`Hold still... verifying face (${newCount}/3)`);

          return newCount;

        });

        return;

      }

      setDescriptor(Array.from(detection.descriptor));

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      setCaptured(true);
      setStatus("Face captured successfully ✅");

      stopCamera();

    } catch (err) {

      console.error(err);
      setStatus("Face detection failed ❌");

    }

  };


  // ================= REGISTER =================
  const handleRegister = async () => {

    if (!name || !email || !empId) {

      setStatus("Fill all fields ❌");
      return;

    }

    if (!descriptor || descriptor.length !== 128) {

      setStatus("Face not captured properly ❌");
      return;

    }

    setStatus("Registering...");

    try {

      const res = await axios.post(
        "http://localhost:5050/api/admin/register-employee",
        {
          name,
          email,
          employeeId: empId,
          faceDescriptor: descriptor
        }
      );

      if (res.data.success) {

        setStatus("Registration successful ✅");

        setCaptured(false);

        if (canvasRef.current) {

          const ctx = canvasRef.current.getContext("2d");
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        }

        onRegisterSuccess();

      } else {

        setStatus(res.data.message || "Registration failed ❌");

      }

    } catch (err) {

      console.error(err);
      setStatus(err.response?.data?.message || "Registration failed ❌");

    }

  };


  return (

    <div style={{ textAlign: "center" }}>

      <div
        style={{
          marginBottom: "10px",
          position: "relative",
          width: "250px",
          margin: "auto"
        }}
      >

        {!cameraOn && !captured && (
          <img src="/placeholder.png" alt="placeholder" width="250" />
        )}

        {cameraOn && !captured && (
          <>
            <video ref={videoRef} width="250" height="200" autoPlay />
            <div style={styles.oval}></div>
          </>
        )}

        <canvas
          ref={canvasRef}
          width="250"
          height="200"
          style={{ display: captured ? "block" : "none", margin: "0 auto" }}
        />

      </div>

      {!cameraOn && !captured && (
        <button onClick={startCamera} style={styles.button}>
          Scan Face
        </button>
      )}

      {cameraOn && !captured && (
        <button onClick={handleCapture} style={styles.button}>
          Capture Face
        </button>
      )}

      {captured && (
        <button onClick={handleRegister} style={styles.button}>
          Register Employee
        </button>
      )}

      {status && (
        <p style={{
          color: status.includes("✅") ? "green" : "red",
          marginTop: "10px"
        }}>
          {status}
        </p>
      )}

    </div>

  );

};


const styles = {

  button: {
    margin: "5px",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    backgroundColor: "#1565c0",
    color: "white",
    fontWeight: "bold",
  },

  oval: {
    position: "absolute",
    top: "30px",
    left: "60px",
    width: "130px",
    height: "140px",
    border: "3px solid #00ff00",
    borderRadius: "50%",
    pointerEvents: "none"
  }

};

export default FaceEnroll;