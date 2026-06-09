import { useState, useEffect } from "react";
import { BellRing, FileCheck, Calendar, Clock, Users, FileText, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { sendTaskAssignedNotification } from "../../utils/telegram";

// Enhanced Calendar Component
const CalendarComponent = ({ date, onChange, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateClick = (day) => {
    const selectedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    onChange(selectedDate);
    onClose();
  };

  const renderDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth()
    );
    const firstDayOfMonth = getFirstDayOfMonth(
      currentMonth.getFullYear(),
      currentMonth.getMonth()
    );

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-9 w-9"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        date &&
        date.getDate() === day &&
        date.getMonth() === currentMonth.getMonth() &&
        date.getFullYear() === currentMonth.getFullYear();

      const isToday =
        new Date().getDate() === day &&
        new Date().getMonth() === currentMonth.getMonth() &&
        new Date().getFullYear() === currentMonth.getFullYear();

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateClick(day)}
          className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all duration-200 ${isSelected
            ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md scale-105"
            : isToday
              ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
              : "hover:bg-blue-50 text-slate-700 hover:text-blue-600"
            }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-slate-600 hover:text-blue-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-sm font-semibold text-slate-800">
          {currentMonth.toLocaleString("default", { month: "long" })}{" "}
          {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-slate-600 hover:text-blue-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div
            key={day}
            className="h-9 w-9 flex items-center justify-center text-xs font-semibold text-slate-500"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
    </div>
  );
};

