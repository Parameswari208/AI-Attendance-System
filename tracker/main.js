const { app } = require("electron");
const activeWin = require("active-win");
const axios = require("axios");

let trackerInterval = null;

const BACKEND_URL = "http://localhost:5050/api/app-usage/add";
const CURRENT_USER_URL = "http://localhost:5050/api/user/current";

// =============================
// Get Logged-in User
// =============================
async function getLoggedInUserId() {
  try {
    const res = await axios.get(CURRENT_USER_URL);

    if (res.data.success && res.data.userId) {
      return res.data.userId;
    }

    return null;
  } catch (error) {
    return null;
  }
}

// =============================
// Start Tracker (Terminal Only)
// =============================
function startTracking() {

  console.log("🚀 Background App Tracker Started...\n");

  trackerInterval = setInterval(async () => {
    try {

      const userId = await getLoggedInUserId();

      if (!userId) {
        console.log("⛔ No user logged in\n");
        return;
      }

      const windowInfo = await activeWin();

      if (!windowInfo || !windowInfo.owner) {
        console.log("⚠ No active window\n");
        return;
      }

      const appName = windowInfo.owner.name;

      // ✅ Send only required fields
      await axios.post(BACKEND_URL, {
        userId,
        appName,
        totalSeconds: 1
      });

      console.log("=================================");
      console.log("👤 User :", userId);
      console.log("🖥 App  :", appName);
      console.log("⏱ +1 second");
      console.log("=================================\n");

    } catch (err) {
      console.error("❌ Tracking error:", err.response?.data || err.message);
    }
  }, 1000);
}

// =============================
// App Ready
// =============================
app.whenReady().then(() => {
  startTracking();
});

// =============================
// Stop Tracker on Exit
// =============================
app.on("before-quit", () => {
  if (trackerInterval) clearInterval(trackerInterval);
});