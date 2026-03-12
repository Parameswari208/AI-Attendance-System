const activeWin = require("active-win");
const { sendUsageData } = require("./apiService");

let lastApp = null;
let startTime = null;
let lastTitle = null;

async function trackActiveWindow() {
    try {
        console.log("Tracking Active Window...");

        const window = await activeWin();

        if (!window || !window.owner) return;

        const currentApp = window.owner.name || "unknown";
        const windowTitle = window.title || "unknown";

        // Detect app change
        if (lastApp !== currentApp) {

            if (lastApp && startTime) {

                const endTime = Date.now();
                const duration = Math.floor((endTime - startTime) / 1000);

                console.log("Sending Data To Backend");

                await sendUsageData({
                    appName: lastApp,
                    windowTitle: lastTitle || windowTitle,
                    duration
                });
            }

            lastApp = currentApp;
            lastTitle = windowTitle;
            startTime = Date.now();
        }

    } catch (err) {
        console.log("Tracking Error:", err.message);
    }
}

// Background Tracker Loop
function startTracker() {
    console.log("✅ AI Tracker Engine Started");
    console.log("✅ Tracker Loop Running");

    setInterval(trackActiveWindow, 2000);
}

module.exports = { startTracker };