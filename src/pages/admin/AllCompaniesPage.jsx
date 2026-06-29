"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, Upload, X, Search, History, ArrowLeft, Filter, Sparkles, FileText, ChevronRight, User, Calendar } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzxy5T34g3xcteQg6CT5sLNSCYsU8gXqxGBN3vnz2gWI5MxO8pb_fuw_k_FT5kx06hG/exec"

const COMPANIES = [
  { id: "pmmpl",     name: "PMMPL",     SHEET_NAME: "PMMPL",     DRIVE_FOLDER_ID: "1wY0PCy9GfMHzh046D3Rj_O1JrujpiD_f" },
  { id: "rkl",       name: "RKL",       SHEET_NAME: "RKL",       DRIVE_FOLDER_ID: "BTXTHd-Mi58N0w1YRci-2Ow2V9GqsNww" },
  { id: "refrasynth",name: "REFRASYNTH",SHEET_NAME: "REFRASYNTH",DRIVE_FOLDER_ID: "1P6jC4X8eMoyPUOUCFp8G30I83aAeEIy9" },
  { id: "refratech", name: "REFRATECH", SHEET_NAME: "REFRATECH", DRIVE_FOLDER_ID: "1P6jC4X8eMoyPUOUCFp8G30I83aAeEIy9" },
  { id: "purab",     name: "PURAB",     SHEET_NAME: "PURAB",     DRIVE_FOLDER_ID: "1IENpXhLEgB7lI8VAMc0qPIqtQgBcPDcM" },
]

