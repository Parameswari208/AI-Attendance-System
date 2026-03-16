# AI Attendance System

Version: 1.0.0

# Installation & Setup
1. Backend
cd backend
npm install
npm start

2. Frontend
cd frontend
npm install
npm start

3. Tracker
cd tracker
npm install
npm start

Required Changes Before Running on a New System

# MongoDB Connection

Update .env in backend folder:

MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-secret-key>

# Make sure MongoDB service is running.

Email Service

# Update email credentials in .env:

EMAIL_USER=<your-email@example.com>
EMAIL_PASS=<your-email-password>

# Ensure less secure apps or app password is enabled if using Gmail.

Frontend

In .env.development.local (or .env), check backend API URL:

REACT_APP_API_URL=http://localhost:5050/api

Face Recognition Models

Ensure public/models folder exists in frontend with required .json and .bin files.

If missing, run scripts/download-models.ps1 (Windows) to download models.

Port Conflicts

Backend default: 5050

Frontend default: 3000

Tracker default: 3001 (or modify in main.js if needed)

# How to Test

Run backend, frontend, and tracker in separate terminals.

Open frontend in browser (http://localhost:3000).

Admin can register employees and send invites.

Employees log in daily; their activity is stored in admin panel.

Test PDF export and monthly/daily attendance reports.