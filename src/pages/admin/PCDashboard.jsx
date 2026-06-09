"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  BarChart3, AlertTriangle, CheckCircle2, Clock,
  Calendar, RefreshCw, Search, ListTodo, Activity,
  ChevronUp, ChevronDown, Filter
} from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"

const SHEET_ID = "1sn8_JWWODv3JM097Q1oIpVt0EhxRxEBi4sy7onV95tc"
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzxy5T34g3xcteQg6CT5sLNSCYsU8gXqxGBN3vnz2gWI5MxO8pb_fuw_k_FT5kx06hG/exec"

const DEPARTMENTS = [
  { name: "PMMPL",     sheet: "PMMPL" },
  { name: "RKL",       sheet: "RKL" },
  { name: "REFRASYNTH",sheet: "REFRASYNTH" },
  { name: "REFRATECH", sheet: "REFRATECH" },
  { name: "PURAB",     sheet: "PURAB" },
]

// ─── Pure helpers ────────────────────────────────────────────────────────────

function formatDateToDDMMYYYY(date) {
  const day   = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year  = date.getFullYear()
  return `${day}/${month}/${year}`
}

function parseGoogleSheetsDate(raw) {
  if (!raw) return ""
  const s = String(raw)
  if (s.match(/^\d{2}\/\d{2}\/\d{4}$/)) return s
  if (s.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const [d, m, y] = s.split("/")
    return `${d.padStart(2,"0")}/${m.padStart(2,"0")}/${y}`
  }
  if (s.startsWith("Date(")) {
    const m = /Date\((\d+),(\d+),(\d+)\)/.exec(s)
    if (m) {
      const yr = parseInt(m[1], 10), mo = parseInt(m[2], 10), dy = parseInt(m[3], 10)
      return `${dy.toString().padStart(2,"0")}/${(mo+1).toString().padStart(2,"0")}/${yr}`
    }
  }
  try {
    const d = new Date(raw)
    if (!isNaN(d.getTime())) return formatDateToDDMMYYYY(d)
  } catch (_) {}
  return ""
}

function parseDDMMYYYY(str) {
  if (!str || typeof str !== "string") return null
  const parts = str.split("/")
  if (parts.length !== 3) return null
  const d = new Date(parts[2], parts[1] - 1, parts[0])
  return isNaN(d.getTime()) ? null : d
}

function classifyStatus(dueDateStr, completionDateStr, todayMs) {
  if (completionDateStr) return "completed"
  const due = parseDDMMYYYY(dueDateStr)
  if (!due) return "pending"
  const dueMs = due.getTime()
  const weekMs = todayMs + 7 * 86400000
  if (dueMs < todayMs)  return "overdue"
  if (dueMs === todayMs) return "today"
  if (dueMs <= weekMs)  return "this-week"
  return "upcoming"
}

