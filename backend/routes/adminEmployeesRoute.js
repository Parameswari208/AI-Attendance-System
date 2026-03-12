const express = require("express");
const router = express.Router();
const Employee = require("../models/Employee");

// ================= GET Onboarded Employees =================
router.get("/onboarded-employees", async (req, res) => {
  try {
    const employees = await Employee.find({}, { _id: 0, empId: 1, name: 1, faceDescriptor: 1 });
    res.status(200).json({ success: true, employees });
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ================= REGISTER EMPLOYEE FACE =================
router.post("/register-employee", async (req, res) => {
  try {
    const { name, email, empId, faceDescriptor } = req.body;

    if (!name || !email || !empId || !faceDescriptor) {
      return res.status(200).json({ success: false, message: "Missing required fields" });
    }

    const existing = await Employee.findOne({ $or: [{ email }, { empId }] });
    if (existing) {
      return res.status(200).json({ success: false, message: "Employee already exists" });
    }

    const newEmployee = new Employee({
      name,
      email,
      empId,
      faceDescriptor,
      loginCount: 0,
      loginHistory: [],
      lastLogin: null,
    });

    await newEmployee.save();
    res.status(201).json({ success: true, message: "Employee registered ✅", employee: newEmployee });
  } catch (err) {
    console.error("Error registering employee:", err);
    res.status(500).json({ success: false, message: "Registration failed ❌" });
  }
});

// ================= FACE LOGIN =================
router.post("/face-login", async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    if (!faceDescriptor) {
      return res.status(200).json({ success: false, message: "Face descriptor missing" });
    }

    const employees = await Employee.find();
    const FACE_THRESHOLD = 0.5;

    const euclideanDistance = (arr1, arr2) => {
      if (!arr1 || !arr2 || arr1.length !== arr2.length) return Infinity;
      let sum = 0;
      for (let i = 0; i < arr1.length; i++) sum += (arr1[i] - arr2[i]) ** 2;
      return Math.sqrt(sum);
    };

    for (let emp of employees) {
      const distance = euclideanDistance(faceDescriptor, emp.faceDescriptor);
      if (distance < FACE_THRESHOLD) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const alreadyLoggedToday = emp.loginHistory.some(
          (s) => s.loginTime && new Date(s.loginTime) >= today
        );

        if (alreadyLoggedToday) {
          return res.status(200).json({ success: false, message: "Already logged in today" });
        }

        const now = new Date();
        const newSession = { loginTime: now, pauseTime: [], logoutTime: null, totalWorked: 0 };
        emp.loginHistory.push(newSession);
        emp.lastLogin = now;
        emp.loginCount = (emp.loginCount || 0) + 1;
        await emp.save();

        return res.status(200).json({ success: true, employee: emp, lastSession: newSession });
      }
    }

    return res.status(200).json({ success: false, message: "Face not recognized" });
  } catch (err) {
    console.error("Face login error:", err);
    return res.status(500).json({ success: false, message: "Face login failed ❌" });
  }
});

module.exports = router;