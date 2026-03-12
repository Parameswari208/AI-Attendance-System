// appTracker.js
const activeWin = require("active-win");
const axios = require("axios");

const BACKEND_URL = "http://localhost:5050/api/app-usage/add";

async function startAppTracker(userId) {
  if (!userId) return;

  console.log("App Tracker started for userId:", userId);

  const usageMap = {}; // { appName: { activeSeconds, idleSeconds } }
  let lastApp = null;
  let lastSentTime = Date.now();
  const idleThreshold = 60000; // 1 min idle
  let lastActivityTime = Date.now();

  setInterval(async () => {
    try {
      const window = await activeWin();
      if (!window) return;

      const currentApp = window.owner?.name || "Unknown";
      const now = Date.now();
      const isIdle = now - lastActivityTime > idleThreshold;
      if (!isIdle) lastActivityTime = now;

      if (!usageMap[currentApp]) usageMap[currentApp] = { activeSeconds: 0, idleSeconds: 0 };
      if (!isIdle) usageMap[currentApp].activeSeconds += 5;
      else usageMap[currentApp].idleSeconds += 5;

      // Send update every 10 seconds or when app changes
      if (lastApp !== currentApp || now - lastSentTime >= 10000) {
        console.clear();
        console.log("----- Real-Time App Usage -----");

        for (const appName of Object.keys(usageMap)) {
          const usage = usageMap[appName];
          const totalMinutes = Math.floor((usage.activeSeconds + usage.idleSeconds) / 60);
          const activeMinutes = Math.floor(usage.activeSeconds / 60);
          const idleMinutes = Math.floor(usage.idleSeconds / 60);

          console.log(`${appName}: ${totalMinutes} min`);

          // Send to backend
          if (activeMinutes > 0) {
            const data = {
              userId,
              appName,
              activeMinutes,
              idleMinutes,
              totalMinutes,
              date: new Date(),
            };
            await axios.post(BACKEND_URL, data).catch((err) =>
              console.error("Backend Error:", err.message)
            );
          }
        }
        lastSentTime = now;
      }

      lastApp = currentApp;
    } catch (err) {
      console.error("Tracker Error:", err.message);
    }
  }, 5000);
}

module.exports = { startAppTracker };