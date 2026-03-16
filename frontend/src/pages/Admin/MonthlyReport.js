// frontend/src/pages/Admin/MonthlyReport.js
import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API_BASE = "http://localhost:5050/api/admin";

const MonthlyReport = () => {
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [report, setReport] = useState([]);

  const fetchReport = async () => {
    if (!month || !year) {
      alert("Please select month and year");
      return;
    }

    try {
      let query = `${API_BASE}/monthly-report?month=${month}&year=${year}`;
      if (employeeId) query += `&employeeId=${employeeId}`;

      const res = await axios.get(query);

      if (res.data.success) {
        setReport(res.data.data);
      } else {
        setReport([]);
        alert("No records found");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load report");
    }
  };

  const exportPDF = () => {
    if (report.length === 0) {
      alert("No data to export");
      return;
    }

    const doc = new jsPDF();

    // Load the logo
    const img = new Image();
    img.src = "/Admin_Logo.png"; // Make sure this file is in public folder
    img.onload = () => {
      doc.addImage(img, "PNG", 14, 10, 50, 20); // x, y, width, height
      doc.setFontSize(18);
      doc.text("Employee Monthly Report", 70, 25);

      const tableColumn = ["Employee ID", "Name", "Date", "Login", "Logout", "Worked Hours"];
      const tableRows = report.map((r) => [
        r.employeeId,
        r.name,
        r.date,
        new Date(r.login).toLocaleTimeString(),
        r.logout ? new Date(r.logout).toLocaleTimeString() : "-",
        r.workedHours
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40, // leave space for logo and title
      });

      doc.save(`Monthly_Report_${month}-${year}${employeeId ? `_${employeeId}` : ""}.pdf`);
    };
  };

  return (
    <div style={{
      padding: "20px 30px",
      background: "#fff",
      borderRadius: "16px",
      boxShadow: "0 12px 25px rgba(0,0,0,0.12)",
      maxWidth: "1200px",
      margin: "20px auto",
    }}>
      {/* Header with Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
        <img src="/Admin_Logo.png" alt="Logo" style={{ height: "50px", width: "auto" }} />
        <h2 style={{ margin: 0, color: "#1565c0" }}>Employee Monthly Report</h2>
      </div>

      {/* Input Filters & Buttons */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "15px",
        marginBottom: "20px",
        alignItems: "center"
      }}>
        <input
          type="text"
          placeholder="Employee ID (optional)"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            flex: "1",
            minWidth: "180px"
          }}
        />
        <input
          type="number"
          placeholder="Month (1-12)"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            width: "120px"
          }}
        />
        <input
          type="number"
          placeholder="Year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            width: "120px"
          }}
        />
        <button
          onClick={fetchReport}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#1565c0",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          Load Report
        </button>
        <button
          onClick={exportPDF}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#1abc9c",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          Export PDF
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#1565c0", color: "#fff" }}>
            <tr>
              <th style={thStyle}>Employee ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Login</th>
              <th style={thStyle}>Logout</th>
              <th style={thStyle}>Worked Hours</th>
            </tr>
          </thead>
          <tbody>
            {report.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "12px" }}>No records found</td>
              </tr>
            ) : (
              report.map((r, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={tdStyle}>{r.employeeId}</td>
                  <td style={tdStyle}>{r.name}</td>
                  <td style={tdStyle}>{r.date}</td>
                  <td style={tdStyle}>{new Date(r.login).toLocaleTimeString()}</td>
                  <td style={tdStyle}>{r.logout ? new Date(r.logout).toLocaleTimeString() : "-"}</td>
                  <td style={tdStyle}>{r.workedHours}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const thStyle = {
  padding: "12px",
  textAlign: "left",
  fontWeight: "600",
};

const tdStyle = {
  padding: "12px",
  textAlign: "left",
};

export default MonthlyReport;