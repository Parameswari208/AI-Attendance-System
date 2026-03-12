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
    doc.text("Employee Monthly Report", 14, 15);

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
      startY: 25,
    });

    doc.save(`Monthly_Report_${month}-${year}${employeeId ? `_${employeeId}` : ""}.pdf`);
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>Employee Monthly Report</h2>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Employee ID (optional)"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <input
          type="number"
          placeholder="Month (1-12)"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <input
          type="number"
          placeholder="Year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <button onClick={fetchReport}>Load Report</button>
        <button onClick={exportPDF} style={{ marginLeft: "10px" }}>Export PDF</button>
      </div>

      <table border="1" width="100%" cellPadding="10">
        <thead style={{ background: "#1565c0", color: "#fff" }}>
          <tr>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Date</th>
            <th>Login</th>
            <th>Logout</th>
            <th>Worked Hours</th>
          </tr>
        </thead>
        <tbody>
          {report.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: "center" }}>No records found</td>
            </tr>
          ) : (
            report.map((r, index) => (
              <tr key={index}>
                <td>{r.employeeId}</td>
                <td>{r.name}</td>
                <td>{r.date}</td>
                <td>{new Date(r.login).toLocaleTimeString()}</td>
                <td>{r.logout ? new Date(r.logout).toLocaleTimeString() : "-"}</td>
                <td>{r.workedHours}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MonthlyReport;