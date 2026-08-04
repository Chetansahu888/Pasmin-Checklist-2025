import React, { useState, useEffect, useMemo } from "react"
import { Search, Filter, ListTodo, AlertCircle, RefreshCw } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"

const CheckListMaster = () => {
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  
  // Filter states
  const [filterDepartment, setFilterDepartment] = useState("all")
  const [filterAssignedTo, setFilterAssignedTo] = useState("all")
  const [filterGivenBy, setFilterGivenBy] = useState("all")
  const [filterFrequency, setFilterFrequency] = useState("all")

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery])

  const getCellValue = (row, index) => {
    if (!row || !row.c || index >= row.c.length) return null
    const cell = row.c[index]
    return cell && 'v' in cell ? cell.v : null
  }

  const fetchMasterSheetColumnA = async () => {
    try {
      const response = await fetch(`https://docs.google.com/spreadsheets/d/1sn8_JWWODv3JM097Q1oIpVt0EhxRxEBi4sy7onV95tc/gviz/tq?tqx=out:json&sheet=MASTER`)
      if (!response.ok) throw new Error(`Failed to fetch master sheet`)
      
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

      return columnAValues
    } catch (error) {
      console.error("Error fetching master sheet data:", error)
      return []
    }
  }

  const fetchAllTasks = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const departments = await fetchMasterSheetColumnA()
      let sheetNames = departments.filter(opt => opt !== "Select Department" && opt !== "All Departments")
      
      if (!sheetNames.includes("REFRATECH")) {
        sheetNames.push("REFRATECH")
      }

      let combinedRows = []
      
      await Promise.all(sheetNames.map(async (sheetName) => {
        try {
          const response = await fetch(`https://docs.google.com/spreadsheets/d/1sn8_JWWODv3JM097Q1oIpVt0EhxRxEBi4sy7onV95tc/gviz/tq?tqx=out:json&sheet=${sheetName}`)
          
          if (!response.ok) return
          
          const text = await response.text()
          const jsonStart = text.indexOf('{')
          if (jsonStart === -1) return
          
          const jsonEnd = text.lastIndexOf('}')
          const jsonString = text.substring(jsonStart, jsonEnd + 1)
          const data = JSON.parse(jsonString)

          if (data.table && data.table.rows && data.table.rows.length > 1) {
            // Add sheetName to each row so we know where it came from
            const rowsWithSource = data.table.rows.slice(1).map(row => ({ ...row, _sourceSheet: sheetName }))
            combinedRows.push(...rowsWithSource)
          }
        } catch (e) {
          console.error(`Error processing sheet ${sheetName}:`, e)
        }
      }))

      // Prepare objects and parse IDs for sorting
      const allTaskObjects = []
      combinedRows.forEach((row) => {
        const taskIdRaw = getCellValue(row, 1)
        if (taskIdRaw === null || taskIdRaw === undefined || taskIdRaw === '' || (typeof taskIdRaw === 'string' && taskIdRaw.trim() === '')) {
          return
        }

        // Check if task is completed (Actual Date is present)
        // Usually index 10 for normal tasks, index 11 for delegation. We check both.
        const completionDate10 = getCellValue(row, 10)
        const completionDate11 = getCellValue(row, 11)
        const isCompleted = (completionDate10 && String(completionDate10).trim() !== '') || 
                            (row._sourceSheet === "DELEGATION" && completionDate11 && String(completionDate11).trim() !== '')
                            
        if (isCompleted) {
          return // Skip completed tasks
        }
        
        const taskIdStr = String(taskIdRaw).trim()
        const taskIdNum = parseInt(taskIdStr, 10) || 0
        const givenBy = getCellValue(row, 3) || 'Unknown'
        const assignedTo = getCellValue(row, 4) || 'Unassigned'
        let taskDescription = getCellValue(row, 5) || 'Untitled Task'
        taskDescription = taskDescription.trim()
        const frequency = getCellValue(row, 7) || 'one-time'
        
        allTaskObjects.push({
          id: taskIdStr,
          idNum: taskIdNum,
          title: taskDescription,
          givenBy,
          assignedTo,
          frequency,
          department: row._sourceSheet
        })
      })

      // Sort globally by Task ID (numeric ascending) to find the "first created task"
      allTaskObjects.sort((a, b) => a.idNum - b.idNum)

      const uniqueTasksMap = new Map()

      // Iterate sorted list and keep the first occurrence of each unique task (by Title + Assigned To)
      allTaskObjects.forEach((task) => {
        // Unique Sort: group by Task Title and Assigned To so duplicates are collapsed
        const uniqueKey = `${task.title.toLowerCase().trim()}_${task.assignedTo.toLowerCase().trim()}`
        if (!uniqueTasksMap.has(uniqueKey)) {
          uniqueTasksMap.set(uniqueKey, task)
        }
      })

      // Convert map to array and sort Z to A by Task ID (Descending)
      const uniqueTasksList = Array.from(uniqueTasksMap.values()).sort((a, b) => b.idNum - a.idNum)

      setTasks(uniqueTasksList)
    } catch (err) {
      setError("Failed to load tasks. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllTasks()
  }, [])

  // Derived filter options
  const filterOptions = useMemo(() => {
    const departments = new Set()
    const users = new Set()
    const givenBys = new Set()
    const frequencies = new Set()
    
    tasks.forEach(t => {
      if (t.department) departments.add(t.department.trim())
      if (t.assignedTo) users.add(t.assignedTo.trim())
      if (t.givenBy) givenBys.add(t.givenBy.trim())
      if (t.frequency) frequencies.add(t.frequency.trim())
    })
    
    return {
      departments: Array.from(departments).sort(),
      users: Array.from(users).sort(),
      givenBys: Array.from(givenBys).sort(),
      frequencies: Array.from(frequencies).sort()
    }
  }, [tasks])

  const filteredTasks = useMemo(() => {
    let result = tasks

    if (filterDepartment && filterDepartment !== "all") {
      result = result.filter(t => t.department?.trim().toLowerCase() === filterDepartment.trim().toLowerCase())
    }
    if (filterAssignedTo && filterAssignedTo !== "all") {
      result = result.filter(t => t.assignedTo?.trim().toLowerCase() === filterAssignedTo.trim().toLowerCase())
    }
    if (filterGivenBy && filterGivenBy !== "all") {
      result = result.filter(t => t.givenBy?.trim().toLowerCase() === filterGivenBy.trim().toLowerCase())
    }
    if (filterFrequency && filterFrequency !== "all") {
      result = result.filter(t => t.frequency?.trim().toLowerCase() === filterFrequency.trim().toLowerCase())
    }

    const query = debouncedSearchQuery.toLowerCase().trim()
    if (query) {
      result = result.filter(task => {
        return (
          task.title.toLowerCase().includes(query) ||
          task.id.toLowerCase().includes(query) ||
          task.assignedTo.toLowerCase().includes(query) ||
          task.givenBy.toLowerCase().includes(query) ||
          task.department.toLowerCase().includes(query)
        )
      })
    }
    
    return result
  }, [tasks, debouncedSearchQuery, filterDepartment, filterAssignedTo, filterGivenBy, filterFrequency])

  const getFrequencyColor = (frequency) => {
    const f = frequency.toLowerCase()
    switch (f) {
      case "one-time": return "bg-slate-100 text-slate-700"
      case "daily": return "bg-blue-100 text-blue-700"
      case "weekly": return "bg-purple-100 text-purple-700"
      case "fortnightly": return "bg-indigo-100 text-indigo-700"
      case "monthly": return "bg-orange-100 text-orange-700"
      case "quarterly": return "bg-amber-100 text-amber-700"
      case "yearly": return "bg-emerald-100 text-emerald-700"
      default: return "bg-slate-100 text-slate-700"
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Check List Master</h1>
            <p className="text-sm text-slate-500 mt-1">Active unique tasks across all departments</p>
          </div>
          <button 
            onClick={fetchAllTasks}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm font-medium text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            Refresh Data
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-4">
            
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tasks by ID, Title, User or Department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm"
                />
              </div>
              
              <div className="flex flex-wrap gap-3">
                <select 
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 shadow-sm"
                >
                  <option value="all">All Departments</option>
                  {filterOptions.departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                <select 
                  value={filterGivenBy}
                  onChange={(e) => setFilterGivenBy(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 shadow-sm"
                >
                  <option value="all">All Given By</option>
                  {filterOptions.givenBys.map(user => (
                    <option key={user} value={user}>{user}</option>
                  ))}
                </select>

                <select 
                  value={filterAssignedTo}
                  onChange={(e) => setFilterAssignedTo(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 shadow-sm"
                >
                  <option value="all">All Assigned To</option>
                  {filterOptions.users.map(user => (
                    <option key={user} value={user}>{user}</option>
                  ))}
                </select>

                <select 
                  value={filterFrequency}
                  onChange={(e) => setFilterFrequency(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 shadow-sm"
                >
                  <option value="all">All Frequencies</option>
                  {filterOptions.frequencies.map(freq => (
                    <option key={freq} value={freq}>{freq}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-500 font-medium text-sm">Loading and sorting unique tasks...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-rose-500">
                <AlertCircle className="h-10 w-10 mb-3" />
                <p className="font-medium">{error}</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <ListTodo className="h-10 w-10 mb-3 text-slate-300" />
                <p className="font-medium">No tasks found.</p>
                {(searchQuery || filterDepartment !== "all" || filterAssignedTo !== "all" || filterGivenBy !== "all" || filterFrequency !== "all") && (
                  <p className="text-sm mt-1">Try adjusting your search query or filters.</p>
                )}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Task ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Given By</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned To</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Frequency</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">{task.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-800 line-clamp-2 max-w-md">{task.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600">{task.givenBy}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {task.assignedTo.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{task.assignedTo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {task.department}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getFrequencyColor(task.frequency)}`}>
                          {task.frequency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {!isLoading && !error && filteredTasks.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center text-sm text-slate-500">
              <span>Showing <strong>{filteredTasks.length}</strong> unique tasks</span>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default CheckListMaster