function calcDelayDays(dueDateStr, todayMs) {
  const due = parseDDMMYYYY(dueDateStr)
  if (!due) return 0
  const diff = Math.floor((todayMs - due.getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PCDashboard() {
  const [tasks,         setTasks]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [activeFilter,  setActiveFilter]  = useState("overdue")
  const [searchQuery,   setSearchQuery]   = useState("")
  const [selectedDept,  setSelectedDept]  = useState("All")
  const [sortField,     setSortField]     = useState("dueDate")
  const [sortDir,       setSortDir]       = useState("asc")
  const [lastRefreshed, setLastRefreshed] = useState(null)

  // Stable "today at midnight" – recomputed only on mount
  const todayMs = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }, [])

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const collected = []

      await Promise.all(
        DEPARTMENTS.map(async (dept) => {
          try {
            const res = await fetch(
              `${APPS_SCRIPT_URL}?sheet=${dept.sheet}&action=fetch`
            )
            if (!res.ok) return

            const text = await res.text()
            let data
            try {
              data = JSON.parse(text)
            } catch {
              const s = text.indexOf("{"), e = text.lastIndexOf("}")
              if (s === -1) return
              data = JSON.parse(text.substring(s, e + 1))
            }

            let rows = []
            if (data.table?.rows)       rows = data.table.rows
            else if (Array.isArray(data)) rows = data
            else if (data.values)        rows = data.values.map(r => ({ c: r.map(v => ({ v })) }))

            rows.forEach((row, idx) => {
              if (idx === 0) return // header

              const cells = row.c
                ? row.c.map(cell => (cell && cell.v !== undefined ? cell.v : ""))
                : Array.isArray(row) ? row : []

              const taskId = cells[1]
              if (!taskId) return

              const dueDate = cells[6] ? parseGoogleSheetsDate(cells[6]) : ""
              if (!dueDate) return

              const colK  = cells[10] ? parseGoogleSheetsDate(cells[10]) : ""
              const colM  = cells[12] ? String(cells[12]).trim() : ""
              if (colM === "DONE") return

              const status    = classifyStatus(dueDate, colK, todayMs)
              const delayDays = status === "overdue" ? calcDelayDays(dueDate, todayMs) : 0

              collected.push({
                id:           `${dept.sheet}_${taskId}_${idx}`,
                taskId:       String(taskId),
                department:   dept.name,
                assignedTo:   cells[4] ? String(cells[4]).trim() : "Unassigned",
                givenBy:      cells[3] ? String(cells[3]).trim() : "—",
                description:  cells[5] ? String(cells[5]).trim() : "—",
                dueDate,
                completionDate: colK,
                frequency:    cells[7] ? String(cells[7]).trim() : "—",
                status,
                delayDays,
              })
            })
          } catch (err) {
            console.error(`Error fetching ${dept.sheet}:`, err)
          }
        })
      )

      setTasks(collected)
      setLastRefreshed(new Date())
    } catch (err) {
      setError("Failed to load data. Please refresh.")
    } finally {
      setLoading(false)
    }
  }, [todayMs])

  useEffect(() => { fetchAllData() }, [fetchAllData])

  // ── Summary stats (completed tasks are excluded from all counts) ───────────
  const stats = useMemo(() => {
    const pendingTasks = tasks.filter(t => t.status !== "completed")
    const total      = pendingTasks.length
    const overdue    = pendingTasks.filter(t => t.status === "overdue").length
    const todayCount = pendingTasks.filter(t => t.status === "today").length
    const thisWeek   = pendingTasks.filter(t => t.status === "today" || t.status === "this-week").length
    const pending    = pendingTasks.filter(t => t.status === "overdue" || t.status === "today" || t.status === "this-week").length
    const upcoming   = pendingTasks.filter(t => t.status === "this-week" || t.status === "upcoming").length
    return { total, pending, overdue, todayCount, thisWeek, upcoming }
  }, [tasks])

  // ── Filtered & sorted task list (completed never shown) ────────────────────
  const filteredTasks = useMemo(() => {
    // Base: always exclude completed tasks
    let result = tasks.filter(t => t.status !== "completed")

    // Apply active filter on top
    result = result.filter(t => {
      switch (activeFilter) {
        case "overdue":   return t.status === "overdue"
        case "today":     return t.status === "today"
        case "pending":   return t.status === "overdue" || t.status === "today" || t.status === "this-week"
        case "this-week": return t.status === "today" || t.status === "this-week"
        case "upcoming":  return t.status === "this-week" || t.status === "upcoming"
        default:          return true  // show all non-completed
      }
    })

    if (selectedDept !== "All") {
      result = result.filter(t => t.department === selectedDept)
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      result = result.filter(t =>
        t.assignedTo.toLowerCase().includes(q)  ||
        t.description.toLowerCase().includes(q) ||
        t.department.toLowerCase().includes(q)
      )
    }

    return [...result].sort((a, b) => {
      let cmp = 0
      if (sortField === "dueDate") {
        const da = parseDDMMYYYY(a.dueDate), db = parseDDMMYYYY(b.dueDate)
        if (!da && !db) cmp = 0
        else if (!da) cmp = 1
        else if (!db) cmp = -1
        else cmp = da - db
      } else if (sortField === "delayDays") {
        cmp = a.delayDays - b.delayDays
      } else if (sortField === "assignedTo") {
        cmp = a.assignedTo.localeCompare(b.assignedTo)
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [tasks, activeFilter, selectedDept, searchQuery, sortField, sortDir])

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("asc") }
  }

  // ── Status badge ────────────────────────────────────────────────────────────
  const StatusBadge = ({ status }) => {
    const cfg = {
      completed:  { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "✓ Completed" },
      overdue:    { cls: "bg-red-100 text-red-700 border-red-300 font-bold",   label: "⚠ Overdue" },
      today:      { cls: "bg-blue-100 text-blue-700 border-blue-200",          label: "● Due Today" },
      "this-week":{ cls: "bg-purple-100 text-purple-700 border-purple-200",    label: "↗ This Week" },
      upcoming:   { cls: "bg-slate-100 text-slate-500 border-slate-200",       label: "→ Upcoming" },
      pending:    { cls: "bg-amber-100 text-amber-700 border-amber-200",       label: "○ Pending" },
    }[status] ?? { cls: "bg-slate-100 text-slate-500 border-slate-200", label: status }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${cfg.cls}`}>
        {cfg.label}
      </span>
    )
  }

  // Sort indicator arrow
  const SortArrow = ({ field }) =>
    sortField === field
      ? sortDir === "asc"
        ? <ChevronUp className="h-3 w-3 inline ml-0.5" />
        : <ChevronDown className="h-3 w-3 inline ml-0.5" />
      : null

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl shadow-lg">
              <BarChart3 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">PC Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Cross-department employee task overview
                {lastRefreshed && (
                  <span className="ml-2 text-slate-400">
                    · Updated {lastRefreshed.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            ⚠ {error}
          </div>
        )}

        {/* ── Summary Cards (pending tasks only, completed excluded) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              label: "Total Pending",
              value: stats.total,
              sub: "All non-completed tasks",
              icon: ListTodo,
              iconCls: "bg-slate-100 text-slate-600",
              border: "border-slate-200",
              textCls: "text-slate-800",
              subCls: "text-slate-500",
              filter: null,
            },
            {
              label: "Overdue",
              value: stats.overdue,
              sub: "Need immediate attention!",
              icon: AlertTriangle,
              iconCls: "bg-red-200 text-red-600",
              border: "border-red-300",
              textCls: "text-red-700",
              subCls: "text-red-500",
              highlight: true,
              filter: "overdue",
            },
            {
              label: "Due Today",
              value: stats.todayCount,
              sub: "Must complete today",
              icon: Calendar,
              iconCls: "bg-blue-100 text-blue-600",
              border: "border-blue-200",
              textCls: "text-blue-700",
              subCls: "text-blue-500",
              filter: "today",
            },
            {
              label: "This Week",
              value: stats.thisWeek,
              sub: "Due within 7 days",
              icon: Clock,
              iconCls: "bg-purple-100 text-purple-600",
              border: "border-purple-200",
              textCls: "text-purple-700",
              subCls: "text-purple-500",
              filter: "this-week",
            },
            {
              label: "Upcoming",
              value: stats.upcoming,
              sub: "Scheduled ahead",
              icon: CheckCircle2,
              iconCls: "bg-indigo-100 text-indigo-600",
              border: "border-indigo-200",
              textCls: "text-indigo-700",
              subCls: "text-indigo-500",
              filter: "upcoming",
            },
          ].map(card => (
            <div
              key={card.label}
              onClick={() => card.filter && setActiveFilter(card.filter)}
              className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${card.border} ${
                card.highlight && stats.overdue > 0 ? "bg-gradient-to-br from-red-50 to-white" : ""
              } ${card.filter ? "cursor-pointer hover:shadow-md hover:scale-[1.02]" : ""} ${
                activeFilter === card.filter ? "ring-2 ring-offset-1 ring-current" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${card.iconCls}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <span className={`text-xs font-semibold uppercase tracking-wide ${card.subCls}`}>
                  {card.label}
                </span>
              </div>
              <p className={`text-3xl font-black ${card.textCls}`}>
                {loading ? "—" : card.value.toLocaleString()}
              </p>
              <p className={`text-xs mt-1 ${card.subCls}`}>{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Task Details ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="p-5 border-b border-slate-100 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Task Details</h2>
              <span className="ml-auto text-sm text-slate-400 font-medium">
                {loading ? "Loading…" : `${filteredTasks.length} tasks`}
              </span>
            </div>

            {/* Quick filter chips — actionable filters only, no completed */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: "overdue",   label: "🔴 Overdue",   count: stats.overdue,    color: "red",    desc: "Past due, not done" },
                { key: "today",     label: "📅 Today",      count: stats.todayCount, color: "blue",   desc: "Due today" },
                { key: "pending",   label: "⏳ Pending",    count: stats.pending,    color: "amber",  desc: "Overdue + today + this week" },
                { key: "this-week", label: "📆 This Week",  count: stats.thisWeek,   color: "purple", desc: "Due within 7 days" },
                { key: "upcoming",  label: "🗓 Upcoming",   count: stats.upcoming,   color: "indigo", desc: "Future tasks" },
              ].map(f => {
                const active = activeFilter === f.key
                const colorMap = {
                  red:    active ? "bg-red-600 text-white border-red-600 shadow-md shadow-red-100"         : "border-red-200 text-red-600 hover:border-red-400 hover:bg-red-50",
                  blue:   active ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100"      : "border-blue-200 text-blue-600 hover:border-blue-400 hover:bg-blue-50",
                  amber:  active ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-100"   : "border-amber-200 text-amber-600 hover:border-amber-400 hover:bg-amber-50",
                  purple: active ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-100": "border-purple-200 text-purple-600 hover:border-purple-400 hover:bg-purple-50",
                  indigo: active ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100": "border-indigo-200 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50",
                }
                return (
                  <button
                    key={f.key}
                    title={f.desc}
                    onClick={() => { setActiveFilter(f.key); setSearchQuery("") }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all ${colorMap[f.color]}`}
                  >
                    {f.label}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      active ? "bg-white/25 text-white" : "bg-white text-slate-600 border border-slate-200"
                    }`}>
                      {loading ? "…" : f.count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Search + dept filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search employee, task description, department…"
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-slate-50 focus:border-blue-400 focus:outline-none"
                >
                  <option value="All">All Departments</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <RefreshCw className="h-7 w-7 animate-spin" />
              <p className="text-sm">Fetching tasks from all {DEPARTMENTS.length} departments…</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <p className="text-slate-600 font-semibold">No tasks match this filter</p>
              <p className="text-sm text-slate-400">Try selecting a different filter or clearing the search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wide">
                    <th
                      className="text-left px-5 py-3 font-semibold text-slate-500 cursor-pointer hover:text-indigo-600 select-none"
                      onClick={() => handleSort("assignedTo")}
                    >
                      Employee <SortArrow field="assignedTo" />
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500">Dept</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500">Task Description</th>
                    <th
                      className="text-left px-4 py-3 font-semibold text-slate-500 cursor-pointer hover:text-indigo-600 select-none whitespace-nowrap"
                      onClick={() => handleSort("dueDate")}
                    >
                      Due Date <SortArrow field="dueDate" />
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500">Status</th>
                    <th
                      className="text-center px-4 py-3 font-semibold text-red-500 cursor-pointer hover:text-red-700 select-none whitespace-nowrap"
                      onClick={() => handleSort("delayDays")}
                    >
                      Delay <SortArrow field="delayDays" />
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500">Freq</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500">Given By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.slice(0, 150).map((task) => {
                    const isOverdue  = task.status === "overdue"
                    const isToday    = task.status === "today"
                    const rowBg = isOverdue
                      ? "bg-red-50/60 hover:bg-red-50"
                      : isToday
                      ? "bg-blue-50/40 hover:bg-blue-50"
                      : "hover:bg-slate-50/80"

                    return (
                      <tr key={task.id} className={`border-b border-slate-50 transition-colors ${rowBg}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isOverdue ? "bg-red-100 text-red-700" :
                              isToday   ? "bg-blue-100 text-blue-700" :
                                          "bg-indigo-100 text-indigo-700"
                            }`}>
                              {task.assignedTo.charAt(0).toUpperCase()}
                            </div>
                            <span className={`font-semibold ${isOverdue ? "text-red-800" : "text-slate-800"}`}>
                              {task.assignedTo}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-semibold">
                            {task.department}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 max-w-xs">
                          <span
                            title={task.description}
                            className={`line-clamp-2 ${
                              isOverdue ? "text-red-800 font-medium" :
                              isToday   ? "text-blue-900 font-medium" : "text-slate-700"
                            }`}
                          >
                            {task.description}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap">
                          <span className={isOverdue ? "text-red-700 font-bold" : "text-slate-600"}>
                            {task.dueDate || "—"}
                          </span>
                        </td>

                        <td className="text-center px-4 py-3.5">
                          <StatusBadge status={task.status} />
                        </td>

                        <td className="text-center px-4 py-3.5">
                          {task.delayDays > 0 ? (
                            <span className={`inline-flex items-center gap-0.5 font-bold text-xs px-2 py-0.5 rounded-full ${
                              task.delayDays > 7
                                ? "bg-red-200 text-red-800"
                                : "bg-orange-100 text-orange-700"
                            }`}>
                              +{task.delayDays}d
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="text-xs text-slate-500 capitalize">{task.frequency}</span>
                        </td>

                        <td className="px-4 py-3.5 text-xs text-slate-500">{task.givenBy}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Table footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4 text-xs text-slate-500 flex-wrap">
                <span>
                  Showing <strong>{Math.min(filteredTasks.length, 150)}</strong> of{" "}
                  <strong>{filteredTasks.length}</strong> pending tasks
                  {filteredTasks.length > 150 && (
                    <span className="ml-2 text-amber-600 font-semibold">
                      · Use department filter or search to narrow down
                    </span>
                  )}
                </span>
                {stats.overdue > 0 && (
                  <span className="flex items-center gap-1 text-red-600 font-semibold">
                    <AlertTriangle className="h-3 w-3" />
                    {stats.overdue} overdue task{stats.overdue > 1 ? "s" : ""} need immediate attention
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  )
}
