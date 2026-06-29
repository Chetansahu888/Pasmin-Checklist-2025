//Re-verification Tasks
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, Search, History, ArrowLeft, Sparkles, FileText, Calendar, Filter, ChevronRight, AlertCircle } from "lucide-react"
import AdminLayout from "../components/layout/AdminLayout"

// Configuration object
const CONFIG = {
  // Google Apps Script URL
  APPS_SCRIPT_URL:
    "https://script.google.com/macros/s/AKfycbzxy5T34g3xcteQg6CT5sLNSCYsU8gXqxGBN3vnz2gWI5MxO8pb_fuw_k_FT5kx06hG/exec",

  // Sheet name to work with
  SHEET_NAME: "DELEGATION",

  // Page configuration
  PAGE_CONFIG: {
    title: "Verification Tasks",
    historyTitle: "Verification History",
    description: "Tasks requiring Verification with planned dates",
    historyDescription: "Completed Verification tasks with submission history",
  },
}

function ReverificationPage() {
  const [taskData, setTaskData] = useState([])
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [remarksData, setRemarksData] = useState({})
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [historyData, setHistoryData] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [username, setUsername] = useState("")
  const [filterGivenBy, setFilterGivenBy] = useState("")
  const [filterName, setFilterName] = useState("")

  const formatDateToDDMMYYYY = (date) => {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const isEmpty = (value) => {
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "")
  }

  useEffect(() => {
    const role = sessionStorage.getItem("role")
    const user = sessionStorage.getItem("username")
    setUserRole(role || "")
    setUsername(user || "")
  }, [])

  const parseGoogleSheetsDate = (dateStr) => {
    if (!dateStr) return ""

    if (typeof dateStr === "string" && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateStr
    }

    if (typeof dateStr === "string" && dateStr.startsWith("Date(")) {
      const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateStr)
      if (match) {
        const year = Number.parseInt(match[1], 10)
        const month = Number.parseInt(match[2], 10)
        const day = Number.parseInt(match[3], 10)
        return `${day.toString().padStart(2, "0")}/${(month + 1).toString().padStart(2, "0")}/${year}`
      }
    }

    try {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return formatDateToDDMMYYYY(date)
      }
    } catch (error) {
      console.error("Error parsing date:", error)
    }

    return dateStr
  }

  const parseDateFromDDMMYYYY = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null
    const parts = dateStr.split("/")
    if (parts.length !== 3) return null
    return new Date(parts[2], parts[1] - 1, parts[0])
  }

  const calcDays = (startStr, endStr) => {
    const start = parseDateFromDDMMYYYY(startStr)
    const end = endStr ? parseDateFromDDMMYYYY(endStr) : new Date()
    if (!start || !end) return null
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24))
    return diff >= 0 ? diff : null
  }

  const sortDateWise = (a, b) => {
    const dateStrA = a["colK"] || ""
    const dateStrB = b["colK"] || ""
    const dateA = parseDateFromDDMMYYYY(dateStrA)
    const dateB = parseDateFromDDMMYYYY(dateStrB)
    if (!dateA) return 1
    if (!dateB) return -1
    return dateA.getTime() - dateB.getTime()
  }

  // Unique dropdown options derived from all loaded data
  const givenByOptions = useMemo(() => {
    const all = [...taskData, ...historyData]
    return [...new Set(all.map((t) => t["colD"]).filter(Boolean))].sort()
  }, [taskData, historyData])

  const nameOptions = useMemo(() => {
    const all = [...taskData, ...historyData]
    return [...new Set(all.map((t) => t["colE"]).filter(Boolean))].sort()
  }, [taskData, historyData])

  // Memoized filtered data
  const filteredTaskData = useMemo(() => {
    const filtered = taskData.filter((task) => {
      const matchesSearch = searchTerm
        ? Object.values(task).some(
            (value) => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
          )
        : true
      const matchesGivenBy = filterGivenBy ? task["colD"] === filterGivenBy : true
      const matchesName = filterName ? task["colE"] === filterName : true
      return matchesSearch && matchesGivenBy && matchesName
    })

    return filtered.sort(sortDateWise)
  }, [taskData, searchTerm, filterGivenBy, filterName])

  const filteredHistoryData = useMemo(() => {
    return historyData
      .filter((item) => {
        const matchesSearch = searchTerm
          ? Object.values(item).some(
            (value) => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase()),
          )
          : true
        const matchesGivenBy = filterGivenBy ? item["colD"] === filterGivenBy : true
        const matchesName = filterName ? item["colE"] === filterName : true
        return matchesSearch && matchesGivenBy && matchesName
      })
      .sort((a, b) => {
        const dateStrA = a["colS"] || ""
        const dateStrB = b["colS"] || ""
        const dateA = parseDateFromDDMMYYYY(dateStrA)
        const dateB = parseDateFromDDMMYYYY(dateStrB)
        if (!dateA) return 1
        if (!dateB) return -1
        return dateB.getTime() - dateA.getTime()
      })
  }, [historyData, searchTerm, filterGivenBy, filterName])

  const fetchSheetData = useCallback(async () => {
    try {
      setLoading(true)
      const pendingTasks = []
      const historyTasks = []

      const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?sheet=${CONFIG.SHEET_NAME}&action=fetch`)

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`)
      }

      const text = await response.text()
      let data

      try {
        data = JSON.parse(text)
      } catch (parseError) {
        const jsonStart = text.indexOf("{")
        const jsonEnd = text.lastIndexOf("}")
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonString = text.substring(jsonStart, jsonEnd + 1)
          data = JSON.parse(jsonString)
        } else {
          throw new Error("Invalid JSON response from server")
        }
      }

      const currentUsername = sessionStorage.getItem("username")
      const currentUserRole = sessionStorage.getItem("role")

      let rows = []
      if (data.table && data.table.rows) {
        rows = data.table.rows
      } else if (Array.isArray(data)) {
        rows = data
      } else if (data.values) {
        rows = data.values.map((row) => ({ c: row.map((val) => ({ v: val })) }))
      }

      rows.forEach((row, rowIndex) => {
        if (rowIndex === 0) return // Skip header

        let rowValues = []
        if (row.c) {
          rowValues = row.c.map((cell) => (cell && cell.v !== undefined ? cell.v : ""))
        } else if (Array.isArray(row)) {
          rowValues = row
        } else {
          console.log("Unknown row format:", row)
          return
        }

        const assignedTo = rowValues[4] || "Unassigned" // Column E
        const isUserMatch = currentUserRole === "admin" || assignedTo.toLowerCase() === currentUsername.toLowerCase()
        if (!isUserMatch && currentUserRole !== "admin") return

        const columnKValue = rowValues[10] // Column K
        const columnLValue = rowValues[11] // Column L
        const columnSValue = rowValues[18] // Column S

        // Check conditions: Column K and L are not null
        const hasColumnK = !isEmpty(columnKValue)
        const hasColumnL = !isEmpty(columnLValue)
        const hasColumnS = !isEmpty(columnSValue)

        const googleSheetsRowIndex = rowIndex + 1
        const taskId = rowValues[1] || "" // Column B

        const stableId = taskId
          ? `task_${taskId}_${googleSheetsRowIndex}`
          : `row_${googleSheetsRowIndex}_${Math.random().toString(36).substring(2, 15)}`

        const rowData = {
          _id: stableId,
          _rowIndex: googleSheetsRowIndex,
          _taskId: taskId,
          // Map all columns using proper labels
          colA: rowValues[0] || "", // Timestamp
          colB: rowValues[1] || "", // Task ID
          colC: rowValues[2] || "", // Department
          colD: rowValues[3] || "", // Given By
          colE: rowValues[4] || "", // Name
          colF: rowValues[5] || "", // Task Description
          colG: rowValues[6] ? parseGoogleSheetsDate(String(rowValues[6])) : "", // Task Start Date
          colH: rowValues[7] || "",
          colI: rowValues[8] || "",
          colJ: rowValues[9] || "",
          colK: rowValues[10] ? parseGoogleSheetsDate(String(rowValues[10])) : "", // Planned Date
          colL: rowValues[11] ? parseGoogleSheetsDate(String(rowValues[11])) : "", // Mark Done Date
          colM: rowValues[12] || "",
          colN: rowValues[13] || "",
          colO: rowValues[14] || "",
          colP: rowValues[15] || "",
          colQ: rowValues[16] || "",
          colR: rowValues[17] || "",
          colS: rowValues[18] ? parseGoogleSheetsDate(String(rowValues[18])) : "", // Verification Date
          colT: rowValues[19] || "", // Remarks
        }

        // Filter based on conditions
        if (hasColumnK && hasColumnL && !hasColumnS) {
          // Pending re-verification tasks (K and L not null, S is null)
          pendingTasks.push(rowData)
        } else if (hasColumnK && hasColumnL && hasColumnS) {
          // Completed re-verification tasks (K, L, and S not null)
          historyTasks.push(rowData)
        }
      })

      setTaskData(pendingTasks)
      setHistoryData(historyTasks)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching sheet data:", error)
      setError("Failed to load task data: " + error.message)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSheetData()
  }, [fetchSheetData])

  // Checkbox handlers
  const handleSelectItem = useCallback((id, isChecked) => {
    console.log(`Checkbox action: ${id} -> ${isChecked}`)

    setSelectedItems((prev) => {
      const newSelected = new Set(prev)

      if (isChecked) {
        newSelected.add(id)
      } else {
        newSelected.delete(id)
        // Clean up related data when unchecking
        setRemarksData((prevRemarks) => {
          const newRemarksData = { ...prevRemarks }
          delete newRemarksData[id]
          return newRemarksData
        })
      }

      console.log(`Updated selection: ${Array.from(newSelected)}`)
      return newSelected
    })
  }, [])

  const handleCheckboxClick = useCallback(
    (e, id) => {
      e.stopPropagation()
      const isChecked = e.target.checked
      console.log(`Checkbox clicked: ${id}, checked: ${isChecked}`)
      handleSelectItem(id, isChecked)
    },
    [handleSelectItem],
  )

  const handleSelectAllItems = useCallback(
    (e) => {
      e.stopPropagation()
      const checked = e.target.checked
      console.log(`Select all clicked: ${checked}`)

      if (checked) {
        const allIds = filteredTaskData.map((item) => item._id)
        setSelectedItems(new Set(allIds))
        console.log(`Selected all items: ${allIds}`)
      } else {
        setSelectedItems(new Set())
        setRemarksData({})
        console.log("Cleared all selections")
      }
    },
    [filteredTaskData],
  )

  const toggleHistory = () => {
    setShowHistory((prev) => !prev)
    setSearchTerm("")
    setFilterGivenBy("")
    setFilterName("")
  }

  // MAIN SUBMIT FUNCTION
  const handleSubmit = async () => {
    const selectedItemsArray = Array.from(selectedItems)

    if (selectedItemsArray.length === 0) {
      alert("Please select at least one item to submit")
      return
    }

    const missingRemarks = selectedItemsArray.filter((id) => {
      const remarks = remarksData[id]
      return !remarks || remarks.trim() === ""
    })

    if (missingRemarks.length > 0) {
      alert(`Please provide remarks for all selected items. ${missingRemarks.length} item(s) are missing remarks.`)
      return
    }

    setIsSubmitting(true)

    try {
      const today = new Date()
      const todayFormatted = formatDateToDDMMYYYY(today)

      // Prepare submitted items for history BEFORE removing from pending
      const submittedItemsForHistory = selectedItemsArray.map((id) => {
        const item = taskData.find((task) => task._id === id)
        return {
          ...item,
          colS: todayFormatted, // Verification Date
          colT: remarksData[id] || "", // Remarks
        }
      })

      // CACHE MEMORY UPDATE 1: Remove submitted items from pending table immediately
      setTaskData((prev) => prev.filter((item) => !selectedItems.has(item._id)))

      // CACHE MEMORY UPDATE 2: Add submitted items to history immediately
      setHistoryData((prev) => [...submittedItemsForHistory, ...prev])

      // Clear selections and form data immediately
      setSelectedItems(new Set())
      setRemarksData({})

      // Show success message immediately
      setSuccessMessage(`Successfully processed ${selectedItemsArray.length} re-verification records! Tasks moved to history.`)

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage("")
      }, 5000)

      // Now handle the background submission to Google Sheets
      const submissionData = selectedItemsArray.map((id) => {
        const item = taskData.find((task) => task._id === id)

        console.log(`Preparing submission for item:`, {
          id: id,
          taskId: item["colB"],
          rowIndex: item._rowIndex,
        })

        return {
          taskId: item["colB"],
          rowIndex: item._rowIndex,
          verificationDate: todayFormatted,
          remarks: remarksData[id] || "",
        }
      })

      console.log("Final submission data:", submissionData)

      // Submit to Google Sheets in background
      const formData = new FormData()
      formData.append("sheetName", CONFIG.SHEET_NAME)
      formData.append("action", "updateReverificationData")
      formData.append("rowData", JSON.stringify(submissionData))

      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!result.success) {
        console.error("Background submission failed:", result.error)
      }
    } catch (error) {
      console.error("Submission error:", error)
      alert("Warning: There was an error with background submission, but your changes are saved locally.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Convert Set to Array for display
  const selectedItemsCount = selectedItems.size

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto pb-8 space-y-8">
        {/* Enhanced Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                {showHistory ? CONFIG.PAGE_CONFIG.historyTitle : CONFIG.PAGE_CONFIG.title}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {showHistory ? CONFIG.PAGE_CONFIG.historyDescription : CONFIG.PAGE_CONFIG.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={toggleHistory}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl py-3 px-5 border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              {showHistory ? (
                <>
                  <ArrowLeft className="h-4 w-4" />
                  <span>Pending Tasks</span>
                </>
              ) : (
                <>
                  <History className="h-4 w-4" />
                  <span>View History</span>
                </>
              )}
            </button>

            {!showHistory && (
              <button
                onClick={handleSubmit}
                disabled={selectedItemsCount === 0 || isSubmitting}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl py-3 px-6 text-white font-semibold transition-all duration-300 shadow-md hover:shadow-lg ${selectedItemsCount === 0 || isSubmitting
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  }`}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                <span>{isSubmitting ? "Processing..." : `Verify (${selectedItemsCount})`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Enhanced Search Bar */}
        <div className="rounded-2xl border border-slate-200 shadow-lg bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-slate-700 font-semibold mr-2">
              <Filter className="h-4 w-4 text-blue-600" />
              <span>Quick Search</span>
            </div>
            
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={showHistory ? "Search history records..." : "Search pending verifications..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <select
              value={filterGivenBy}
              onChange={(e) => setFilterGivenBy(e.target.value)}
              className="min-w-[150px] py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700"
            >
              <option value="">All Given By</option>
              {givenByOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <select
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="min-w-[150px] py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700"
            >
              <option value="">All Names</option>
              {nameOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            {(filterGivenBy || filterName) && (
              <button
                onClick={() => { setFilterGivenBy(""); setFilterName("") }}
                className="py-2 px-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-all font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
              {successMessage}
            </div>
            <button onClick={() => setSuccessMessage("")} className="text-green-500 hover:text-green-700">
              ×
            </button>
          </div>
        )}

        <div className="bg-white">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-none">
                {showHistory ? "Verification History" : "Pending Action List"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">Showing {showHistory ? filteredHistoryData.length : filteredTaskData.length} records</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 focus:ring-blue-500 mb-4"></div>
              <p className="text-slate-600">Loading task data...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md text-red-800 text-center">
              {error}{" "}
              <button className="underline ml-2" onClick={() => window.location.reload()}>
                Try again
              </button>
            </div>
          ) : showHistory ? (
            /* History Table */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Given By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                      Task Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                      Planned Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">
                      Verification Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-orange-50">
                      Work Done Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredHistoryData.length > 0 ? (
                    filteredHistoryData.map((history) => {
                      const days = calcDays(history["colG"], history["colL"])
                      return (
                      <tr key={history._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{history["colB"] || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{history["colC"] || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{history["colD"] || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{history["colE"] || "—"}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs" title={history["colF"]}>
                            {history["colF"] || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap bg-yellow-50">
                          <div className="text-sm text-gray-900">{history["colG"] || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap bg-blue-50">
                          <div className="text-sm text-gray-900">{history["colK"] || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap bg-green-50">
                          <div className="text-sm font-medium text-gray-900">{history["colS"] || "—"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap bg-orange-50">
                          {days !== null ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                              days <= 7 ? "bg-green-100 text-green-700" :
                              days <= 30 ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }`}>
                              {days} {days === 1 ? "day" : "days"}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-6 py-4 bg-purple-50">
                          <div className="text-sm text-gray-900 max-w-xs" title={history["colT"]}>
                            {history["colT"] || "—"}
                          </div>
                        </td>
                      </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                        {searchTerm
                          ? "No historical records matching your search"
                          : "No completed re-verification records found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Regular Tasks Table */
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-purple-500"
                        checked={filteredTaskData.length > 0 && selectedItems.size === filteredTaskData.length}
                        onChange={handleSelectAllItems}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Given By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-yellow-50">
                      Task Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                      Planned Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-orange-50">
                      Work Done Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTaskData.length > 0 ? (
                    filteredTaskData.map((task) => {
                      const isSelected = selectedItems.has(task._id)
                      const daysPending = calcDays(task["colG"], task["colL"])
                      return (
                        <tr key={task._id} className={`${isSelected ? "bg-blue-50/50 shadow-sm" : ""} hover:bg-slate-50 transition-all`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={isSelected}
                              onChange={(e) => handleCheckboxClick(e, task._id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{task["colB"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{task["colC"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{task["colD"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{task["colE"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate" title={task["colF"]}>
                              {task["colF"] || "—"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap bg-yellow-50">
                            <div className="text-sm text-gray-900">{task["colG"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap bg-blue-50">
                            <div className="text-sm text-gray-900">{task["colK"] || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap bg-orange-50">
                            {daysPending !== null ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                daysPending <= 7 ? "bg-green-100 text-green-700" :
                                daysPending <= 30 ? "bg-yellow-100 text-yellow-700" :
                                "bg-red-100 text-red-700"
                              }`}>
                                {daysPending} {daysPending === 1 ? "day" : "days"}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap bg-purple-50">
                            <input
                              type="text"
                              placeholder="Enter remarks"
                              disabled={!isSelected}
                              value={remarksData[task._id] || ""}
                              onChange={(e) => setRemarksData((prev) => ({ ...prev, [task._id]: e.target.value }))}
                              className="border rounded-md px-2 py-1 w-full border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                        {searchTerm
                          ? "No tasks matching your search"
                          : "No pending re-verification tasks found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default ReverificationPage
