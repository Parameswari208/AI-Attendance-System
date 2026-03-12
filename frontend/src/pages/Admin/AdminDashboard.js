import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { FaUsers, FaUserCheck, FaUserPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [showEmployees, setShowEmployees] = useState(false);
  const navigate = useNavigate();

  // ================= TOTAL EMPLOYEES =================
  const fetchTotalEmployees = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5050/api/admin/employee-count"
      );

      if (res.data.success) {
        setTotalEmployees(res.data.totalEmployees);
      }
    } catch (error) {
      console.error("Total employee error:", error);
    }
  };

// ================= ACTIVE TODAY =================
const fetchActiveToday = async () => {
  try {
    const res = await axios.get(`${API_BASE}/employees`);
    const employeesData = res.data.employees || [];

    // Count only currently logged-in users
    const active = employeesData.filter(emp => emp.isLoggedIn);

    setActiveCount(active.length);
  } catch (error) {
    console.error("Active employee error:", error);
  }
};
  // ================= FETCH EMPLOYEES =================
  const fetchEmployees = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5050/api/admin/employees"
      );

      if (res.data.success) {
        setEmployees(res.data.employees);
      }
    } catch (error) {
      console.error("Employee fetch error:", error);
    }
  };

  useEffect(() => {
    fetchTotalEmployees();
    fetchActiveToday();
    fetchEmployees();
  }, []);

  const cardStyle = {
    flex: "1",
    minWidth: "220px",
    margin: "15px",
    padding: "25px",
    borderRadius: "15px",
    color: "#fff",
    boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    transition: "all 0.3s ease",
    cursor: "pointer",
  };

  return (
    <AdminLayout>
      <div style={{ fontFamily: "'Poppins', sans-serif" }}>
        <h1 style={{ color: "#0047ab", marginBottom: "25px" }}>
          Admin Dashboard
        </h1>

        {/* ================= DASHBOARD CARDS ================= */}

        <div style={{ display: "flex", flexWrap: "wrap" }}>

          {/* TOTAL EMPLOYEES */}

          <div
            style={{ ...cardStyle, backgroundColor: "#1a73e8" }}
          >
            <FaUsers size={40} style={{ marginBottom: "10px" }} />

            <div style={{ fontSize: "18px", fontWeight: 600 }}>
              Total Employees
            </div>

            <div style={{ fontSize: "28px", fontWeight: 700 }}>
              {totalEmployees}
            </div>
          </div>

          {/* ACTIVE TODAY */}

          <div
            style={{ ...cardStyle, backgroundColor: "#20c997" }}
          >
            <FaUserCheck size={40} style={{ marginBottom: "10px" }} />

            <div style={{ fontSize: "18px", fontWeight: 600 }}>
              Active Today
            </div>

            <div style={{ fontSize: "28px", fontWeight: 700 }}>
              {activeCount}
            </div>
          </div>

          {/* ONBOARDED EMPLOYEES */}

          <div
            style={{ ...cardStyle, backgroundColor: "#f39c12" }}
            onClick={() => setShowEmployees(!showEmployees)}
          >
            <FaUserPlus size={40} style={{ marginBottom: "10px" }} />

            <div style={{ fontSize: "18px", fontWeight: 600 }}>
              Onboarded Employees
            </div>

            <div style={{ fontSize: "28px", fontWeight: 700 }}>
              {employees.length}
            </div>
          </div>

        </div>


        {/* MONTHLY REPORT */}

<div
  style={{ ...cardStyle, backgroundColor: "#8e44ad" }}
  onClick={() => navigate("/admin/monthly-report")}
>
  <FaUsers size={40} style={{ marginBottom: "10px" }} />

  <div style={{ fontSize: "18px", fontWeight: 600 }}>
    Monthly Report
  </div>

  <div style={{ fontSize: "14px" }}>
    View & Export
  </div>
</div>

        {/* ================= EMPLOYEE TABLE ================= */}

        {showEmployees && (
          <div style={{ marginTop: "30px" }}>
            <h2 style={{ color: "#0047ab", marginBottom: "15px" }}>
              Onboarded Employees List
            </h2>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  background: "#fff",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#0047ab", color: "#fff" }}>
                    <th style={{ padding: "10px" }}>Employee ID</th>
                    <th style={{ padding: "10px" }}>Name</th>
                    <th style={{ padding: "10px" }}>Email</th>
                    <th style={{ padding: "10px" }}>Last Login</th>
                  </tr>
                </thead>

                <tbody>
                  {employees.map((emp, index) => (
                    <tr key={index} style={{ textAlign: "center" }}>
                      <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                        {emp.employeeId}
                      </td>

                      <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                        {emp.name}
                      </td>

                      <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                        {emp.email}
                      </td>

                      <td style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
                        {emp.lastLogin
                          ? new Date(emp.lastLogin).toLocaleString()
                          : "-"}
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

export default AdminDashboard;