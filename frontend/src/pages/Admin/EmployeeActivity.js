// frontend/src/pages/Admin/EmployeeActivity.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const EmployeeActivity = () => {
  const [expandedCard, setExpandedCard] = useState("");
  const [activityVisible, setActivityVisible] = useState(false);
  const [activityList, setActivityList] = useState([]);
  const [usageData, setUsageData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    setUsageData([
      { name: "Chrome", value: 120, color: "#00C49F" },
      { name: "VSCode", value: 180, color: "#0088FE" },
      { name: "Slack", value: 60, color: "#FFBB28" },
    ]);

    setMonthlyData([
      { name: "Chrome", value: 1500, color: "#00C49F" },
      { name: "VSCode", value: 1200, color: "#0088FE" },
      { name: "Slack", value: 600, color: "#FFBB28" },
    ]);
  }, []);

  const toggleCard = (card) =>
    setExpandedCard(expandedCard === card ? "" : card);

  const fetchActivity = async () => {
    try {
      if (activityVisible) {
        setActivityVisible(false);
        return;
      }

      const res = await axios.get(
        "http://localhost:5050/api/admin/employees"
      );

      const employees =
        res.data.activities || res.data.employees || res.data || [];

      const filtered = employees
        .map((emp) => {
          if (!emp.loginHistory || emp.loginHistory.length === 0) return null;

          const lastSession = emp.loginHistory
            .slice()
            .reverse()
            .find((s) => s.loginTime !== null);

          if (!lastSession) return null;

          let workedMs = 0;
          const loginTime = new Date(lastSession.loginTime).getTime();
          const logoutTime = lastSession.logoutTime
            ? new Date(lastSession.logoutTime).getTime()
            : Date.now();

          if (!lastSession.pauseTime || lastSession.pauseTime.length === 0) {
            workedMs = logoutTime - loginTime;
          } else {
            let last = loginTime;
            lastSession.pauseTime.forEach((p) => {
              const pauseStart = new Date(p.start).getTime();
              const pauseEnd = p.end ? new Date(p.end).getTime() : Date.now();
              workedMs += pauseStart - last;
              last = pauseEnd;
            });
            workedMs += logoutTime - last;
          }

          if (workedMs < 0) workedMs = 0;

          const minutes = Math.floor(workedMs / (1000 * 60));
          const seconds = Math.floor((workedMs % (1000 * 60)) / 1000);
          const workedHours = `${minutes}m ${seconds}s`;

          return {
            date: new Date(lastSession.loginTime).toLocaleDateString(),
            employeeId: emp.employeeId,
            name: emp.name,
            loginTime: new Date(lastSession.loginTime).toLocaleTimeString(),
            pauseTime:
              lastSession.pauseTime && lastSession.pauseTime.length > 0
                ? lastSession.pauseTime
                    .map((p) =>
                      p.start ? new Date(p.start).toLocaleTimeString() : "-"
                    )
                    .join(", ")
                : "-",
            logoutTime: lastSession.logoutTime
              ? new Date(lastSession.logoutTime).toLocaleTimeString()
              : "-",
            workedHours,
          };
        })
        .filter((e) => e !== null);

      setActivityList(filtered);
      setActivityVisible(true);
    } catch (err) {
      console.error("Error fetching activity:", err);
      alert("Failed to fetch activity. Check backend!");
    }
  };

  // ================= EXPORT ALL EMPLOYEES PDF =================
  const generateAllEmployeesPDF = () => {
    if (activityList.length === 0) {
      alert("No employee data to export!");
      return;
    }

    const doc = new jsPDF();

    // Add Logo
    const logo = new Image();
    logo.src = "/Admin_Logo.png"; // your logo path
    doc.addImage(logo, "PNG", 14, 10, 40, 20); // x, y, width, height

    doc.setFontSize(18);
    doc.text("TNG Company - Employee Activity Report", 60, 20);

    doc.setFontSize(11);
    doc.text(`Generated Date: ${new Date().toLocaleString()}`, 14, 35);
    doc.text(`Total Employees: ${activityList.length}`, 14, 42);

    const tableColumn = [
      "Date",
      "Employee ID",
      "Name",
      "Login",
      "Pause",
      "Logout",
      "Worked Hours",
    ];

    const tableRows = activityList.map((emp) => [
      emp.date,
      emp.employeeId,
      emp.name,
      emp.loginTime,
      emp.pauseTime,
      emp.logoutTime,
      emp.workedHours,
    ]);

    autoTable(doc, {
      startY: 50,
      head: [tableColumn],
      body: tableRows,
    });

    doc.save("All_Employees_Activity_Report.pdf");
  };

  const generateSingleEmployeePDF = (emp) => {
    const doc = new jsPDF();

    // Add Logo
    const logo = new Image();
    logo.src = "/Admin_Logo.png"; // your logo path
    doc.addImage(logo, "PNG", 14, 10, 40, 20); // x, y, width, height

    doc.setFontSize(18);
    doc.text("TNG Company - Employee Activity Report", 60, 20);

    doc.setFontSize(11);
    doc.text(`Generated Date: ${new Date().toLocaleString()}`, 14, 35);

    const tableColumn = [
      "Employee ID",
      "Name",
      "Date",
      "Login",
      "Pause",
      "Logout",
      "Worked Hours",
    ];

    const tableRows = [
      [
        emp.employeeId,
        emp.name,
        emp.date,
        emp.loginTime,
        emp.pauseTime,
        emp.logoutTime,
        emp.workedHours,
      ],
    ];

    autoTable(doc, {
      startY: 50,
      head: [tableColumn],
      body: tableRows,
      headStyles: {
        fillColor: [26, 115, 232],
        textColor: 255,
        halign: "center",
      },
      bodyStyles: {
        halign: "center",
      },
      alternateRowStyles: {
        fillColor: [240, 245, 255],
      },
    });

    doc.save(`${emp.name}_Activity_Report.pdf`);
  };

  const cardStyle = {
    flex: "1",
    minWidth: "280px",
    maxWidth: "380px",
    height: "160px",
    borderRadius: "15px",
    color: "#fff",
    boxShadow: "0 8px 16px rgba(0,0,0,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
    textAlign: "center",
  };

  const cardHover = (e) => {
    e.currentTarget.style.transform = "scale(1.05)";
  };

  const cardLeave = (e) => {
    e.currentTarget.style.transform = "scale(1)";
  };

  return (
    <AdminLayout>
      <div style={styles.page}>
        <h1 style={styles.heading}>Employee Activity Dashboard</h1>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
            justifyContent: "center",
          }}
        >
          <div
            style={{ ...cardStyle, backgroundColor: "#1a73e8" }}
            onClick={fetchActivity}
            onMouseEnter={cardHover}
            onMouseLeave={cardLeave}
          >
            <h3>Activity</h3>
          </div>

          <div
            style={{ ...cardStyle, backgroundColor: "#20c997" }}
            onClick={() => toggleCard("daily")}
            onMouseEnter={cardHover}
            onMouseLeave={cardLeave}
          >
            <h3>Daily Usage</h3>
          </div>

          <div
            style={{ ...cardStyle, backgroundColor: "#f39c12" }}
            onClick={() => toggleCard("monthly")}
            onMouseEnter={cardHover}
            onMouseLeave={cardLeave}
          >
            <h3>Monthly Report</h3>
          </div>
        </div>

        {activityVisible && (
          <div style={{ marginTop: "30px" }}>
            <h2>Employee Activity List</h2>

            <button onClick={generateAllEmployeesPDF} style={styles.button}>
              Export All Employees PDF
            </button>

            <div style={{ overflowX: "auto", marginTop: "15px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#1a73e8", color: "#fff" }}>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Employee ID</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Login</th>
                    <th style={styles.th}>Pause</th>
                    <th style={styles.th}>Logout</th>
                    <th style={styles.th}>Worked Hours</th>
                    <th style={styles.th}>Export</th>
                  </tr>
                </thead>

                <tbody>
                  {activityList.map((emp, idx) => (
                    <tr key={idx}>
                      <td style={styles.td}>{emp.date}</td>
                      <td style={styles.td}>{emp.employeeId}</td>
                      <td style={styles.td}>{emp.name}</td>
                      <td style={styles.td}>{emp.loginTime}</td>
                      <td style={styles.td}>{emp.pauseTime}</td>
                      <td style={styles.td}>{emp.logoutTime}</td>
                      <td style={styles.td}>{emp.workedHours}</td>

                      <td style={styles.td}>
                        <button
                          onClick={() => generateSingleEmployeePDF(emp)}
                          style={styles.button}
                        >
                          Export PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

const styles = {
  page: { minHeight: "80vh", background: "#f4f7ff", padding: "40px" },
  heading: { textAlign: "center", marginBottom: "30px", color: "#1565c0" },
  button: {
    padding: "10px 15px",
    backgroundColor: "#1a73e8",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  th: { padding: "10px", border: "1px solid #ddd" },
  td: { padding: "10px", border: "1px solid #ddd" },
};

export default EmployeeActivity;