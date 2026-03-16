// File: backend/routes/Admin/adminRoutes.js
const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const User = require("../../models/User");

// ================= CONSTANTS =================
const FACE_THRESHOLD = 0.45; // Adjust for stricter or lenient face match

// ================= HELPERS =================
function euclideanDistance(arr1, arr2) {
  if (!arr1 || !arr2 || arr1.length !== arr2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    sum += (arr1[i] - arr2[i]) ** 2;
  }
  return Math.sqrt(sum);
}

// Format milliseconds to HH:MM:SS
function formatWorked(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
 return `${h} hr ${m} min ${s} sec`;
}

// ================= SEND INVITE EMAIL =================
router.post("/send-invite", async (req, res) => {
  try {
    const { name, email, empId } = req.body;
    if (!name || !email || !empId)
      return res.status(400).json({ message: "Missing required fields" });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "techngparames@gmail.com",
        pass: "hftvxwsjoojnkisw",
      },
    });

    const faceLoginLink = `http://localhost:3000/face-login?name=${encodeURIComponent(
      name
    )}&email=${encodeURIComponent(email)}&empId=${encodeURIComponent(empId)}`;

    await transporter.sendMail({
      from: "techngparames@gmail.com",
      to: email,
      subject: "Setup Your Face Login",
      html: `
        <h2>Hello ${name}</h2>
        <p>Your Employee ID: <b>${empId}</b></p>
        <p>Email: <b>${email}</b></p>
        <a href="${faceLoginLink}" 
        style="padding:12px 25px;background:#1abc9c;color:white;border-radius:8px;text-decoration:none;">
        Setup Face Login
        </a>
      `,
    });

    res.json({ success: true, message: "Invite sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send invite" });
  }
});