// ─── inner content (no AdminLayout) ───────────────────────────────────────────
function CompanyTaskContent({ config }) {
  const [accountData, setAccountData]     = useState([])
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [isSubmitting, setIsSubmitting]   = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [additionalData, setAdditionalData] = useState({})
  const [searchTerm, setSearchTerm]       = useState("")
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [remarksData, setRemarksData]     = useState({})
  const [historyData, setHistoryData]     = useState([])
  const [showHistory, setShowHistory]     = useState(false)
  const [membersList, setMembersList]     = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [startDate, setStartDate]         = useState("")
  const [endDate, setEndDate]             = useState("")
  const [userRole, setUserRole]           = useState("")
  const [username, setUsername]           = useState("")
  const [filterGivenBy, setFilterGivenBy] = useState("")
  const [filterName, setFilterName]       = useState("")

  useEffect(() => {
    setUserRole(sessionStorage.getItem("role") || "")
    setUsername(sessionStorage.getItem("username") || "")
  }, [])

  // reset all state when company tab switches
  useEffect(() => {
    setAccountData([])
    setHistoryData([])
    setSelectedItems(new Set())
    setAdditionalData({})
    setRemarksData({})
    setSearchTerm("")
    setSelectedMembers([])
    setStartDate("")
    setEndDate("")
    setShowHistory(false)
    setSuccessMessage("")
    setError(null)
    setLoading(true)
    setFilterGivenBy("")
    setFilterName("")
  }, [config.id])

  const formatDateToDDMMYYYY = (date) => {
    const d = date.getDate().toString().padStart(2, "0")
    const m = (date.getMonth() + 1).toString().padStart(2, "0")
    return `${d}/${m}/${date.getFullYear()}`
  }

  const isEmpty = (v) => v === null || v === undefined || (typeof v === "string" && v.trim() === "")

  const parseGoogleSheetsDate = useCallback((dateStr) => {
    if (!dateStr) return ""
    if (typeof dateStr === "string" && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateStr
    if (typeof dateStr === "string" && dateStr.startsWith("Date(")) {
      const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateStr)
      if (match) {
        const y = parseInt(match[1]), mo = parseInt(match[2]), d = parseInt(match[3])
        return `${String(d).padStart(2,"0")}/${String(mo+1).padStart(2,"0")}/${y}`
      }
    }
    try {
      const d = new Date(dateStr)
      if (!isNaN(d.getTime())) return formatDateToDDMMYYYY(d)
    } catch {}
    return dateStr
  }, [])

  const parseDateFromDDMMYYYY = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null
    const p = dateStr.split("/")
    if (p.length !== 3) return null
    return new Date(p[2], p[1] - 1, p[0])
  }

  const sortDateWise = (a, b) => {
    const da = parseDateFromDDMMYYYY(a["col6"] || "")
    const db = parseDateFromDDMMYYYY(b["col6"] || "")
    if (!da) return 1
    if (!db) return -1
    return da - db
  }

  const resetFilters = () => {
    setSearchTerm(""); setSelectedMembers([]); setStartDate(""); setEndDate("")
  }

  const givenByOptions = useMemo(() =>
    [...new Set(accountData.map(t => t["col3"]).filter(Boolean))].sort()
  , [accountData])

  const nameOptions = useMemo(() =>
    [...new Set(accountData.map(t => t["col4"]).filter(Boolean))].sort()
  , [accountData])

  const filteredAccountData = useMemo(() => {
    const f = accountData.filter(a => {
      const matchSearch = searchTerm
        ? Object.values(a).some(v => v && v.toString().toLowerCase().includes(searchTerm.toLowerCase()))
        : true
      const matchGivenBy = filterGivenBy ? a["col3"] === filterGivenBy : true
      const matchName = filterName ? a["col4"] === filterName : true
      return matchSearch && matchGivenBy && matchName
    })
    return [...f].sort(sortDateWise)
  }, [accountData, searchTerm, filterGivenBy, filterName])

  const filteredHistoryData = useMemo(() => {
    return historyData
      .filter(item => {
        const matchSearch = searchTerm
          ? Object.values(item).some(v => v && v.toString().toLowerCase().includes(searchTerm.toLowerCase()))
          : true
        const matchMember = selectedMembers.length > 0 ? selectedMembers.includes(item["col4"]) : true
        let matchDate = true
        if (startDate || endDate) {
          const d = parseDateFromDDMMYYYY(item["col10"])
          if (!d) return false
          if (startDate && d < new Date(startDate)) matchDate = false
          if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); if (d > e) matchDate = false }
        }
        return matchSearch && matchMember && matchDate
      })
      .sort((a, b) => {
        const da = parseDateFromDDMMYYYY(a["col10"] || "")
        const db = parseDateFromDDMMYYYY(b["col10"] || "")
        if (!da) return 1; if (!db) return -1
        return db - da
      })
  }, [historyData, searchTerm, selectedMembers, startDate, endDate])

  const getFilteredMembersList = () =>
    userRole === "admin" ? membersList : membersList.filter(m => m.toLowerCase() === username.toLowerCase())

  const fetchSheetData = useCallback(async () => {
    try {
      setLoading(true)
      const pending = [], history = []
      const resp = await fetch(`${APPS_SCRIPT_URL}?sheet=${config.SHEET_NAME}&action=fetch`)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const text = await resp.text()
      let data
      try { data = JSON.parse(text) } catch {
        const s = text.indexOf("{"), e = text.lastIndexOf("}")
        if (s !== -1 && e !== -1) data = JSON.parse(text.substring(s, e+1))
        else throw new Error("Invalid JSON")
      }

      const curUser = sessionStorage.getItem("username")
      const curRole = sessionStorage.getItem("role")
      const today = new Date()
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1)
      const todayStr = formatDateToDDMMYYYY(today)
      const tomorrowStr = formatDateToDDMMYYYY(tomorrow)
      const membersSet = new Set()

      let rows = data.table?.rows || (Array.isArray(data) ? data : [])

      rows.forEach((row, ri) => {
        if (ri === 0) return
        const rv = row.c ? row.c.map(c => c?.v ?? "") : (Array.isArray(row) ? row : [])
        const assignedTo = rv[4] || "Unassigned"
        membersSet.add(assignedTo)
        const isMatch = curRole === "admin" || assignedTo.toLowerCase() === curUser?.toLowerCase()
        if (!isMatch) return

        const colG = rv[6], colK = rv[10], colM = rv[12]
        if (colM?.toString().trim() === "DONE") return

        const taskId = rv[1] || ""
        const gsRow = ri + 1
        const stableId = taskId ? `task_${taskId}_${gsRow}` : `row_${gsRow}_${Math.random().toString(36).slice(2)}`
        const rowData = { _id: stableId, _rowIndex: gsRow, _taskId: taskId }

        const headers = [
          { id:"col0",type:"string"},{ id:"col1",type:"string"},{ id:"col2",type:"string"},
          { id:"col3",type:"string"},{ id:"col4",type:"string"},{ id:"col5",type:"string"},
          { id:"col6",type:"date" },{ id:"col7",type:"string"},{ id:"col8",type:"string"},
          { id:"col9",type:"string"},{ id:"col10",type:"date"},{ id:"col11",type:"string"},
          { id:"col12",type:"string"},{ id:"col13",type:"string"},{ id:"col14",type:"string"},
        ]
        headers.forEach((h, i) => {
          const v = rv[i]
          rowData[h.id] = (h.type === "date" || (v && String(v).startsWith("Date(")))
            ? (v ? parseGoogleSheetsDate(String(v)) : "")
            : (v ?? "")
        })

        const hasG = !isEmpty(colG), emptyK = isEmpty(colK)
        if (hasG && emptyK) {
          const fmtDate = parseGoogleSheetsDate(String(colG))
          const d = parseDateFromDDMMYYYY(fmtDate)
          if (fmtDate === todayStr || fmtDate === tomorrowStr || (d && d <= today))
            pending.push(rowData)
        } else if (hasG && !emptyK) {
          if (curRole === "admin" || assignedTo.toLowerCase() === curUser?.toLowerCase())
            history.push(rowData)
        }
      })

      setMembersList([...membersSet].sort())
      setAccountData(pending)
      setHistoryData(history)
      setLoading(false)
    } catch (err) {
      setError("Failed to load: " + err.message)
      setLoading(false)
    }
  }, [config.SHEET_NAME, parseGoogleSheetsDate])

  useEffect(() => { fetchSheetData() }, [fetchSheetData])

  const handleSelectItem = useCallback((id, checked) => {
    setSelectedItems(prev => {
      const n = new Set(prev)
      if (checked) { n.add(id) }
      else {
        n.delete(id)
        setAdditionalData(p => { const d={...p}; delete d[id]; return d })
        setRemarksData(p => { const d={...p}; delete d[id]; return d })
      }
      return n
    })
  }, [])

  const handleCheckboxClick = useCallback((e, id) => {
    e.stopPropagation(); handleSelectItem(id, e.target.checked)
  }, [handleSelectItem])

  const handleSelectAll = useCallback((e) => {
    e.stopPropagation()
    if (e.target.checked) { setSelectedItems(new Set(filteredAccountData.map(i => i._id))) }
    else { setSelectedItems(new Set()); setAdditionalData({}); setRemarksData({}) }
  }, [filteredAccountData])

  const fileToBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader(); r.readAsDataURL(file)
    r.onload = () => res(r.result); r.onerror = rej
  })

  const handleImageUpload = (id, e) => {
    const file = e.target.files[0]; if (!file) return
    setAccountData(prev => prev.map(item => item._id === id ? {...item, image: file} : item))
  }

  const toggleHistory = () => { setShowHistory(p => !p); resetFilters() }

  const handleSubmit = async () => {
    const arr = [...selectedItems]
    if (!arr.length) { alert("Please select at least one item"); return }

    const missingRemarks = arr.filter(id => additionalData[id] === "No" && !remarksData[id]?.trim())
    if (missingRemarks.length) { alert(`Missing remarks for ${missingRemarks.length} item(s) marked "No"`); return }


    setIsSubmitting(true)
    try {
      const today = new Date(); const todayFmt = formatDateToDDMMYYYY(today)
      const forHistory = arr.map(id => {
        const item = accountData.find(a => a._id === id)
        return { ...item, col10: todayFmt, col12: additionalData[id]||"", col13: remarksData[id]||"", col14: typeof item.image==="string"?item.image:"" }
      })
      setAccountData(prev => prev.filter(i => !selectedItems.has(i._id)))
      setHistoryData(prev => [...forHistory, ...prev])
      setSelectedItems(new Set()); setAdditionalData({}); setRemarksData({})
      setSuccessMessage(`Successfully processed ${arr.length} task(s)!`)
      setTimeout(() => setSuccessMessage(""), 5000)

      const submissionData = await Promise.all(arr.map(async id => {
        const item = accountData.find(a => a._id === id)
        let imageUrl = ""
        if (item.image instanceof File) {
          try {
            const b64 = await fileToBase64(item.image)
            const fd = new FormData()
            fd.append("action","uploadFile"); fd.append("base64Data",b64)
            fd.append("fileName",`task_${item["col1"]}_${Date.now()}.${item.image.name.split(".").pop()}`)
            fd.append("mimeType",item.image.type); fd.append("folderId",config.DRIVE_FOLDER_ID)
            const up = await fetch(APPS_SCRIPT_URL,{method:"POST",body:fd})
            const res = await up.json()
            if (res.success) {
              imageUrl = res.fileUrl
              setHistoryData(prev => prev.map(h => h._id===id ? {...h,col14:imageUrl} : h))
            }
          } catch {}
        }
        return { taskId: item["col1"], rowIndex: item._rowIndex, actualDate: todayFmt, status: additionalData[id]||"", remarks: remarksData[id]||"", imageUrl }
      }))

      const fd = new FormData()
      fd.append("sheetName", config.SHEET_NAME)
      fd.append("action","updateTaskData")
      fd.append("rowData", JSON.stringify(submissionData))
      const resp = await fetch(APPS_SCRIPT_URL,{method:"POST",body:fd})
      const result = await resp.json()
      if (!result.success) console.error("Background submit failed:", result.error)
    } catch (err) {
      alert("Warning: background submission error. Changes saved locally.")
    } finally { setIsSubmitting(false) }
  }

  const selectedCount = selectedItems.size

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-blue-700">
              {showHistory ? `${config.name} History` : `${config.name} Tasks`}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {showHistory ? "Read-only view of completed tasks" : "Today, tomorrow and past-due tasks"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={toggleHistory}
            className="flex items-center gap-2 rounded-xl py-2.5 px-5 border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all shadow-sm text-sm">
            {showHistory ? <><ArrowLeft className="h-4 w-4"/><span>Pending Tasks</span></> : <><History className="h-4 w-4"/><span>Task History</span></>}
          </button>
          {!showHistory && (
            <button onClick={handleSubmit} disabled={selectedCount===0||isSubmitting}
              className={`flex items-center gap-2 rounded-xl py-2.5 px-5 text-white font-semibold transition-all shadow-md text-sm ${selectedCount===0||isSubmitting?"bg-slate-300 cursor-not-allowed":"bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"}`}>
              {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <CheckCircle2 className="h-4 w-4"/>}
              <span>{isSubmitting ? "Processing..." : `Submit (${selectedCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Filter className="h-4 w-4 text-blue-600"/>
            <span className="text-sm">Filters</span>
          </div>
          <div className="flex-1 min-w-[180px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
            <input type="text" placeholder={showHistory?"Search history...":"Search tasks..."}
              value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
          </div>
            {!showHistory && (
              <>
                <select value={filterGivenBy} onChange={e=>setFilterGivenBy(e.target.value)}
                  className="min-w-[130px] py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-700">
                  <option value="">All Given By</option>
                  {givenByOptions.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
                <select value={filterName} onChange={e=>setFilterName(e.target.value)}
                  className="min-w-[130px] py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-700">
                  <option value="">All Names</option>
                  {nameOptions.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
                {(filterGivenBy || filterName || searchTerm) && (
                  <button onClick={()=>{setFilterGivenBy("");setFilterName("");setSearchTerm("")}}
                    className="py-2 px-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100">
                    Clear Filters
                  </button>
                )}
              </>
            )}

          {showHistory && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400"/>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                className="border border-slate-300 rounded-lg text-sm py-2 px-3 focus:border-blue-500 outline-none"/>
              <span className="text-slate-400 text-sm">to</span>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
                className="border border-slate-300 rounded-lg text-sm py-2 px-3 focus:border-blue-500 outline-none"/>
            </div>
          )}
        </div>

        {showHistory && getFilteredMembersList().length > 0 && (
          <div className="p-4 bg-white border-b border-slate-100 flex flex-wrap gap-2 items-center">
            <User className="h-4 w-4 text-slate-400"/>
            {getFilteredMembersList().map((m,i) => (
              <button key={i} onClick={()=>setSelectedMembers(p=>p.includes(m)?p.filter(x=>x!==m):[...p,m])}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${selectedMembers.includes(m)?"bg-blue-600 text-white":"bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {m}
              </button>
            ))}
            {(selectedMembers.length>0||startDate||endDate||searchTerm) && (
              <button onClick={resetFilters} className="px-3 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-100">
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between text-sm">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500"/>{successMessage}</div>
          <button onClick={()=>setSuccessMessage("")}><X className="h-4 w-4"/></button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><FileText className="h-4 w-4 text-blue-600"/></div>
          <div>
            <p className="text-sm font-bold text-slate-800">{showHistory?"Historical Submission Log":"Active Processing Queue"}</p>
            <p className="text-xs text-slate-500">{showHistory?`${filteredHistoryData.length} records`:`${filteredAccountData.length} pending items`}</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-3"/>
            <p className="text-slate-500 text-sm">Loading {config.name} data...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-sm">
            {error} <button className="underline ml-1" onClick={fetchSheetData}>Retry</button>
          </div>
        ) : showHistory ? (
          /* History Table */
          <>
            {/* Stats bar */}
            <div className="p-4 bg-blue-50 border-b border-blue-100 flex flex-wrap gap-4">
              <div className="px-3 py-2 bg-white rounded-lg shadow-sm">
                <p className="text-xs text-slate-500">Total Completed</p>
                <p className="text-lg font-bold text-blue-600">{historyData.length}</p>
              </div>
              {(selectedMembers.length>0||startDate||endDate||searchTerm) && (
                <div className="px-3 py-2 bg-white rounded-lg shadow-sm">
                  <p className="text-xs text-slate-500">Filtered</p>
                  <p className="text-lg font-bold text-blue-600">{filteredHistoryData.length}</p>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Task ID","Department","Given By","Name","Task Description","Task Start Date","Freq","Enable Reminders","Require Attachment","Actual Date","Status","Remarks","Attachment"].map(h=>(
                      <th key={h} className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${h==="Task Start Date"?"bg-yellow-50":h==="Actual Date"?"bg-green-50":h==="Status"?"bg-blue-50":h==="Remarks"?"bg-purple-50":""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredHistoryData.length>0 ? filteredHistoryData.map(h=>(
                    <tr key={h._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{h["col1"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{h["col2"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{h["col3"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{h["col4"]||"—"}</td>
                      <td className="px-4 py-3 max-w-xs truncate" title={h["col5"]}>{h["col5"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap bg-yellow-50">{h["col6"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{h["col7"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{h["col8"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{h["col9"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap bg-green-50 font-medium">{h["col10"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap bg-blue-50">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${h["col12"]==="Yes"?"bg-green-100 text-green-800":h["col12"]==="No"?"bg-red-100 text-red-800":"bg-gray-100 text-gray-800"}`}>
                          {h["col12"]||"—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 bg-purple-50 max-w-xs" title={h["col13"]}>{h["col13"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {h["col14"] ? (
                          <a href={h["col14"]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-xs">
                            <img src={h["col14"]} alt="Attachment" className="h-7 w-7 object-cover rounded"/>View
                          </a>
                        ) : <span className="text-gray-400 text-xs">No attachment</span>}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={13} className="py-6 text-center text-gray-400 text-sm">No records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Pending Table */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={filteredAccountData.length>0 && selectedItems.size===filteredAccountData.length}
                      onChange={handleSelectAll}/>
                  </th>
                  {["Task ID","Department","Given By","Name","Task Description","Task Start Date","Freq","Enable Reminders","Require Attachment","Status","Remarks","Upload Image"].map(h=>(
                    <th key={h} className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${h==="Task Start Date"?"bg-yellow-50":""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAccountData.length>0 ? filteredAccountData.map(acc=>{
                  const isSel = selectedItems.has(acc._id)
                  return (
                    <tr key={acc._id} className={`${isSel?"bg-blue-50/40":""} hover:bg-gray-50 transition-colors`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={isSel} onChange={e=>handleCheckboxClick(e,acc._id)}/>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{acc["col1"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{acc["col2"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{acc["col3"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{acc["col4"]||"—"}</td>
                      <td className="px-4 py-3 max-w-xs truncate" title={acc["col5"]}>{acc["col5"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap bg-yellow-50">{acc["col6"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{acc["col7"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{acc["col8"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{acc["col9"]||"—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap bg-yellow-50">
                        <select disabled={!isSel} value={additionalData[acc._id]||""}
                          onChange={e=>{ setAdditionalData(p=>({...p,[acc._id]:e.target.value})); if(e.target.value!=="No") setRemarksData(p=>{const d={...p};delete d[acc._id];return d}) }}
                          className="border border-gray-300 rounded px-2 py-1 w-24 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed">
                          <option value="">Select...</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap bg-orange-50">
                        <input type="text" placeholder="Remarks" disabled={!isSel||!additionalData[acc._id]}
                          value={remarksData[acc._id]||""} onChange={e=>setRemarksData(p=>({...p,[acc._id]:e.target.value}))}
                          className="border border-gray-300 rounded px-2 py-1 w-36 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"/>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap bg-green-50">
                        {acc.image ? (
                          <div className="flex items-center gap-2">
                            <img src={typeof acc.image==="string"?acc.image:URL.createObjectURL(acc.image)} alt="Receipt" className="h-8 w-8 object-cover rounded"/>
                            <span className="text-xs text-green-600">{acc.image instanceof File?"Ready":"Uploaded"}</span>
                          </div>
                        ) : (
                          <label className="flex items-center gap-1 cursor-pointer text-xs text-blue-600 hover:underline">
                            <Upload className="h-4 w-4"/>
                            Upload
                            <input type="file" className="hidden" accept="image/*" disabled={!isSel} onChange={e=>handleImageUpload(acc._id,e)}/>
                          </label>
                        )}
                      </td>
                    </tr>
                  )
                }) : (
                  <tr><td colSpan={13} className="py-6 text-center text-gray-400 text-sm">No pending tasks</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ALL companies read-only view ─────────────────────────────────────────────
function AllCompaniesContent() {
  const [allData, setAllData]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [searchTerm, setSearchTerm]   = useState("")
  const [filterGivenBy, setFilterGivenBy] = useState("")
  const [filterName, setFilterName]   = useState("")
  const [filterCompany, setFilterCompany] = useState("")

  const parseGoogleSheetsDate = (dateStr) => {
    if (!dateStr) return ""
    if (typeof dateStr === "string" && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateStr
    if (typeof dateStr === "string" && dateStr.startsWith("Date(")) {
      const m = /Date\((\d+),(\d+),(\d+)\)/.exec(dateStr)
      if (m) return `${String(parseInt(m[3])).padStart(2,"0")}/${String(parseInt(m[2])+1).padStart(2,"0")}/${m[1]}`
    }
    try { const d = new Date(dateStr); if (!isNaN(d)) { const dd=String(d.getDate()).padStart(2,"0"),mm=String(d.getMonth()+1).padStart(2,"0"); return `${dd}/${mm}/${d.getFullYear()}` } } catch {}
    return dateStr
  }

  const parseDateFromDDMMYYYY = (s) => {
    if (!s) return null; const p = s.split("/"); if (p.length!==3) return null
    return new Date(p[2], p[1]-1, p[0])
  }

  useEffect(() => {
    const curUser = sessionStorage.getItem("username")
    const curRole = sessionStorage.getItem("role")
    const today = new Date()
    const fmt = (d) => { const dd=String(d.getDate()).padStart(2,"0"),mm=String(d.getMonth()+1).padStart(2,"0"); return `${dd}/${mm}/${d.getFullYear()}` }
    const todayStr = fmt(today)
    const tom = new Date(today); tom.setDate(today.getDate()+1); const tomStr = fmt(tom)

    Promise.all(COMPANIES.map(async (co) => {
      try {
        const resp = await fetch(`${APPS_SCRIPT_URL}?sheet=${co.SHEET_NAME}&action=fetch`)
        if (!resp.ok) return []
        const text = await resp.text()
        let data; try { data = JSON.parse(text) } catch { const s=text.indexOf("{"),e=text.lastIndexOf("}"); if(s!==-1&&e!==-1) data=JSON.parse(text.substring(s,e+1)); else return [] }
        const rows = data.table?.rows || (Array.isArray(data)?data:[])
        const result = []
        rows.forEach((row,ri)=>{
          if(ri===0) return
          const rv = row.c ? row.c.map(c=>c?.v??"") : (Array.isArray(row)?row:[])
          const assignedTo = rv[4]||"Unassigned"
          if(curRole!=="admin" && assignedTo.toLowerCase()!==curUser?.toLowerCase()) return
          const colG=rv[6], colK=rv[10], colM=rv[12]
          if(colM?.toString().trim()==="DONE") return
          const hasG = colG!==null && colG!==undefined && String(colG).trim()!==""
          const emptyK = colK===null || colK===undefined || String(colK).trim()===""
          if(!hasG||!emptyK) return
          const fmtDate = parseGoogleSheetsDate(String(colG))
          const d = parseDateFromDDMMYYYY(fmtDate)
          if(fmtDate!==todayStr && fmtDate!==tomStr && !(d&&d<=today)) return
          const taskId=rv[1]||""; const gsRow=ri+1
          const rowData = {
            _id:`${co.id}_task_${taskId}_${gsRow}`, _company: co.name,
            col1:rv[1]||"", col2:rv[2]||"", col3:rv[3]||"", col4:rv[4]||"",
            col5:rv[5]||"", col6:parseGoogleSheetsDate(String(rv[6]||"")),
            col7:rv[7]||"", col8:rv[8]||"", col9:rv[9]||"",
          }
          result.push(rowData)
        })
        return result
      } catch { return [] }
    })).then(results => {
      setAllData(results.flat())
      setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const givenByOptions = useMemo(()=>[...new Set(allData.map(t=>t.col3).filter(Boolean))].sort(),[allData])
  const nameOptions    = useMemo(()=>[...new Set(allData.map(t=>t.col4).filter(Boolean))].sort(),[allData])

  const filtered = useMemo(()=>allData.filter(t=>{
    const ms = searchTerm ? Object.values(t).some(v=>v&&v.toString().toLowerCase().includes(searchTerm.toLowerCase())) : true
    const mg = filterGivenBy ? t.col3===filterGivenBy : true
    const mn = filterName    ? t.col4===filterName    : true
    const mc = filterCompany ? t._company===filterCompany : true
    return ms&&mg&&mn&&mc
  }).sort((a,b)=>{
    const da=parseDateFromDDMMYYYY(a.col6), db=parseDateFromDDMMYYYY(b.col6)
    if(!da)return 1; if(!db)return -1; return da-db
  }),[allData,searchTerm,filterGivenBy,filterName,filterCompany])

  const companyOptions = COMPANIES.map(c=>c.name)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <Filter className="h-4 w-4 text-blue-600"/><span className="text-sm">Filters</span>
          </div>
          <div className="flex-1 min-w-[160px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"/>
            <input type="text" placeholder="Search all companies..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
          </div>
          <select value={filterCompany} onChange={e=>setFilterCompany(e.target.value)}
            className="min-w-[120px] py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 text-slate-700">
            <option value="">All Companies</option>
            {companyOptions.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
          <select value={filterGivenBy} onChange={e=>setFilterGivenBy(e.target.value)}
            className="min-w-[130px] py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 text-slate-700">
            <option value="">All Given By</option>
            {givenByOptions.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
          <select value={filterName} onChange={e=>setFilterName(e.target.value)}
            className="min-w-[130px] py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 text-slate-700">
            <option value="">All Names</option>
            {nameOptions.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
          {(filterGivenBy||filterName||filterCompany||searchTerm) && (
            <button onClick={()=>{setFilterGivenBy("");setFilterName("");setFilterCompany("");setSearchTerm("")}}
              className="py-2 px-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100">
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg"><FileText className="h-4 w-4 text-blue-600"/></div>
          <div>
            <p className="text-sm font-bold text-slate-800">All Companies — Pending Tasks</p>
            <p className="text-xs text-slate-500">{filtered.length} tasks across all companies</p>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-3"/>
            <p className="text-slate-500 text-sm">Loading all companies...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 text-sm">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Company","Task ID","Department","Given By","Name","Task Description","Task Start Date","Freq","Enable Reminders","Require Attachment"].map(h=>(
                    <th key={h} className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${h==="Task Start Date"?"bg-yellow-50":""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.length>0 ? filtered.map(t=>(
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700">{t._company}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">{t.col1||"—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.col2||"—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.col3||"—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.col4||"—"}</td>
                    <td className="px-4 py-3 max-w-xs truncate" title={t.col5}>{t.col5||"—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap bg-yellow-50">{t.col6||"—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.col7||"—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.col8||"—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{t.col9||"—"}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={10} className="py-8 text-center text-gray-400 text-sm">No pending tasks found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── wrapper page with tabs ────────────────────────────────────────────────────
export default function AllCompaniesPage() {
  const [activeTab, setActiveTab] = useState("all")

  const ALL_TABS = [{ id: "all", name: "ALL" }, ...COMPANIES]

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto pb-8 space-y-6">
        {/* Page title */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <Sparkles className="h-6 w-6 text-white"/>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              Check List Task Dashboards
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">All company task dashboards in one place</p>
          </div>
        </div>

        {/* Company tabs */}
        <div className="flex flex-wrap gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
          {ALL_TABS.map(c => (
            <button key={c.id} onClick={() => setActiveTab(c.id)}
              className={`flex-1 min-w-[70px] py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeTab === c.id
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-200"
                  : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
              }`}>
              {c.name}
            </button>
          ))}
        </div>

        {/* Active content */}
        {activeTab === "all"
          ? <AllCompaniesContent key="all"/>
          : <CompanyTaskContent key={activeTab} config={COMPANIES.find(c=>c.id===activeTab)}/>
        }
      </div>
    </AdminLayout>
  )
}
