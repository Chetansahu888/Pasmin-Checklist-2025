"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { BarChart3, CheckCircle2, Clock, ListTodo, Users, AlertTriangle, Filter, TrendingUp, Calendar, Target } from 'lucide-react'
import AdminLayout from "../../components/layout/AdminLayout.jsx"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts"

export default function AdminDashboard() {
  const [dashboardType, setDashboardType] = useState("checklist")
  const [taskView, setTaskView] = useState("recent")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterStaff, setFilterStaff] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // State for Master Sheet dropdown
  const [masterSheetOptions, setMasterSheetOptions] = useState([])
  const [selectedMasterOption, setSelectedMasterOption] = useState("All Departments")
  const [isFetchingMaster, setIsFetchingMaster] = useState(false)

  // State for department data
  const [departmentData, setDepartmentData] = useState({
    allTasks: [],
    staffMembers: [],
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    activeStaff: 0,
    completionRate: 0,
    barChartData: [],
    pieChartData: [],
    completedRatingOne: 0,
    completedRatingTwo: 0,
    completedRatingThreePlus: 0
  })

  // Store the current date for overdue calculation
  const [currentDate, setCurrentDate] = useState(new Date())

  // New state for date range filtering
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
    filtered: false
  });

  // State to store filtered statistics
  const [filteredDateStats, setFilteredDateStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completionRate: 0
  });

  // Helper function to format date from ISO format to DD/MM/YYYY
  const formatLocalDate = (isoDate) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    return formatDateToDDMMYYYY(date);
  };

  // Function to filter tasks by date range
  const filterTasksByDateRange = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert("Please select both start and end dates");
      return;
    }

    const startDate = new Date(dateRange.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);

    if (startDate > endDate) {
      alert("Start date must be before end date");
      return;
    }

    const filteredTasks = departmentData.allTasks.filter(task => {
      const taskStartDate = parseDateFromDDMMYYYY(task.taskStartDate);
      if (!taskStartDate) return false;
      return taskStartDate >= startDate && taskStartDate <= endDate;
    });

    let totalTasks = filteredTasks.length;
    let completedTasks = 0;
    let pendingTasks = 0;
    let overdueTasks = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filteredTasks.forEach(task => {
      if (task.status === 'completed') {
        completedTasks++;
      } else {
        pendingTasks++;
        if (task.status === 'overdue') {
          overdueTasks++;
        }
      }
    });

    const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

    setFilteredDateStats({
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRate
    });

    setDateRange(prev => ({ ...prev, filtered: true }));
  };

  // Format date as DD/MM/YYYY
  const formatDateToDDMMYYYY = (date) => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Parse DD/MM/YYYY to Date object
  const parseDateFromDDMMYYYY = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null
    const parts = dateStr.split('/')
    if (parts.length !== 3) return null
    return new Date(parts[2], parts[1] - 1, parts[0])
  }

  // Function to check if a date is in the past
  const isDateInPast = (dateStr) => {
    const date = parseDateFromDDMMYYYY(dateStr)
    if (!date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  // Function to check if a date is today
  const isDateToday = (dateStr) => {
    const date = parseDateFromDDMMYYYY(dateStr)
    if (!date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date.getTime() === today.getTime()
  }

  // Function to check if a date is tomorrow
  const isDateTomorrow = (dateStr) => {
    const date = parseDateFromDDMMYYYY(dateStr)
    if (!date) return false
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return date.getTime() === tomorrow.getTime()
  }

  // Function to check if a date is in the future (after today)
  const isDateInFuture = (dateStr) => {
    const date = parseDateFromDDMMYYYY(dateStr)
    if (!date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date > today
  }

  // Safe access to cell value
  const getCellValue = (row, index) => {
    if (!row || !row.c || index >= row.c.length) return null
    const cell = row.c[index]
    return cell && 'v' in cell ? cell.v : null
  }

  // Parse Google Sheets Date format into a proper date string
  const parseGoogleSheetsDate = (dateStr) => {
    if (!dateStr) return ''

    console.log(`Parsing date: "${dateStr}" (type: ${typeof dateStr})`);

    if (typeof dateStr === 'string' && dateStr.startsWith('Date(')) {
      const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateStr)
      if (match) {
        const year = parseInt(match[1], 10)
        const month = parseInt(match[2], 10)
        const day = parseInt(match[3], 10)
        const formatted = `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
        console.log(`Converted Google Sheets date to: ${formatted}`);
        return formatted;
      }
    }

    if (typeof dateStr === 'string' && dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const parts = dateStr.split('/');
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      const normalized = `${day}/${month}/${year}`;
      console.log(`Normalized date to: ${normalized}`);
      return normalized;
    }

    if (dateStr instanceof Date && !isNaN(dateStr.getTime())) {
      const formatted = formatDateToDDMMYYYY(dateStr);
      console.log(`Converted Date object to: ${formatted}`);
      return formatted;
    }

    try {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        const formatted = formatDateToDDMMYYYY(date);
        console.log(`Parsed generic date to: ${formatted}`);
        return formatted;
      }
    } catch (e) {
      console.error("Error parsing date:", e)
    }

    console.log(`Failed to parse date, returning original: ${dateStr}`);
    return dateStr
  }

  // Function to fetch column A from master sheet
  const fetchMasterSheetColumnA = async () => {
    try {
      setIsFetchingMaster(true)
      const response = await fetch(`https://docs.google.com/spreadsheets/d/1sn8_JWWODv3JM097Q1oIpVt0EhxRxEBi4sy7onV95tc/gviz/tq?tqx=out:json&sheet=MASTER`)

      if (!response.ok) {
        throw new Error(`Failed to fetch master sheet data: ${response.status}`)
      }

      const text = await response.text()
      const jsonStart = text.indexOf('{')
      const jsonEnd = text.lastIndexOf('}')
      const jsonString = text.substring(jsonStart, jsonEnd + 1)
      const data = JSON.parse(jsonString)

      const columnAValues = data.table.rows
        .slice(1)
        .map(row => {
          if (row && row.c && row.c[0]) {
            return row.c[0].v || null
          }
          return null
        })
        .filter(value => value !== null && value !== '')

      const options = ["Select Department", "All Departments", ...columnAValues]
      if (!options.includes("REFRATECH")) options.push("REFRATECH");
      setMasterSheetOptions(options)

      if (!selectedMasterOption) {
        setSelectedMasterOption(options[1])
      }

      let activeStaffCount = 0
      data.table.rows.slice(1).forEach(row => {
        const cellValue = getCellValue(row, 2)
        if (cellValue !== null && cellValue !== '') {
          activeStaffCount++
        }
      })

      setDepartmentData(prev => ({
        ...prev,
        activeStaff: activeStaffCount
      }))

    } catch (error) {
      console.error("Error fetching master sheet data:", error)
      setMasterSheetOptions(["Error loading master data"])
    } finally {
      setIsFetchingMaster(false)
    }
  }

  // Modified fetch function to support both checklist and delegation
  const fetchDepartmentData = async (department) => {
    if (!department || department === "Select Department") {
      return;
    }

    let sheetNames = [];
    if (dashboardType === "delegation") {
      sheetNames = ["DELEGATION"];
    } else if (department === "All Departments") {
      sheetNames = masterSheetOptions.filter(opt => opt !== "Select Department" && opt !== "All Departments");
    } else {
      sheetNames = [department];
    }

    if (sheetNames.length === 0) return;

    try {
      setIsFetchingMaster(true);

      console.log(`Fetching data for dashboard type: ${dashboardType}, sheets: ${sheetNames.join(', ')}`);

      let combinedRows = [];
      combinedRows.push({ c: [] });

      await Promise.all(sheetNames.map(async (sheetName) => {
        try {
          const response = await fetch(`https://docs.google.com/spreadsheets/d/1sn8_JWWODv3JM097Q1oIpVt0EhxRxEBi4sy7onV95tc/gviz/tq?tqx=out:json&sheet=${sheetName}`);

          if (!response.ok) {
            console.warn(`Failed to fetch ${sheetName} sheet data: ${response.status}`);
            return;
          }

          const text = await response.text();
          const jsonStart = text.indexOf('{');
          if (jsonStart === -1) return;
          const jsonEnd = text.lastIndexOf('}');
          const jsonString = text.substring(jsonStart, jsonEnd + 1);
          const data = JSON.parse(jsonString);

          if (data.table && data.table.rows && data.table.rows.length > 1) {
            combinedRows.push(...data.table.rows.slice(1));
          }
        } catch (e) {
          console.error(`Error processing sheet ${sheetName}:`, e);
        }
      }));

      const data = { table: { rows: combinedRows } };

      console.log(`Fetched combined data:`, {
        totalRows: data.table.rows.length,
        firstFewRows: data.table.rows.slice(0, 3).map((row, idx) => ({
          rowIndex: idx,
          rowData: row.c ? row.c.map(cell => cell?.v) : row
        }))
      });

      const username = sessionStorage.getItem('username');
      const userRole = sessionStorage.getItem('role');

      let totalTasks = 0;
      let completedTasks = 0;
      let pendingTasks = 0;
      let overdueTasks = 0;

      let completedRatingOne = 0;
      let completedRatingTwo = 0;
      let completedRatingThreePlus = 0;

      const monthlyData = {
        Jan: { completed: 0, pending: 0 },
        Feb: { completed: 0, pending: 0 },
        Mar: { completed: 0, pending: 0 },
        Apr: { completed: 0, pending: 0 },
        May: { completed: 0, pending: 0 },
        Jun: { completed: 0, pending: 0 },
        Jul: { completed: 0, pending: 0 },
        Aug: { completed: 0, pending: 0 },
        Sep: { completed: 0, pending: 0 },
        Oct: { completed: 0, pending: 0 },
        Nov: { completed: 0, pending: 0 },
        Dec: { completed: 0, pending: 0 }
      };

      const statusData = {
        Completed: 0,
        Pending: 0,
        Overdue: 0
      };

      const staffTrackingMap = new Map();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const processedRows = data.table.rows.map((row, rowIndex) => {
        if (rowIndex === 0) return null;

        if (rowIndex <= 5) {
          console.log(`Processing row ${rowIndex + 1} (sheet row ${rowIndex + 1}):`, row);
        }

        const assignedTo = getCellValue(row, 4) || 'Unassigned';
        const isUserMatch = userRole === 'admin' ||
          assignedTo.toLowerCase() === username.toLowerCase();

        if (rowIndex <= 5) {
          console.log(`Row ${rowIndex + 1}: assignedTo="${assignedTo}", username="${username}", userRole="${userRole}", isMatch=${isUserMatch}`);
        }

        if (!isUserMatch) {
          if (rowIndex <= 5) console.log(`Row ${rowIndex + 1}: Skipped due to user mismatch`);
          return null;
        }

        const taskId = getCellValue(row, 1);

        if (rowIndex <= 5) {
          console.log(`Row ${rowIndex + 1}: taskId="${taskId}" (type: ${typeof taskId})`);
        }

        if (taskId === null || taskId === undefined || taskId === '' ||
          (typeof taskId === 'string' && taskId.trim() === '')) {
          if (rowIndex <= 5) console.log(`Row ${rowIndex + 1}: Skipped due to empty/null task ID`);
          return null;
        }

        const taskIdStr = String(taskId).trim();

        let taskStartDateValue = getCellValue(row, 6);
        const taskStartDate = taskStartDateValue ? parseGoogleSheetsDate(String(taskStartDateValue)) : '';

        if (rowIndex <= 5) {
          console.log(`Row ${rowIndex + 1}: taskStartDateValue="${taskStartDateValue}", parsed="${taskStartDate}"`);
        }

        const taskStartDateObj = parseDateFromDDMMYYYY(taskStartDate);

        if (rowIndex <= 5) {
          console.log(`Row ${rowIndex + 1}: taskStartDateObj=${taskStartDateObj}, today=${today}, tomorrow=${tomorrow}, isValid=${!!taskStartDateObj}`);
        }

        if (dashboardType === "delegation") {
          if (!taskStartDateObj) {
            if (rowIndex <= 5) console.log(`Row ${rowIndex + 1}: Skipped due to invalid date in delegation mode`);
            return null;
          }
        } else {
          if (!taskStartDateObj || taskStartDateObj > tomorrow) {
            if (rowIndex <= 5) console.log(`Row ${rowIndex + 1}: Skipped due to invalid/far future date (beyond tomorrow) in checklist mode`);
            return null;
          }
        }

        let completionDateValue, completionDate;
        if (dashboardType === "delegation") {
          completionDateValue = getCellValue(row, 11);
        } else {
          completionDateValue = getCellValue(row, 10);
        }

        completionDate = completionDateValue ? parseGoogleSheetsDate(String(completionDateValue)) : '';

        if (rowIndex <= 5) {
          console.log(`Row ${rowIndex + 1}: completionDateValue="${completionDateValue}", parsed="${completionDate}"`);
        }

        if (!staffTrackingMap.has(assignedTo)) {
          staffTrackingMap.set(assignedTo, {
            name: assignedTo,
            totalTasks: 0,
            completedTasks: 0,
            pendingTasks: 0,
            progress: 0
          });
        }

        const taskDescription = getCellValue(row, 5) || 'Untitled Task';
        const frequency = getCellValue(row, 7) || 'one-time';

        let status = 'pending';

        if (completionDate && completionDate !== '') {
          status = 'completed';
        } else if (isDateInPast(taskStartDate) && !isDateToday(taskStartDate)) {
          status = 'overdue';
        } else {
          status = 'pending';
        }

        if (rowIndex <= 5) {
          console.log(`Row ${rowIndex + 1}: status="${status}", completionDate="${completionDate}", isDateInPast=${isDateInPast(taskStartDate)}, isDateToday=${isDateToday(taskStartDate)}, isDateTomorrow=${isDateTomorrow(taskStartDate)}`);
          console.log(`Row ${rowIndex + 1}: Will count in - Pending: ${!completionDate}, Overdue: ${!completionDate && isDateInPast(taskStartDate) && !isDateToday(taskStartDate)}`);
        }

        const taskObj = {
          id: taskIdStr,
          title: taskDescription,
          assignedTo,
          taskStartDate,
          dueDate: taskStartDate,
          status,
          frequency
        };

        if (rowIndex <= 5) {
          console.log(`Row ${rowIndex + 1}: Created task object:`, taskObj);
        }

        const staffData = staffTrackingMap.get(assignedTo);
        staffData.totalTasks++;

        const shouldCountInStats = dashboardType === "delegation" ? true : taskStartDateObj <= today;

        if (shouldCountInStats) {
          totalTasks++;

          if (status === 'completed') {
            completedTasks++;
            staffData.completedTasks++;
            statusData.Completed++;

            if (dashboardType === "delegation") {
              const ratingValue = getCellValue(row, 17);
              if (ratingValue === 1) {
                completedRatingOne++;
              } else if (ratingValue === 2) {
                completedRatingTwo++;
              } else if (ratingValue > 2) {
                completedRatingThreePlus++;
              }
            }

            const completedMonth = parseDateFromDDMMYYYY(completionDate);
            if (completedMonth) {
              const monthName = completedMonth.toLocaleString('default', { month: 'short' });
              if (monthlyData[monthName]) {
                monthlyData[monthName].completed++;
              }
            }
          } else {
            staffData.pendingTasks++;

            if (isDateInPast(taskStartDate) && !isDateToday(taskStartDate)) {
              overdueTasks++;
              statusData.Overdue++;
            }

            pendingTasks++;
            statusData.Pending++;

            const monthName = today.toLocaleString('default', { month: 'short' });
            if (monthlyData[monthName]) {
              monthlyData[monthName].pending++;
            }
          }
        }

        return taskObj;
      }).filter(task => task !== null);

      console.log(`Processing summary:`);
      console.log(`  Total rows in sheet: ${data.table.rows.length}`);
      console.log(`  Rows after filtering: ${processedRows.length}`);
      console.log(`  Total tasks counted: ${totalTasks}`);
      console.log(`  Completed tasks: ${completedTasks}`);
      console.log(`  Pending tasks: ${pendingTasks}`);
      console.log(`  Overdue tasks: ${overdueTasks}`);

      const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

      const barChartData = Object.entries(monthlyData).map(([name, data]) => ({
        name,
        completed: data.completed,
        pending: data.pending
      }));

      const pieChartData = [
        { name: "Completed", value: statusData.Completed, color: "#10b981" },
        { name: "Pending", value: statusData.Pending, color: "#f59e0b" },
        { name: "Overdue", value: statusData.Overdue, color: "#ef4444" }
      ];

      const staffMembers = Array.from(staffTrackingMap.values()).map(staff => {
        const progress = staff.totalTasks > 0
          ? Math.round((staff.completedTasks / staff.totalTasks) * 100)
          : 0;

        return {
          id: staff.name.replace(/\s+/g, '-').toLowerCase(),
          name: staff.name,
          email: `${staff.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          totalTasks: staff.totalTasks,
          completedTasks: staff.completedTasks,
          pendingTasks: staff.pendingTasks,
          progress
        };
      });

      setDepartmentData({
        allTasks: processedRows,
        staffMembers,
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        activeStaff: departmentData.activeStaff,
        completionRate,
        barChartData,
        pieChartData,
        completedRatingOne,
        completedRatingTwo,
        completedRatingThreePlus
      });

    } catch (error) {
      console.error(`Error fetching department data:`, error);
    } finally {
      setIsFetchingMaster(false);
    }
  };

  useEffect(() => {
    if (dashboardType === "delegation") {
      fetchDepartmentData("DELEGATION");
    } else if (selectedMasterOption && selectedMasterOption !== "Select Department") {
      fetchDepartmentData(selectedMasterOption);
    }
  }, [selectedMasterOption, dashboardType, masterSheetOptions]);

  useEffect(() => {
    setCurrentDate(new Date());
    fetchMasterSheetColumnA();
  }, []);

  // Memoized filtered tasks based on criteria
  const filteredTasks = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase().trim();
    
    return departmentData.allTasks.filter((task) => {
      if (filterStatus !== "all" && task.status !== filterStatus) return false;
      if (filterStaff !== "all" && task.assignedTo !== filterStaff) return false;

      if (query !== "") {
        if (typeof task.title === 'string' && task.title.toLowerCase().includes(query)) return true;
        if (String(task.id).toLowerCase().includes(query)) return true;
        if (typeof task.assignedTo === 'string' && task.assignedTo.toLowerCase().includes(query)) return true;
        return false;
      }

      return true;
    });
  }, [departmentData.allTasks, filterStatus, filterStaff, debouncedSearchQuery]);

  // Memoized tasks by view to avoid repeated filtering in render
  const tasksByView = useMemo(() => {
    return {
      recent: filteredTasks.filter(task => task.status !== "completed" && isDateToday(task.taskStartDate)),
      upcoming: filteredTasks.filter(task => {
        if (task.status === "completed") return false;
        if (dashboardType === "delegation") {
          return isDateInFuture(task.taskStartDate);
        } else {
          return isDateTomorrow(task.taskStartDate);
        }
      }),
      overdue: filteredTasks.filter(task => task.status !== "completed" && isDateInPast(task.taskStartDate) && !isDateToday(task.taskStartDate))
    };
  }, [filteredTasks, dashboardType]);

  const getTasksByView = useCallback((view) => {
    return tasksByView[view] || [];
  }, [tasksByView]);

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-700 border-emerald-200"
      case "pending":
        return "bg-amber-500/10 text-amber-700 border-amber-200"
      case "overdue":
        return "bg-rose-500/10 text-rose-700 border-rose-200"
      default:
        return "bg-slate-500/10 text-slate-700 border-slate-200"
    }
  }

  const getFrequencyColor = (frequency) => {
    switch (frequency) {
      case "one-time":
        return "bg-slate-100 text-slate-700 hover:bg-slate-200"
      case "daily":
        return "bg-blue-100 text-blue-700 hover:bg-blue-200"
      case "weekly":
        return "bg-purple-100 text-purple-700 hover:bg-purple-200"
      case "fortnightly":
        return "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
      case "monthly":
        return "bg-orange-100 text-orange-700 hover:bg-orange-200"
      case "quarterly":
        return "bg-amber-100 text-amber-700 hover:bg-amber-200"
      case "yearly":
        return "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
      default:
        return "bg-slate-100 text-slate-700 hover:bg-slate-200"
    }
  }

  // Tasks Overview Chart Component
  const TasksOverviewChart = () => {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={departmentData.barChartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" fontSize={12} stroke="#6b7280" tickLine={false} axisLine={false} />
          <YAxis fontSize={12} stroke="#6b7280" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          <Bar dataKey="completed" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="pending" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Tasks Completion Chart Component
  const TasksCompletionChart = () => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={departmentData.pieChartData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
          >
            {departmentData.pieChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  // Staff Tasks Table Component
  const StaffTasksTable = () => {
    return (
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Total Tasks
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Completed
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Pending
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Progress
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {departmentData.staffMembers.map((staff) => (
              <tr key={staff.id} className="hover:bg-blue-50/40 transition-colors duration-200">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium text-sm shadow-sm">
                      {staff.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{staff.name}</div>
                      <div className="text-xs text-slate-500">{staff.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-slate-900">{staff.totalTasks}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-emerald-600">{staff.completedTasks}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-amber-600">{staff.pendingTasks}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${staff.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-medium text-slate-600">{staff.progress}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {staff.progress >= 80 ? (
                    <span className="px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Excellent
                    </span>
                  ) : staff.progress >= 60 ? (
                    <span className="px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      Good
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      Needs Improvement
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Optimized display stats calculation using useMemo
  const displayStats = useMemo(() => {
    if (filterStaff === "all" && debouncedSearchQuery === "") {
      return {
        total: departmentData.totalTasks,
        completed: departmentData.completedTasks,
        pending: departmentData.pendingTasks,
        overdue: departmentData.overdueTasks,
        rate: departmentData.completionRate,
        ratingOne: departmentData.completedRatingOne,
        ratingTwo: departmentData.completedRatingTwo,
        ratingThreePlus: departmentData.completedRatingThreePlus
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const searchLower = debouncedSearchQuery.toLowerCase().trim();
    let total = 0, completed = 0, pending = 0, overdue = 0;

    departmentData.allTasks.forEach(task => {
      // Apply staff filter
      if (filterStaff !== "all" && task.assignedTo !== filterStaff) return;
      
      // Apply search filter
      if (searchLower) {
        const matchesSearch = Object.values(task).some(val => 
          val && val.toString().toLowerCase().includes(searchLower)
        );
        if (!matchesSearch) return;
      }

      const taskStartDateObj = parseDateFromDDMMYYYY(task.taskStartDate);
      const shouldCount = dashboardType === "delegation" || (taskStartDateObj && taskStartDateObj <= today);

      if (shouldCount) {
        total++;
        if (task.status === "completed") {
          completed++;
        } else {
          pending++;
          if (task.status === "overdue") overdue++;
        }
      }
    });

    return {
      total,
      completed,
      pending,
      overdue,
      rate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0,
      ratingOne: departmentData.completedRatingOne,
      ratingTwo: departmentData.completedRatingTwo,
      ratingThreePlus: departmentData.completedRatingThreePlus
    };
  }, [departmentData, filterStaff, debouncedSearchQuery, dashboardType]);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Header Section with Improved Typography */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-sm text-slate-600 mt-1">Manage and monitor all tasks and team performance</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Dashboard Type Selection */}
            <select
              value={dashboardType}
              onChange={(e) => setDashboardType(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              <option value="checklist">Checklist</option>
              <option value="delegation">Delegation</option>
            </select>

            {/* Department dropdown */}
            <select
              value={selectedMasterOption}
              onChange={(e) => setSelectedMasterOption(e.target.value)}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isFetchingMaster || dashboardType === "delegation"}
            >
              {dashboardType === "delegation" ? (
                <option>Delegation Mode</option>
              ) : isFetchingMaster ? (
                <option>Loading...</option>
              ) : (
                masterSheetOptions.map((option, index) => (
                  <option key={index} value={option}>
                    {option}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Enhanced Stat Cards */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-blue-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/30 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">Total Tasks</h3>
                <div className="p-2.5 bg-blue-500 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                  <ListTodo className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="text-4xl font-bold text-blue-900 mb-2">{displayStats.total}</div>
              <p className="text-xs text-blue-700 font-medium">
                {dashboardType === "delegation"
                  ? "Total tasks in delegation"
                  : selectedMasterOption !== "Select Department"
                    ? `In ${selectedMasterOption}`
                    : "Select a department"
                }
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-emerald-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/30 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide">
                  {dashboardType === "delegation" ? "Completed" : "Completed"}
                </h3>
                <div className="p-2.5 bg-emerald-500 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="text-4xl font-bold text-emerald-900 mb-2">
                {dashboardType === "delegation" ? displayStats.ratingOne : displayStats.completed}
              </div>
              <p className="text-xs text-emerald-700 font-medium">
                {dashboardType === "delegation" ? "Completed once" : "Total completed"}
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-amber-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-amber-900 uppercase tracking-wide">
                  {dashboardType === "delegation" ? "Completed" : "Pending"}
                </h3>
                <div className="p-2.5 bg-amber-500 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                  {dashboardType === "delegation" ? (
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  ) : (
                    <Clock className="h-5 w-5 text-white" />
                  )}
                </div>
              </div>
              <div className="text-4xl font-bold text-amber-900 mb-2">
                {dashboardType === "delegation" ? displayStats.ratingTwo : displayStats.pending}
              </div>
              <p className="text-xs text-amber-700 font-medium">
                {dashboardType === "delegation" ? "Completed twice" : "Including today"}
              </p>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-rose-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-200/30 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-rose-900 uppercase tracking-wide">
                  {dashboardType === "delegation" ? "Completed" : "Overdue"}
                </h3>
                <div className="p-2.5 bg-rose-500 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                  {dashboardType === "delegation" ? (
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-white" />
                  )}
                </div>
              </div>
              <div className="text-4xl font-bold text-rose-900 mb-2">
                {dashboardType === "delegation" ? displayStats.ratingThreePlus : displayStats.overdue}
              </div>
              <p className="text-xs text-rose-700 font-medium">
                {dashboardType === "delegation" ? "Completed 3+ times" : "Past due dates"}
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Task Navigation */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
          <div className="grid grid-cols-3 bg-slate-50">
            <button
              className={`py-4 text-center font-semibold text-sm transition-all duration-200 relative ${taskView === "recent"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
                }`}
              onClick={() => setTaskView("recent")}
            >
              {taskView === "recent" && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600"></div>
              )}
              Recent Tasks
            </button>
            <button
              className={`py-4 text-center font-semibold text-sm transition-all duration-200 relative ${taskView === "upcoming"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
                }`}
              onClick={() => setTaskView("upcoming")}
            >
              {taskView === "upcoming" && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600"></div>
              )}
              {dashboardType === "delegation" ? "All Pending" : "Upcoming"}
            </button>
            <button
              className={`py-4 text-center font-semibold text-sm transition-all duration-200 relative ${taskView === "overdue"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
                }`}
              onClick={() => setTaskView("overdue")}
            >
              {taskView === "overdue" && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600"></div>
              )}
              Overdue Tasks
            </button>
          </div>

          <div className="p-6">
            {/* Enhanced Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <label htmlFor="search" className="block text-sm font-medium text-slate-700 mb-2">
                  Search Tasks
                </label>
                <div className="relative">
                  <input
                    id="search"
                    placeholder="Search by task title, ID, or assignee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
              <div className="md:w-56">
                <label htmlFor="staff-filter" className="block text-sm font-medium text-slate-700 mb-2">
                  Filter by Staff
                </label>
                <select
                  id="staff-filter"
                  value={filterStaff}
                  onChange={(e) => setFilterStaff(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value="all">All Staff Members</option>
                  {departmentData.staffMembers.map((staff) => (
                    <option key={staff.id} value={staff.name}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Enhanced Task Table */}
            {getTasksByView(taskView).length === 0 ? (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-6">
                  <ListTodo className="h-10 w-8 text-slate-400" />
                </div>
                <p className="text-slate-600 font-semibold text-lg">No tasks found matching your filters</p>
                <p className="text-slate-500 mt-2">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200" style={{ maxHeight: "600px", overflowY: "auto" }}>
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-8 py-5 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">
                        Task ID
                      </th>
                      <th scope="col" className="px-8 py-5 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">
                        Task Description
                      </th>
                      <th scope="col" className="px-8 py-5 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">
                        Assigned To
                      </th>
                      <th scope="col" className="px-8 py-5 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">
                        Start Date
                      </th>
                      <th scope="col" className="px-8 py-5 text-left text-sm font-bold text-slate-600 uppercase tracking-wider">
                        Frequency
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {getTasksByView(taskView).map((task) => (
                      <tr key={task.id} className="hover:bg-blue-50/40 transition-colors duration-150">
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className="text-base font-semibold text-slate-900">{task.id}</span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-base text-slate-700 font-medium">{task.title}</span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                              {task.assignedTo.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-base text-slate-700 font-medium">{task.assignedTo}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className="text-base text-slate-600">{task.taskStartDate}</span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className={`px-4 py-2 rounded-full text-xs font-bold border shadow-sm ${getFrequencyColor(task.frequency)}`}>
                            {task.frequency.charAt(0).toUpperCase() + task.frequency.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Summary Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-blue-100 rounded-xl shadow-inner">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-slate-700">Active Staff</h3>
            </div>
            <div className="text-4xl font-black text-slate-900 tracking-tight">{departmentData.activeStaff}</div>
            <p className="text-sm text-slate-500 mt-3 font-medium">Total team members</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-lg transition-all duration-300 md:col-span-3">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-emerald-100 rounded-xl shadow-inner">
                <Target className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-700">Task Completion Rate</h3>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-4xl font-black text-slate-900 tracking-tight">{displayStats.rate}%</div>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-sm"></div>
                  <span className="text-slate-600 font-medium">Completed: <span className="font-bold text-slate-900">{displayStats.completed}</span></span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-slate-300 shadow-sm"></div>
                  <span className="text-slate-600 font-medium">Total: <span className="font-bold text-slate-900">{displayStats.total}</span></span>
                </div>
              </div>
            </div>
            <div className="w-full h-4 bg-slate-100 rounded-full mt-6 overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${displayStats.rate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-2 flex gap-2 shadow-sm border border-slate-200">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 py-3 text-center rounded-xl font-semibold text-sm transition-all duration-200 ${activeTab === "overview"
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("mis")}
              className={`flex-1 py-3 text-center rounded-xl font-semibold text-sm transition-all duration-200 ${activeTab === "mis"
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              MIS Report
            </button>
            <button
              onClick={() => setActiveTab("staff")}
              className={`flex-1 py-3 text-center rounded-xl font-semibold text-sm transition-all duration-200 ${activeTab === "staff"
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              Staff Performance
            </button>
          </div>

          {activeTab === "overview" && (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-7">
                <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-slate-900 font-semibold">Tasks Overview</h3>
                        <p className="text-slate-600 text-sm">Monthly completion trends</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 pl-2">
                    <TasksOverviewChart />
                  </div>
                </div>
                <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-slate-900 font-semibold">Task Status</h3>
                        <p className="text-slate-600 text-sm">Distribution breakdown</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <TasksCompletionChart />
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-slate-900 font-semibold">Staff Task Summary</h3>
                      <p className="text-slate-600 text-sm">Individual performance overview</p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <StaffTasksTable />
                </div>
              </div>
            </div>
          )}

          {activeTab === "mis" && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-semibold">MIS Report</h3>
                    <p className="text-slate-600 text-sm">Detailed analytics and performance metrics</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-8">
                  {/* Date range selection */}
                  <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-5 border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-4">Date Range Filter</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 mb-2">
                          Start Date
                        </label>
                        <input
                          id="start-date"
                          type="date"
                          value={dateRange.startDate}
                          onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                      <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 mb-2">
                          End Date
                        </label>
                        <input
                          id="end-date"
                          type="date"
                          value={dateRange.endDate}
                          onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={filterTasksByDateRange}
                          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2.5 px-6 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          Apply Filter
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Overall stats */}
                  <div className="grid gap-5 md:grid-cols-3">
                    <div className="rounded-xl bg-white border border-blue-200 p-5 shadow-sm">
                      <div className="text-sm font-medium text-blue-700 mb-2">Total Tasks Assigned</div>
                      <div className="text-3xl font-bold text-blue-900">
                        {dateRange.filtered ? filteredDateStats.totalTasks : displayStats.total}
                      </div>
                      {dateRange.filtered && (
                        <p className="text-xs text-slate-600 mt-2">
                          {formatLocalDate(dateRange.startDate)} - {formatLocalDate(dateRange.endDate)}
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl bg-white border border-emerald-200 p-5 shadow-sm">
                      <div className="text-sm font-medium text-emerald-700 mb-2">Tasks Completed</div>
                      <div className="text-3xl font-bold text-emerald-900">
                        {dateRange.filtered ? filteredDateStats.completedTasks : displayStats.completed}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white border border-amber-200 p-5 shadow-sm">
                      <div className="text-sm font-medium text-amber-700 mb-2">Pending / Overdue</div>
                      <div className="text-3xl font-bold text-amber-900">
                        {dateRange.filtered ?
                          `${filteredDateStats.pendingTasks} / ${filteredDateStats.overdueTasks}` :
                          `${displayStats.pending} / ${displayStats.overdue}`}
                      </div>
                      <div className="text-xs text-slate-600 mt-2">All incomplete / Past dates</div>
                    </div>
                  </div>

                  {/* Additional breakdown */}
                  {dateRange.filtered && (
                    <div className="rounded-xl border border-blue-200 p-6 bg-gradient-to-br from-blue-50 to-white">
                      <h4 className="text-lg font-semibold text-blue-900 mb-5">Detailed Date Range Breakdown</h4>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="bg-white p-4 rounded-lg border border-amber-200 shadow-sm">
                          <div className="text-sm font-medium text-amber-700 mb-1">Pending Tasks</div>
                          <div className="text-2xl font-bold text-amber-600">{filteredDateStats.pendingTasks}</div>
                          <div className="text-xs text-amber-600 mt-2">All incomplete tasks</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-rose-200 shadow-sm">
                          <div className="text-sm font-medium text-rose-700 mb-1">Overdue Tasks</div>
                          <div className="text-2xl font-bold text-rose-600">{filteredDateStats.overdueTasks}</div>
                          <div className="text-xs text-rose-600 mt-2">Past due dates only</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-emerald-200 shadow-sm">
                          <div className="text-sm font-medium text-emerald-700 mb-1">Completion Rate</div>
                          <div className="text-2xl font-bold text-emerald-600">{filteredDateStats.completionRate}%</div>
                          <div className="text-xs text-emerald-600 mt-2">
                            {filteredDateStats.completedTasks} of {filteredDateStats.totalTasks} completed
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl bg-white border border-blue-200 p-6 shadow-sm">
                    <h4 className="text-sm font-semibold text-blue-900 mb-4">Completion Rate Progress</h4>
                    <div className="flex items-center gap-6">
                      <div className="text-3xl font-bold text-blue-900">
                        {dateRange.filtered ? filteredDateStats.completionRate : displayStats.rate}%
                      </div>
                      <div className="flex-1">
                        <div className="w-full h-8 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full flex items-center justify-end px-4 text-sm font-semibold text-white shadow-sm transition-all duration-500"
                            style={{
                              width: `${dateRange.filtered ? filteredDateStats.completionRate : displayStats.rate}%`,
                              background: `linear-gradient(to right, #10b981 ${(dateRange.filtered ? filteredDateStats.completionRate : displayStats.rate) * 0.8}%, #f59e0b ${(dateRange.filtered ? filteredDateStats.completionRate : displayStats.rate) * 0.8}%)`
                            }}
                          >
                            {dateRange.filtered ? filteredDateStats.completionRate : displayStats.rate}%
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mt-3">
                      {dashboardType === "delegation" ?
                        `${dateRange.filtered ? filteredDateStats.completedTasks : displayStats.completed} of ${dateRange.filtered ? filteredDateStats.totalTasks : displayStats.total} tasks completed in delegation mode` :
                        selectedMasterOption !== "Select Department" ?
                          `${dateRange.filtered ? filteredDateStats.completedTasks : displayStats.completed} of ${dateRange.filtered ? filteredDateStats.totalTasks : displayStats.total} tasks completed in ${selectedMasterOption}` :
                          "Select a department to see completion rate"
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "staff" && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-semibold">Staff Performance</h3>
                    <p className="text-slate-600 text-sm">Task completion rates by team member</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {departmentData.staffMembers.length > 0 ? (
                    <>
                      {(() => {
                        const sortedStaffMembers = [...departmentData.staffMembers]
                          .filter(staff => staff.totalTasks > 0)
                          .sort((a, b) => b.progress - a.progress);

                        return (
                          <>
                            {/* High performers */}
                            <div className="rounded-xl border border-emerald-200 overflow-hidden">
                              <div className="p-5 bg-gradient-to-r from-emerald-50 to-emerald-100 border-b border-emerald-200">
                                <h3 className="text-lg font-semibold text-emerald-900">Top Performers</h3>
                                <p className="text-sm text-emerald-700">70% or higher completion rate</p>
                              </div>
                              <div className="p-5">
                                <div className="space-y-3">
                                  {sortedStaffMembers
                                    .filter(staff => staff.progress >= 70)
                                    .map((staff) => (
                                      <div
                                        key={staff.id}
                                        className="flex items-center justify-between p-4 border border-emerald-100 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
                                            <span className="text-sm font-semibold text-white">{staff.name.charAt(0)}</span>
                                          </div>
                                          <div>
                                            <p className="font-semibold text-emerald-900">{staff.name}</p>
                                            <p className="text-xs text-emerald-700">{staff.completedTasks} of {staff.totalTasks} tasks completed</p>
                                          </div>
                                        </div>
                                        <div className="text-xl font-bold text-emerald-700">{staff.progress}%</div>
                                      </div>
                                    ))
                                  }
                                  {sortedStaffMembers.filter(staff => staff.progress >= 70).length === 0 && (
                                    <div className="text-center py-8 text-slate-500">
                                      <p>No staff members with high completion rates found</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Mid performers */}
                            <div className="rounded-xl border border-amber-200 overflow-hidden">
                              <div className="p-5 bg-gradient-to-r from-amber-50 to-amber-100 border-b border-amber-200">
                                <h3 className="text-lg font-semibold text-amber-900">Average Performers</h3>
                                <p className="text-sm text-amber-700">40-69% completion rate</p>
                              </div>
                              <div className="p-5">
                                <div className="space-y-3">
                                  {sortedStaffMembers
                                    .filter(staff => staff.progress >= 40 && staff.progress < 70)
                                    .map((staff) => (
                                      <div
                                        key={staff.id}
                                        className="flex items-center justify-between p-4 border border-amber-100 rounded-xl bg-amber-50/50 hover:bg-amber-50 transition-colors"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-sm">
                                            <span className="text-sm font-semibold text-white">{staff.name.charAt(0)}</span>
                                          </div>
                                          <div>
                                            <p className="font-semibold text-amber-900">{staff.name}</p>
                                            <p className="text-xs text-amber-700">{staff.completedTasks} of {staff.totalTasks} tasks completed</p>
                                          </div>
                                        </div>
                                        <div className="text-xl font-bold text-amber-700">{staff.progress}%</div>
                                      </div>
                                    ))
                                  }
                                  {sortedStaffMembers.filter(staff => staff.progress >= 40 && staff.progress < 70).length === 0 && (
                                    <div className="text-center py-8 text-slate-500">
                                      <p>No staff members with moderate completion rates found</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Low performers */}
                            <div className="rounded-xl border border-rose-200 overflow-hidden">
                              <div className="p-5 bg-gradient-to-r from-rose-50 to-rose-100 border-b border-rose-200">
                                <h3 className="text-lg font-semibold text-rose-900">Needs Improvement</h3>
                                <p className="text-sm text-rose-700">Below 40% completion rate</p>
                              </div>
                              <div className="p-5">
                                <div className="space-y-3">
                                  {sortedStaffMembers
                                    .filter(staff => staff.progress < 40)
                                    .map((staff) => (
                                      <div
                                        key={staff.id}
                                        className="flex items-center justify-between p-4 border border-rose-100 rounded-xl bg-rose-50/50 hover:bg-rose-50 transition-colors"
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-rose-500 flex items-center justify-center shadow-sm">
                                            <span className="text-sm font-semibold text-white">{staff.name.charAt(0)}</span>
                                          </div>
                                          <div>
                                            <p className="font-semibold text-rose-900">{staff.name}</p>
                                            <p className="text-xs text-rose-700">{staff.completedTasks} of {staff.totalTasks} tasks completed</p>
                                          </div>
                                        </div>
                                        <div className="text-xl font-bold text-rose-700">{staff.progress}%</div>
                                      </div>
                                    ))
                                  }
                                  {sortedStaffMembers.filter(staff => staff.progress < 40).length === 0 && (
                                    <div className="text-center py-8 text-slate-500">
                                      <p>No staff members with low completion rates found</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* No tasks assigned */}
                            {departmentData.staffMembers.filter(staff => staff.totalTasks === 0).length > 0 && (
                              <div className="rounded-xl border border-slate-200 overflow-hidden">
                                <div className="p-5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                                  <h3 className="text-lg font-semibold text-slate-900">No Tasks Assigned</h3>
                                  <p className="text-sm text-slate-600">Staff with no current tasks</p>
                                </div>
                                <div className="p-5">
                                  <div className="space-y-3">
                                    {departmentData.staffMembers
                                      .filter(staff => staff.totalTasks === 0)
                                      .map((staff) => (
                                        <div
                                          key={staff.id}
                                          className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-sm">
                                              <span className="text-sm font-semibold text-white">{staff.name.charAt(0)}</span>
                                            </div>
                                            <div>
                                              <p className="font-semibold text-slate-900">{staff.name}</p>
                                              <p className="text-xs text-slate-600">No tasks assigned</p>
                                            </div>
                                          </div>
                                          <div className="text-xl font-bold text-slate-500">N/A</div>
                                        </div>
                                      ))
                                    }
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                        <Users className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-600 font-medium">
                        {dashboardType === "delegation"
                          ? "No delegation data available"
                          : "No staff data available. Please select a department from the dropdown"
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}