// Helper functions for date manipulation
const formatDate = (date) => {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const addDays = (date, days) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

const addMonths = (date, months) => {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
};

const addYears = (date, years) => {
  const newDate = new Date(date);
  newDate.setFullYear(newDate.getFullYear() + years);
  return newDate;
};

export default function AssignTask() {
  const [date, setSelectedDate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(false);

  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [givenByOptions, setGivenByOptions] = useState([]);
  const [doerOptions, setDoerOptions] = useState([]);

  const frequencies = [
    // { value: "one-time", label: "One Time (No Recurrence)" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "fortnightly", label: "Fortnightly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
    { value: "end-of-1st-week", label: "End of 1st Week" },
    { value: "end-of-2nd-week", label: "End of 2nd Week" },
    { value: "end-of-3rd-week", label: "End of 3rd Week" },
    { value: "end-of-4th-week", label: "End of 4th Week" },
    { value: "end-of-last-week", label: "End of Last Week" },
  ];

  const [formData, setFormData] = useState({
    taskType: "checklist",
    department: "",
    givenBy: "",
    doer: "",
    description: "",
    frequency: "daily",
    enableReminders: true,
    requireAttachment: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name, e) => {
    setFormData((prev) => ({ ...prev, [name]: e.target.checked }));
  };

  const fetchMasterSheetOptions = async () => {
    try {
      const masterSheetId = "1sn8_JWWODv3JM097Q1oIpVt0EhxRxEBi4sy7onV95tc";
      const masterSheetName = "master";

      const url = `https://docs.google.com/spreadsheets/d/${masterSheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        masterSheetName
      )}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch master data: ${response.status}`);
      }

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);

      if (!data.table || !data.table.rows) {
        console.log("No master data found");
        return;
      }

      const departments = [];
      const givenBy = [];
      const doers = [];

      data.table.rows.slice(1).forEach((row) => {
        if (row.c && row.c[0] && row.c[0].v) {
          const value = row.c[0].v.toString().trim();
          if (value !== "") departments.push(value);
        }
        if (row.c && row.c[1] && row.c[1].v) {
          const value = row.c[1].v.toString().trim();
          if (value !== "") givenBy.push(value);
        }
        if (row.c && row.c[2] && row.c[2].v) {
          const value = row.c[2].v.toString().trim();
          if (value !== "") doers.push(value);
        }
      });

      if (!departments.includes("REFRATECH")) departments.push("REFRATECH");
      setDepartmentOptions([...new Set(departments)].sort());
      setGivenByOptions([...new Set(givenBy)].sort());
      setDoerOptions([...new Set(doers)].sort());

      console.log("Master sheet options loaded successfully");
    } catch (error) {
      console.error("Error fetching master sheet options:", error);
      setDepartmentOptions(["Department 1", "Department 2"]);
      setGivenByOptions(["User 1", "User 2"]);
      setDoerOptions(["Doer 1", "Doer 2"]);
    }
  };

  const getFormattedDate = (date) => {
    if (!date) return "Select a date";
    return formatDate(date);
  };

  useEffect(() => {
    fetchMasterSheetOptions();
  }, []);

  const getLastTaskId = async (sheetName) => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/1sn8_JWWODv3JM097Q1oIpVt0EhxRxEBi4sy7onV95tc/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName
      )}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch sheet data: ${response.status}`);
      }

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);

      if (!data.table || !data.table.rows || data.table.rows.length === 0) {
        return 0;
      }

      let lastTaskId = 0;
      data.table.rows.forEach((row) => {
        if (row.c && row.c[1] && row.c[1].v) {
          const taskId = parseInt(row.c[1].v);
          if (!isNaN(taskId) && taskId > lastTaskId) {
            lastTaskId = taskId;
          }
        }
      });

      return lastTaskId;
    } catch (error) {
      console.error("Error fetching last task ID:", error);
      return 0;
    }
  };

  const formatDateToDDMMYYYY = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const fetchWorkingDays = async () => {
    try {
      const sheetId = "1sn8_JWWODv3JM097Q1oIpVt0EhxRxEBi4sy7onV95tc";
      const sheetName = "Working Day Calendar";

      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName
      )}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch working days: ${response.status}`);
      }

      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);

      if (!data.table || !data.table.rows) {
        console.log("No working day data found");
        return [];
      }

      const workingDays = [];
      data.table.rows.forEach((row) => {
        if (row.c && row.c[0] && row.c[0].v) {
          let dateValue = row.c[0].v;

          if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
            const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateValue);
            if (match) {
              const year = parseInt(match[1], 10);
              const month = parseInt(match[2], 10);
              const dateDay = parseInt(match[3], 10);

              dateValue = `${dateDay.toString().padStart(2, "0")}/${(month + 1)
                .toString()
                .padStart(2, "0")}/${year}`;
            }
          } else if (dateValue instanceof Date) {
            dateValue = formatDateToDDMMYYYY(dateValue);
          }

          if (
            typeof dateValue === "string" &&
            dateValue.match(/^\d{2}\/\d{2}\/\d{4}$/)
          ) {
            workingDays.push(dateValue);
          }
        }
      });

      console.log(`Fetched ${workingDays.length} working days`);
      return workingDays;
    } catch (error) {
      console.error("Error fetching working days:", error);
      return [];
    }
  };

  const findClosestWorkingDayIndex = (workingDays, targetDateStr) => {
    const [targetDay, targetMonth, targetYear] = targetDateStr.split('/').map(Number);
    const targetDate = new Date(targetYear, targetMonth - 1, targetDay);

    let closestIndex = -1;
    let minDifference = Infinity;

    for (let i = 0; i < workingDays.length; i++) {
      const [workingDay, workingMonth, workingYear] = workingDays[i].split('/').map(Number);
      const currentDate = new Date(workingYear, workingMonth - 1, workingDay);

      const difference = Math.abs((currentDate - targetDate) / (1000 * 60 * 60 * 24));

      if (currentDate >= targetDate && difference < minDifference) {
        minDifference = difference;
        closestIndex = i;
      }
    }

    return closestIndex;
  };

  const generateTasks = async () => {
    if (!date || !formData.doer || !formData.description || !formData.frequency) {
      alert("Please fill in all required fields.");
      return;
    }

    const workingDays = await fetchWorkingDays();
    if (workingDays.length === 0) {
      alert("Could not retrieve working days. Please make sure the Working Day Calendar sheet is properly set up.");
      return;
    }

    const sortedWorkingDays = [...workingDays].sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/').map(Number);
      const [dayB, monthB, yearB] = b.split('/').map(Number);
      return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
    });

    const selectedDate = new Date(date);

    const futureDates = sortedWorkingDays.filter(dateStr => {
      const [dateDay, month, year] = dateStr.split('/').map(Number);
      const dateObj = new Date(year, month - 1, dateDay);
      return dateObj >= selectedDate;
    });

    if (futureDates.length === 0) {
      alert("No working days found on or after your selected date. Please choose a different start date or update the Working Day Calendar.");
      return;
    }

    const startDateStr = formatDateToDDMMYYYY(selectedDate);
    let startIndex = futureDates.findIndex(d => d === startDateStr);

    if (startIndex === -1) {
      startIndex = 0;
      alert(`The selected date (${startDateStr}) is not in the Working Day Calendar. The next available working day will be used instead: ${futureDates[0]}`);
    }

    const tasks = [];

    if (formData.frequency === "one-time") {
      const taskDateStr = futureDates[startIndex];

      tasks.push({
        description: formData.description,
        department: formData.department,
        givenBy: formData.givenBy,
        doer: formData.doer,
        dueDate: taskDateStr,
        status: "pending",
        frequency: formData.frequency,
        enableReminders: formData.enableReminders,
        requireAttachment: formData.requireAttachment,
      });
    } else {
      let currentIndex = startIndex;

      while (currentIndex < futureDates.length) {
        const taskDateStr = futureDates[currentIndex];

        tasks.push({
          description: formData.description,
          department: formData.department,
          givenBy: formData.givenBy,
          doer: formData.doer,
          dueDate: taskDateStr,
          status: "pending",
          frequency: formData.frequency,
          enableReminders: formData.enableReminders,
          requireAttachment: formData.requireAttachment,
        });

        switch (formData.frequency) {
          case "daily": {
            currentIndex += 1;
            break;
          }
          case "weekly": {
            const [taskDay, taskMonth, taskYear] = taskDateStr.split('/').map(Number);
            const currentDate = new Date(taskYear, taskMonth - 1, taskDay);
            const targetDate = addDays(currentDate, 7);
            const targetDateStr = formatDateToDDMMYYYY(targetDate);

            const nextIndex = findClosestWorkingDayIndex(futureDates, targetDateStr);
            if (nextIndex !== -1 && nextIndex > currentIndex) {
              currentIndex = nextIndex;
            } else {
              currentIndex = futureDates.length;
            }
            break;
          }
          case "fortnightly": {
            const [taskDay2, taskMonth2, taskYear2] = taskDateStr.split('/').map(Number);
            const currentDate2 = new Date(taskYear2, taskMonth2 - 1, taskDay2);
            const targetDate2 = addDays(currentDate2, 14);
            const targetDateStr2 = formatDateToDDMMYYYY(targetDate2);

            const nextIndex2 = findClosestWorkingDayIndex(futureDates, targetDateStr2);
            if (nextIndex2 !== -1 && nextIndex2 > currentIndex) {
              currentIndex = nextIndex2;
            } else {
              currentIndex = futureDates.length;
            }
            break;
          }
          case "monthly": {
            const [taskDay3, taskMonth3, taskYear3] = taskDateStr.split('/').map(Number);
            const currentDate3 = new Date(taskYear3, taskMonth3 - 1, taskDay3);
            const targetDate3 = addMonths(currentDate3, 1);
            const targetDateStr3 = formatDateToDDMMYYYY(targetDate3);

            const nextIndex3 = findClosestWorkingDayIndex(futureDates, targetDateStr3);
            if (nextIndex3 !== -1 && nextIndex3 > currentIndex) {
              currentIndex = nextIndex3;
            } else {
              currentIndex = futureDates.length;
            }
            break;
          }
          case "quarterly": {
            const [taskDay4, taskMonth4, taskYear4] = taskDateStr.split('/').map(Number);
            const currentDate4 = new Date(taskYear4, taskMonth4 - 1, taskDay4);
            const targetDate4 = addMonths(currentDate4, 3);
            const targetDateStr4 = formatDateToDDMMYYYY(targetDate4);

            const nextIndex4 = findClosestWorkingDayIndex(futureDates, targetDateStr4);
            if (nextIndex4 !== -1 && nextIndex4 > currentIndex) {
              currentIndex = nextIndex4;
            } else {
              currentIndex = futureDates.length;
            }
            break;
          }
          case "yearly": {
            const [taskDay5, taskMonth5, taskYear5] = taskDateStr.split('/').map(Number);
            const currentDate5 = new Date(taskYear5, taskMonth5 - 1, taskDay5);
            const targetDate5 = addYears(currentDate5, 1);
            const targetDateStr5 = formatDateToDDMMYYYY(targetDate5);

            const nextIndex5 = findClosestWorkingDayIndex(futureDates, targetDateStr5);
            if (nextIndex5 !== -1 && nextIndex5 > currentIndex) {
              currentIndex = nextIndex5;
            } else {
              currentIndex = futureDates.length;
            }
            break;
          }
          case "end-of-1st-week":
          case "end-of-2nd-week":
          case "end-of-3rd-week":
          case "end-of-4th-week":
          case "end-of-last-week": {
            const [taskDay6, taskMonth6, taskYear6] = taskDateStr.split('/').map(Number);
            const currentDate6 = new Date(taskYear6, taskMonth6 - 1, taskDay6);
            const targetDate6 = addMonths(currentDate6, 1);

            let weekNumber;
            switch (formData.frequency) {
              case "end-of-1st-week": weekNumber = 1; break;
              case "end-of-2nd-week": weekNumber = 2; break;
              case "end-of-3rd-week": weekNumber = 3; break;
              case "end-of-4th-week": weekNumber = 4; break;
              case "end-of-last-week": weekNumber = -1; break;
            }

            const targetDateStr6 = findEndOfWeekDate(targetDate6, weekNumber, futureDates);
            const nextIndex6 = futureDates.indexOf(targetDateStr6);
            currentIndex = nextIndex6 > currentIndex ? nextIndex6 : futureDates.length;
            break;
          }
          default: {
            currentIndex = futureDates.length;
          }
        }
      }
    }

    setGeneratedTasks(tasks);
    setAccordionOpen(true);
  };

  const findEndOfWeekDate = (date, weekNumber, workingDays) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const daysInMonth = workingDays.filter(dateStr => {
      const [, m, y] = dateStr.split('/').map(Number);
      return y === year && m === month + 1;
    });

    daysInMonth.sort((a, b) => {
      const [dayA] = a.split('/').map(Number);
      const [dayB] = b.split('/').map(Number);
      return dayA - dayB;
    });

    const weekGroups = [];
    let currentWeek = [];
    let lastWeekDay = -1;

    for (const dateStr of daysInMonth) {
      const [workingDay2, m, y] = dateStr.split('/').map(Number);
      const dateObj = new Date(y, m - 1, workingDay2);
      const weekDay = dateObj.getDay();

      if (weekDay <= lastWeekDay || currentWeek.length === 0) {
        if (currentWeek.length > 0) {
          weekGroups.push(currentWeek);
        }
        currentWeek = [dateStr];
      } else {
        currentWeek.push(dateStr);
      }

      lastWeekDay = weekDay;
    }

    if (currentWeek.length > 0) {
      weekGroups.push(currentWeek);
    }

    if (weekNumber === -1) {
      return weekGroups[weekGroups.length - 1]?.[weekGroups[weekGroups.length - 1].length - 1] || daysInMonth[daysInMonth.length - 1];
    } else if (weekNumber > 0 && weekNumber <= weekGroups.length) {
      return weekGroups[weekNumber - 1]?.[weekGroups[weekNumber - 1].length - 1] || daysInMonth[daysInMonth.length - 1];
    } else {
      return daysInMonth[daysInMonth.length - 1];
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (generatedTasks.length === 0) {
        alert("Please generate tasks first by clicking Preview Generated Tasks");
        setIsSubmitting(false);
        return;
      }

      const submitSheetName = formData.taskType === "delegation" ? "DELEGATION" : formData.department;

      const lastTaskId = await getLastTaskId(submitSheetName);
      let nextTaskId = lastTaskId + 1;

      const tasksData = generatedTasks.map((task, index) => ({
        timestamp: formatDateToDDMMYYYY(new Date()),
        taskId: (nextTaskId + index).toString(),
        firm: task.department,
        givenBy: task.givenBy,
        name: task.doer,
        description: task.description,
        startDate: task.dueDate,
        freq: task.frequency,
        enableReminders: task.enableReminders ? "Yes" : "No",
        requireAttachment: task.requireAttachment ? "Yes" : "No"
      }));

      console.log(`Submitting ${tasksData.length} tasks in batch to ${submitSheetName} sheet:`, tasksData);

      const formPayload = new FormData();
      formPayload.append("sheetName", submitSheetName);
      formPayload.append("action", "insert");
      formPayload.append("batchInsert", "true");
      formPayload.append("rowData", JSON.stringify(tasksData));

      await fetch(
        "https://script.google.com/macros/s/AKfycbzxy5T34g3xcteQg6CT5sLNSCYsU8gXqxGBN3vnz2gWI5MxO8pb_fuw_k_FT5kx06hG/exec",
        {
          method: "POST",
          body: formPayload,
          mode: "no-cors",
        }
      );

      alert(`Successfully submitted ${generatedTasks.length} tasks to ${submitSheetName} sheet in one batch!`);

      sendTaskAssignedNotification({
        doer: formData.doer,
        description: formData.description,
        department: formData.taskType === "delegation" ? "DELEGATION" : formData.department,
        givenBy: formData.givenBy,
        frequency: formData.frequency,
        startDate: generatedTasks[0]?.dueDate || formatDateToDDMMYYYY(selectedDate),
        totalTasks: generatedTasks.length,
        requireAttachment: formData.requireAttachment,
        enableReminders: formData.enableReminders,
      });

      setFormData({
        taskType: "checklist",
        department: "",
        givenBy: "",
        doer: "",
        description: "",
        frequency: "daily",
        enableReminders: true,
        requireAttachment: false
      });
      setSelectedDate(null);
      setGeneratedTasks([]);
      setAccordionOpen(false);
    } catch (error) {
      console.error("Submission error:", error);
      alert("Failed to assign tasks. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto pb-8">
        {/* Enhanced Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                Assign New Task
              </h1>
              <p className="text-base font-medium text-slate-600 mt-1">Create and schedule tasks for your team members</p>
            </div>
          </div>
        </div>

        {/* Enhanced Form Card */}
        <div className="rounded-2xl border border-slate-200 shadow-lg bg-white overflow-hidden">
          <form onSubmit={handleSubmit}>
            {/* Form Header */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Task Details</h2>
                  <p className="text-sm text-slate-600">Fill in the information below to create your task</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Task Type Selection */}
              <div className="space-y-3 p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-blue-500 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <label className="text-sm font-semibold text-blue-900 uppercase tracking-wide">
                    Assignment Mode
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, taskType: "checklist" }))}
                    className={`group relative flex flex-col items-center justify-center py-4 px-4 rounded-xl border-2 transition-all duration-200 ${formData.taskType === "checklist"
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-600 shadow-lg scale-[1.02]"
                      : "bg-white text-blue-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md"
                      }`}
                  >
                    <Clock className={`h-6 w-6 mb-2 ${formData.taskType === "checklist" ? "text-white" : "text-blue-600"}`} />
                    <span className="font-bold text-base">Checklist</span>
                    <span className="text-xs opacity-90 mt-1">Recurring tasks</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, taskType: "delegation", frequency: "one-time" }))}
                    className={`group relative flex flex-col items-center justify-center py-4 px-4 rounded-xl border-2 transition-all duration-200 ${formData.taskType === "delegation"
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-600 shadow-lg scale-[1.02]"
                      : "bg-white text-blue-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md"
                      }`}
                  >
                    <AlertCircle className={`h-6 w-6 mb-2 ${formData.taskType === "delegation" ? "text-white" : "text-blue-600"}`} />
                    <span className="font-bold text-base">Delegation</span>
                    <span className="text-xs opacity-90 mt-1">One-time priority</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Department Name */}
                <div className="space-y-2">
                  <label htmlFor="department" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Users className="h-4 w-4 text-blue-600" />
                    Firm Name
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="">Select Department</option>
                    {departmentOptions.map((dept, index) => (
                      <option key={index} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Given By */}
                <div className="space-y-2">
                  <label htmlFor="givenBy" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Users className="h-4 w-4 text-blue-600" />
                    Given By
                  </label>
                  <select
                    id="givenBy"
                    name="givenBy"
                    value={formData.givenBy}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="">Select Given By</option>
                    {givenByOptions.map((person, index) => (
                      <option key={index} value={person}>
                        {person}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Doer's Name */}
                <div className="space-y-2">
                  <label htmlFor="doer" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Users className="h-4 w-4 text-blue-600" />
                    Doer's Name
                  </label>
                  <select
                    id="doer"
                    name="doer"
                    value={formData.doer}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  >
                    <option value="">Select Doer</option>
                    {doerOptions.map((doer, index) => (
                      <option key={index} value={doer}>
                        {doer}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Planned Date
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCalendar(!showCalendar)}
                      className="w-full flex items-center justify-between rounded-lg border border-slate-300 px-4 py-3 text-sm bg-white hover:border-blue-400 transition-all shadow-sm"
                    >
                      <span className={date ? "text-slate-900 font-medium" : "text-slate-500"}>
                        {date ? getFormattedDate(date) : "Select a date"}
                      </span>
                      <Calendar className="h-4 w-4 text-slate-400" />
                    </button>
                    {showCalendar && (
                      <div className="absolute z-20 mt-2 left-0 top-full">
                        <CalendarComponent
                          date={date}
                          onChange={setSelectedDate}
                          onClose={() => setShowCalendar(false)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Frequency - Only if checklist */}
                {formData.taskType === "checklist" && (
                  <div className="space-y-2">
                    <label htmlFor="frequency" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Clock className="h-4 w-4 text-blue-600" />
                      Frequency
                    </label>
                    <select
                      id="frequency"
                      name="frequency"
                      value={formData.frequency}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      {frequencies.map((freq) => (
                        <option key={freq.value} value={freq.value}>
                          {freq.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Task Description - Full Width */}
                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="description" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Task Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-sm focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none shadow-inner"
                    placeholder="Describe the task in detail..."
                  />
                </div>
              </div>

              {/* Additional Options */}
              {formData.taskType === "checklist" && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    Additional Options
                  </h3>

                  <div className="space-y-3">
                    {/* Enable Reminders */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg">
                          <BellRing className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <label htmlFor="enable-reminders" className="text-sm font-semibold text-slate-900 cursor-pointer">
                            Enable Reminders
                          </label>
                          <p className="text-xs text-slate-600 mt-0.5">Send notifications before due date</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id="enable-reminders"
                          checked={formData.enableReminders}
                          onChange={(e) => handleSwitchChange("enableReminders", e)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                      </label>
                    </div>

                    {/* Require Attachment */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 rounded-lg">
                          <FileCheck className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <label htmlFor="require-attachment" className="text-sm font-semibold text-slate-900 cursor-pointer">
                            Require Attachment
                          </label>
                          <p className="text-xs text-slate-600 mt-0.5">Must upload file when completing</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id="require-attachment"
                          checked={formData.requireAttachment}
                          onChange={(e) => handleSwitchChange("requireAttachment", e)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600 shadow-inner"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={generateTasks}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-100 to-slate-200 border border-slate-300 py-3.5 px-4 text-slate-700 font-semibold hover:from-blue-50 hover:to-blue-100 hover:border-blue-300 hover:text-blue-700 transition-all shadow-sm hover:shadow-md"
                >
                  <Sparkles className="h-5 w-5" />
                  Preview Generated Tasks
                </button>
              </div>

              {/* Generated Tasks Accordion */}
              {generatedTasks.length > 0 && (
                <div className="rounded-xl border-2 border-blue-200 overflow-hidden shadow-sm">
                  <button
                    type="button"
                    onClick={() => setAccordionOpen(!accordionOpen)}
                    className="w-full flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
                      <span className="font-semibold text-blue-900">
                        {generatedTasks.length} Tasks Generated
                      </span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-blue-700 transition-transform duration-200 ${accordionOpen ? "rotate-180" : ""
                        }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {accordionOpen && (
                    <div className="p-4 bg-white border-t-2 border-blue-200">
                      <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                        {generatedTasks.slice(0, 20).map((task, index) => (
                          <div
                            key={index}
                            className="p-4 border border-blue-200 rounded-xl bg-gradient-to-r from-blue-50/50 to-white hover:shadow-md transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="font-medium text-slate-900 mb-1">
                                  {task.description}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <Calendar className="h-3 w-3" />
                                  <span>Due: {task.dueDate}</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {task.enableReminders && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-medium border border-blue-200">
                                    <BellRing className="h-3 w-3" />
                                    Reminders
                                  </span>
                                )}
                                {task.requireAttachment && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-medium border border-amber-200">
                                    <FileCheck className="h-3 w-3" />
                                    Attachment
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {generatedTasks.length > 20 && (
                          <div className="text-sm text-center text-slate-600 py-3 border-t border-slate-200">
                            ...and {generatedTasks.length - 20} more tasks
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Enhanced Form Footer */}
            <div className="flex justify-between items-center gap-4 bg-gradient-to-r from-slate-50 to-slate-100 p-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    taskType: "checklist",
                    department: "",
                    givenBy: "",
                    doer: "",
                    description: "",
                    frequency: "daily",
                    enableReminders: true,
                    requireAttachment: false,
                  });
                  setSelectedDate(null);
                  setGeneratedTasks([]);
                  setAccordionOpen(false);
                }}
                className="rounded-lg border border-slate-300 py-2.5 px-6 text-slate-600 font-medium hover:bg-white hover:border-slate-400 hover:text-slate-900 transition-all shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 py-2.5 px-6 text-white font-semibold hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Assigning...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Assign Task
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}