// tracker.js
const { startAppTracker } = require("./appTracker");

// Replace with actual userId or fetch dynamically from your backend DB
const USER_ID = "69a27e195dc0cc586f7e52b7"; 

console.log("Starting tracker for userId:", USER_ID);

startAppTracker(USER_ID)
  .then(() => console.log("Tracker is running..."))
  .catch((err) => console.error("Tracker failed:", err));