// ================= REGISTER EMPLOYEE =================
router.post("/register-employee", async (req, res) => {
  try {
    const { name, email, employeeId, faceDescriptor } = req.body;

    if (!name || !email || !employeeId || !faceDescriptor) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Check email or employeeId
    const existingEmployee = await User.findOne({
      $or: [{ email }, { employeeId }],
    });

    if (existingEmployee) {
      return res.json({ success: false, message: "Employee already exists ❌" });
    }

    // Face duplicate check
    const allUsers = await User.find({ faceDescriptor: { $exists: true, $ne: [] } });
    let duplicateFound = false;

    for (const user of allUsers) {
      const distance = euclideanDistance(faceDescriptor, user.faceDescriptor);
      console.log("Face distance:", distance);
      if (distance < FACE_THRESHOLD) {
        duplicateFound = true;
        break;
      }
    }

    if (duplicateFound) {
      return res.json({ success: false, message: "This face is already registered ❌" });
    }

    // Save new user
    const newUser = new User({
      name,
      email,
      employeeId,
      faceDescriptor,
      loginCount: 0,
      loginHistory: [],
      isLoggedIn: false,
    });

    await newUser.save();

    return res.json({ success: true, message: "Employee registered successfully ✅", user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Registration failed ❌" });
  }
});

// ================= FACE LOGIN =================
router.post("/face-login", async (req, res) => {
  try {
    const { faceDescriptor } = req.body;
    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ success: false, message: "Invalid face descriptor ❌" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allUsers = await User.find();
    let bestMatch = null;
    let bestDistance = Infinity;

    for (let user of allUsers) {
      if (!user.faceDescriptor || user.faceDescriptor.length !== faceDescriptor.length) continue;
      const distance = euclideanDistance(faceDescriptor, user.faceDescriptor);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = user;
      }
    }

    if (!bestMatch || bestDistance > FACE_THRESHOLD) {
      return res.json({ success: false, message: "Face not recognized ⚠️" });
    }

    const user = bestMatch;

    // Check if user already logged in today
   const todaySession = user.loginHistory.find(session => {
  if (!session.loginTime) return false;

  const loginDate = new Date(session.loginTime);
  loginDate.setHours(0,0,0,0);

  return loginDate.getTime() === today.getTime();
});

// If already logged today (even if logged out)
if (todaySession) {
  return res.json({
    success: false,
    message: "You have already logged in today ✅"
  });
}

    const now = new Date();
    const newSession = { loginTime: now, pauseTime: [], logoutTime: null, totalWorked: 0 };
    user.loginHistory.push(newSession);
    user.lastLogin = now;
    user.loginCount += 1;
    user.isLoggedIn = true;

    await user.save();

    res.json({ success: true, message: "Login successful ✅", employee: user, lastSession: newSession });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Login failed ❌" });
  }
});

// ================= EMPLOYEE ACTION =================
router.post("/employee/action", async (req, res) => {
  try {
    const { employeeId, action } = req.body;
    if (!employeeId || !action) return res.status(400).json({ success: false, message: "Missing fields" });

    const user = await User.findOne({ employeeId });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.loginHistory = user.loginHistory || [];
    const lastSession = user.loginHistory[user.loginHistory.length - 1];

    if (!lastSession || !lastSession.loginTime) {
      return res.status(400).json({ success: false, message: "No active session found" });
    }

    const now = new Date();

    if (action === "pause") {
      lastSession.pauseTime = lastSession.pauseTime || [];
      lastSession.pauseTime.push({ start: now, end: null });
    } else if (action === "resume") {
      if (!lastSession.pauseTime || lastSession.pauseTime.length === 0)
        return res.status(400).json({ success: false, message: "No pause found" });
      const currentPause = lastSession.pauseTime[lastSession.pauseTime.length - 1];
      if (!currentPause.end) currentPause.end = now;
    } else if (action === "logout") {
      // End any ongoing pauses
      if (lastSession.pauseTime && lastSession.pauseTime.length > 0) {
        lastSession.pauseTime.forEach(p => {
          if (!p.end) p.end = now;
        });
      }

      // Calculate total pause duration
      let totalPause = 0;
      if (lastSession.pauseTime && lastSession.pauseTime.length > 0) {
        lastSession.pauseTime.forEach(p => {
          const start = new Date(p.start).getTime();
          const end = new Date(p.end).getTime();
          totalPause += end - start;
        });
      }

      lastSession.logoutTime = now;
      user.isLoggedIn = false;
      lastSession.totalWorked =
        now.getTime() - new Date(lastSession.loginTime).getTime() - totalPause;
    } else {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }

    await user.save();
    res.json({ success: true, employee: user, lastSession });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Action failed" });
  }
});

// ================= GET ALL EMPLOYEES =================
router.get("/employees", async (req, res) => {
  try {
    const employees = await User.find().sort({ createdAt: -1 });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeToday = employees.filter(emp => {
      if (!emp.loginHistory || emp.loginHistory.length === 0) return false;
      const todaySession = emp.loginHistory.find(session => {
        if (!session.loginTime) return false;
        const loginDate = new Date(session.loginTime);
        loginDate.setHours(0, 0, 0, 0);
        return loginDate.getTime() === today.getTime() && !session.logoutTime;
      });
      return !!todaySession;
    }).length;

    const onboardedCount = employees.filter(emp => emp.faceDescriptor && emp.faceDescriptor.length > 0).length;

    res.json({ success: true, totalEmployees: employees.length, activeToday, onboardedCount, employees });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ================= EMPLOYEE ACTIVITY =================
router.get("/employee-activity", async (req, res) => {
  try {
    const employees = await User.find({}, { name: 1, email: 1, employeeId: 1, loginHistory: 1 });
    res.json({ success: true, employees });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch activity" });
  }
});

// ================= EMPLOYEE COUNT =================
router.get("/employee-count", async (req, res) => {
  const count = await User.countDocuments();
  res.json({ success: true, totalEmployees: count });
});

// ================= DELETE EMPLOYEE =================
router.delete("/employee/:id", async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Employee removed" });
});

// ================= UPDATE EMPLOYEE =================
router.put("/employee/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedEmployee = await User.findByIdAndUpdate(
      id,
      {
        name: req.body.name,
        mobile: req.body.mobile,
        email: req.body.email,
        gender: req.body.gender,
        address: req.body.address,
        idProof: req.body.idProof,
      },
      { new: true }
    );
    if (!updatedEmployee) return res.status(404).json({ success: false, message: "Employee not found" });
    res.json({ success: true, message: "Employee updated successfully", employee: updatedEmployee });
  } catch (error) {
    console.error("Update Employee Error:", error);
    res.status(500).json({ success: false, message: "Failed to update employee" });
  }
});

// ================= GET ONBOARDED EMPLOYEES =================
router.get("/onboarded-employees", async (req, res) => {
  try {
    const employees = await User.find({}, { _id: 0, employeeId: 1, name: 1, email: 1, faceDescriptor: 1 });
    res.status(200).json({ success: true, employees });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch onboarded employees" });
  }
});

// ================= MONTHLY REPORT =================
router.get("/monthly-report", async (req, res) => {
  try {
    const { month, year, employeeId } = req.query;
    const users = await User.find();
    let report = [];

    users.forEach(user => {
      if (employeeId && user.employeeId !== employeeId) return;
      user.loginHistory.forEach(session => {
        const loginDate = new Date(session.loginTime);
        const sessionMonth = loginDate.getMonth() + 1;
        const sessionYear = loginDate.getFullYear();
        if (sessionMonth == month && sessionYear == year) {
          report.push({
            employeeId: user.employeeId,
            name: user.name,
            date: loginDate.toLocaleDateString(),
            login: session.loginTime,
            logout: session.logoutTime,
            workedHours: formatWorked(session.totalWorked || 0)
          });
        }
      });
    });

    res.json({ success: true, totalRecords: report.length, data: report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate monthly report ❌" });
  }
});

// ================= DEBUG ACTIVE =================
router.get("/debug-active", async (req, res) => {
  const employees = await User.find();
  const activeToday = employees.filter(emp => emp.isLoggedIn);
  res.json({ totalEmployees: employees.length, activeToday: activeToday.length, activeEmployees: activeToday });
});

module.exports = router;