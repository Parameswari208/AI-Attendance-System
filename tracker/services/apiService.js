const axios = require("axios");

const BACKEND_URL = "http://localhost:5050"; // Change in production

async function sendUsageData(data) {
    try {
        await axios.post(`${BACKEND_URL}/api/tracker/log`, data);
    } catch (err) {
        console.log("API Send Error:", err.message);
    }
}

module.exports = { sendUsageData };