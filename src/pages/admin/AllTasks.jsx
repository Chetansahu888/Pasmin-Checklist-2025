import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Search, Filter, LogOut, CheckCircle2, ListTodo, Sparkles, FileText, Upload, Calendar, AlertCircle, ChevronDown } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout"

const AllTasks = () => {
  // Google Sheets configuration
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyRbhgAN0TfMUWOgZ1UPiOAsVyUrj7aDM0hOeybHvB-K7NniRVhwhH3foVs5l4u2N2z/exec"
  const SHEET_NAME = "DATA"
  const SHEET_ID = "1hlFNmLJ_qY7LMpN0pP-N3KWdf0_JRwFvfqWjjLyCDb8" // Your specific sheet ID

  const [tasks, setTasks] = useState([])
  const [tableHeaders, setTableHeaders] = useState([])
  const [selectedTasks, setSelectedTasks] = useState([])
  const [selectedFiles, setSelectedFiles] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState({ show: false, message: "", type: "" })
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterFrequency, setFilterFrequency] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editedTasks, setEditedTasks] = useState({})
  const [username, setUsername] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedColumnValues, setSelectedColumnValues] = useState({})
  
  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Pagination state
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreTasks, setHasMoreTasks] = useState(true)

  // Ref for infinite scroll
  const observerRef = useRef(null)
  const lastTaskElementRef = useCallback(node => {
    if (isLoading) return
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreTasks) {
        setCurrentPage(prevPage => prevPage + 1)
      }
    })
    
    if (node) observerRef.current.observe(node)
  }, [isLoading, hasMoreTasks])

  // Format a date string to dd/mm/yyyy
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) return dateString;
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  }
  
  // Parse a formatted date string back to yyyy-mm-dd format for submission
  const parseFormattedDate = (formattedDate) => {
    if (!formattedDate) return '';
    
    try {
      // Specific handling for dd/mm/yyyy format
      if (formattedDate.includes('/')) {
        const [day, month, year] = formattedDate.split('/');
        // Ensure day, month, and year are valid numbers
        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10);
        const yearNum = parseInt(year, 10);
        
        // Create date with these values (month is 0-indexed in JS Date)
        const date = new Date(yearNum, monthNum - 1, dayNum);
        
        // Format back to yyyy-mm-dd
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        
        return `${yyyy}-${mm}-${dd}`;
      }
      
      // Handle other potential date formats
      if (formattedDate.includes('T')) {
        return formattedDate.split('T')[0];
      }
      
      return formattedDate;
    } catch (error) {
      console.error("Error parsing date:", error);
      return formattedDate;
    }
  }

  // Check user credentials
  useEffect(() => {
    const storedUsername = sessionStorage.getItem('username')
    
    if (!storedUsername) {
      window.location.href = '/login'
      return
    }

    setUsername(storedUsername)
    setIsAdmin(storedUsername.toLowerCase() === 'admin')
  }, [])

  // Fetch tasks from Google Sheets
  useEffect(() => {
    if (!username) return;

    const fetchTasksFromGoogleSheets = async () => {
      try {
        setIsLoading(true)
        
        const formData = new FormData()
        formData.append('action', 'fetchTasks')
        formData.append('sheetId', SHEET_ID)
        formData.append('sheetName', SHEET_NAME)
  
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          body: formData
        })
  
        const data = await response.json()
        
        if (data && data.success) {
          const colEIndex = 4;  // Username column
          const colLIndex = 11; // Date column
          const colMIndex = 12; // Completion column
          
          const colEId = data.headers[colEIndex]?.id || 'colE';
          const colLId = data.headers[colLIndex]?.id || 'colL';
          const colMId = data.headers[colMIndex]?.id || 'colM';
          
          // Hardcoded specific date for consistent testing
          const today = new Date('2025-04-15');
          const formatDateString = (date) => {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          }
          
          const todayString = formatDateString(today);
          
          console.log("Debug - Target Date:", todayString);
          console.log("Debug - Current Username:", username);
          console.log("Debug - Is Admin:", isAdmin);

          const filteredTasks = data.tasks
            .filter(task => {
              // For admin, show all tasks, otherwise filter by username
              if (isAdmin) return true;
              
              // Check if username in column E matches
              const taskUsername = task[colEId] ? task[colEId].toString().trim().toLowerCase() : '';
              const currentUsername = username.trim().toLowerCase();
              
              console.log("Debug - Task Username:", taskUsername);
              console.log("Debug - Current Username:", currentUsername);
              
              return taskUsername === currentUsername;
            })
            .filter(task => {
              // Verify column L matches today's date exactly
              const taskDate = task[colLId] ? parseFormattedDate(task[colLId]) : '';
              
              console.log("Debug - Raw Task Date:", task[colLId]);
              console.log("Debug - Parsed Task Date:", taskDate);
              console.log("Debug - Today's Date:", todayString);
              
              const isValidDate = taskDate === todayString;
              
              // Ensure column L is not null/empty
              const hasColL = task[colLId] !== undefined && 
                             task[colLId] !== null && 
                             task[colLId].toString().trim() !== '';
                             
              // Ensure column M is empty
              const isColMEmpty = task[colMId] === undefined || 
                                 task[colMId] === null || 
                                 task[colMId].toString().trim() === '';
              
              console.log("Debug - Date Filtering:", {
                taskDate, 
                todayString, 
                isValidDate, 
                hasColL, 
                isColMEmpty
              });
              
              return hasColL && isValidDate && isColMEmpty;
            })
            .map(task => {
              const filteredTask = { 
                _id: task._id, 
                _rowIndex: task._rowIndex,
                [colLId]: task[colLId],
                [colMId]: task[colMId]
              }
              
              data.headers.forEach(header => {
                filteredTask[header.id] = task[header.id]
              })
              
              return filteredTask
            })
          
          console.log("Debug - Filtered Tasks:", filteredTasks);
          
          const visibleHeaders = data.headers.filter((header, index) => 
            index >= 1 && index <= 10
          )
          
          setTableHeaders(visibleHeaders)
          setTasks(filteredTasks)
          
          setCurrentPage(1)
          setHasMoreTasks(filteredTasks.length > pageSize)
          
          const initialEditedTasks = {}
          filteredTasks.forEach(task => {
            initialEditedTasks[task._id] = { ...task }
          })
          setEditedTasks(initialEditedTasks)
        } else {
          console.error("Error fetching tasks:", data?.error || "Unknown error")
          setError(data?.error || "Failed to load tasks")
        }
      } catch (error) {
        console.error("Error fetching tasks:", error)
        setError("Network error or failed to fetch tasks")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchTasksFromGoogleSheets()
  }, [username, isAdmin])

  // Optimized pagination and filtering logic using useMemo
  const filteredPaginatedTasks = useMemo(() => {
    // Pre-calculate header IDs for performance
    const statusHeaderId = tableHeaders.find(h => 
      h.label.toLowerCase().includes('status')
    )?.id

    const frequencyHeaderId = tableHeaders.find(h => 
      h.label.toLowerCase().includes('frequency')
    )?.id

    const searchLower = debouncedSearchQuery.trim().toLowerCase()

    return tasks
      .filter((task) => {
        if (filterStatus !== "all" && 
            statusHeaderId && 
            task[statusHeaderId]?.toString().toLowerCase() !== filterStatus) {
          return false
        }

        if (filterFrequency !== "all" && 
            frequencyHeaderId && 
            task[frequencyHeaderId]?.toString().toLowerCase() !== filterFrequency) {
          return false
        }

        if (searchLower) {
          return Object.values(task).some(value => 
            value && value.toString().toLowerCase().includes(searchLower)
          )
        }

        return true
      })
      .slice(0, currentPage * pageSize)
  }, [tasks, tableHeaders, filterStatus, filterFrequency, debouncedSearchQuery, currentPage, pageSize])

  // Toggle task selection
  const toggleTaskSelection = (taskId) => {
    setSelectedTasks((prev) => {
      const newSelectedTasks = prev.includes(taskId) 
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId];

      // Reset or initialize column O value when task is selected/deselected
      setSelectedColumnValues(prevValues => {
        const newValues = {...prevValues};
        if (newSelectedTasks.includes(taskId)) {
          newValues[taskId] = ''; // Initialize as empty when selected
        } else {
          delete newValues[taskId]; // Remove when deselected
        }
        return newValues;
      });

      return newSelectedTasks;
    });
  }

  // Handle column O input change
  const handleColumnOChange = (taskId, value) => {
    setSelectedColumnValues(prev => ({
      ...prev,
      [taskId]: value
    }));
  }


  // Toggle all tasks selection
  const toggleAllTasks = () => {
    if (selectedTasks.length === filteredPaginatedTasks.length) {
      setSelectedTasks([])
    } else {
      setSelectedTasks(filteredPaginatedTasks.map((task) => task._id))
    }
  }

  // Logout handler
  const handleLogout = () => {
    sessionStorage.removeItem('username')
    window.location.href = '/login'
  }

  // Show toast message
  const showToast = (message, type) => {
    setToast({ show: true, message, type })
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" })
    }, 3000)
  }

  // Handle task field editing
  const handleTaskEdit = (taskId, fieldId, value) => {
    setEditedTasks(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [fieldId]: value
      }
    }))
  }

  // Handle file selection
  const handleFileSelect = (taskId, event) => {
    const file = event.target.files[0]
    if (file) {
      setSelectedFiles(prev => ({
        ...prev,
        [taskId]: file
      }))
      showToast(`File selected for task: ${file.name}`, "success")
      
      // Automatically trigger upload
      uploadFile(taskId, file)
    }
  }

  // Upload file method
  const uploadFile = async (taskId, file) => {
    if (!file) {
      showToast("No file selected", "error")
      return
    }

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1]
        
        const formData = new FormData()
        formData.append('action', 'uploadFile')
        formData.append('sheetName', SHEET_NAME)
        formData.append('taskId', taskId)
        formData.append('fileName', file.name)
        formData.append('fileData', base64Data)
        formData.append('rowIndex', tasks.find(t => t._id === taskId)._rowIndex)
        formData.append('columnP', 'P')
        formData.append('folderUrl', 'https://drive.google.com/drive/u/0/folders/1TBpIcv5bbAsmlje7lpnPFpJRDY5nekTE')
        
        try {
          const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData
          })
          
          const result = await response.json()
          
          if (result.success) {
            showToast(`File uploaded successfully: ${file.name}`, "success")
          } else {
            throw new Error(result.error || "Failed to upload file")
          }
        } catch (err) {
          showToast("Failed to upload file", "error")
          console.error("Error uploading file:", err)
        }
      }
      
      reader.readAsDataURL(file)
    } catch (error) {
      showToast("An error occurred during file upload", "error")
      console.error("Error in upload process:", error)
    }
  }

  // Form submission handler
  const handleSubmit = async () => {
    if (selectedTasks.length === 0) {
      showToast("Please select at least one task", "error")
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare tasks to be updated
      const tasksToUpdate = selectedTasks.map(taskId => {
        const task = editedTasks[taskId]
        const updates = {}
        
        // Add all editable fields to updates with proper date formatting
        tableHeaders.forEach(header => {
          // Check if this is a date field
          if (header.label.toLowerCase().includes('date')) {
            // Ensure date is in yyyy-mm-dd format (no time component)
            const parsedDate = parseFormattedDate(task[header.id])
            updates[header.id] = parsedDate
          } else {
            updates[header.id] = task[header.id]
          }
        })
        
        // Add today's date to column M
        const today = new Date();
        const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        updates['colM'] = formattedToday;
        
        return {
          rowIndex: task._rowIndex,
          updates: updates
        }
      })

      // Create form data for batch update
      const formData = new FormData()
      formData.append('action', 'updateTasks')
      formData.append('sheetName', SHEET_NAME)
      formData.append('tasks', JSON.stringify(tasksToUpdate))

      // Make API call to update tasks
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        // Update local state
        setTasks(prevTasks => 
          prevTasks.map(task => 
            selectedTasks.includes(task._id) 
              ? { ...editedTasks[task._id] } 
              : task
          )
        )

        // Clear selected files for processed tasks
        const newSelectedFiles = { ...selectedFiles }
        selectedTasks.forEach(taskId => {
          delete newSelectedFiles[taskId]
        })
        setSelectedFiles(newSelectedFiles)

        // Reset selections
        setSelectedTasks([])

        showToast(`Successfully updated ${selectedTasks.length} tasks`, "success")
      } else {
        throw new Error(result.error || "Failed to update tasks")
      }
    } catch (error) {
      console.error("Error updating tasks:", error)
      showToast("An error occurred while updating tasks", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render loading state
  if (isLoading && currentPage === 1) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Render error state
  // Render error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto pb-8 space-y-8">
        {/* Enhanced Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <ListTodo className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                {isAdmin ? "Task Explorer" : "My Task Board"}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {isAdmin ? "Manage and monitor all system tasks" : `Welcome back, ${username}. Here are your tasks for today.`}
              </p>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedTasks.length === 0}
            className={`flex items-center gap-2 rounded-xl py-3 px-6 text-white font-semibold transition-all duration-300 shadow-md hover:shadow-lg ${isSubmitting || selectedTasks.length === 0
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              }`}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            <span>{isSubmitting ? "Processing..." : `Complete Selected (${selectedTasks.length})`}</span>
          </button>
        </div>

        {/* Enhanced Filter Bar */}
        <div className="rounded-2xl border border-slate-200 shadow-lg bg-white overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-slate-700 font-semibold mr-2">
              <Filter className="h-4 w-4 text-blue-600" />
              <span>Filters</span>
            </div>
            
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by description, name, or firm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="flex gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:border-blue-500 transition-all outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>

              <select
                value={filterFrequency}
                onChange={(e) => setFilterFrequency(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 focus:border-blue-500 transition-all outline-none"
              >
                <option value="all">All Frequencies</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Enhanced Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-5 text-left bg-slate-50">
                    <input
                      type="checkbox"
                      checked={selectedTasks.length === filteredPaginatedTasks.length && filteredPaginatedTasks.length > 0}
                      onChange={toggleAllTasks}
                      className="h-6 w-6 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                    />
                  </th>
                  {tableHeaders.map((header) => (
                    <th
                      key={header.id}
                      className="p-5 text-left text-[13px] font-black text-slate-600 uppercase tracking-widest bg-slate-50"
                    >
                      {header.label}
                    </th>
                  ))}
                  <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                    Remarks / Value
                  </th>
                  <th className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                    Evidence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPaginatedTasks.length > 0 ? (
                  filteredPaginatedTasks.map((task, index) => {
                    const isSelected = selectedTasks.includes(task._id);
                    return (
                      <tr
                        key={task._id}
                        ref={index === filteredPaginatedTasks.length - 1 ? lastTaskElementRef : null}
                        className={`group transition-all duration-200 hover:bg-blue-50/30 ${isSelected ? "bg-blue-50/50" : ""}`}
                      >
                        <td className="p-5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleTaskSelection(task._id)}
                            className="h-6 w-6 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                          />
                        </td>
                        {tableHeaders.map((header) => (
                          <td key={header.id} className="p-5 text-sm text-slate-700">
                            {header.label.toLowerCase().includes('date')
                              ? (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{formatDate(task[header.id])}</span>
                                </div>
                              )
                              : <span className="font-medium">{task[header.id] || '—'}</span>}
                          </td>
                        ))}
                        <td className="p-4">
                          {isSelected ? (
                            <div className="relative group/input">
                              <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                              <input
                                type="text"
                                value={selectedColumnValues[task._id] || ''}
                                onChange={(e) => handleColumnOChange(task._id, e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                                placeholder="Enter remarks..."
                              />
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Select to edit</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center">
                            <input
                              type="file"
                              id={`file-${task._id}`}
                              onChange={(e) => handleFileSelect(task._id, e)}
                              className="hidden"
                              accept="image/*"
                              disabled={!isSelected}
                            />
                            {selectedFiles[task._id] ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                  <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] text-slate-500 max-w-[80px] truncate">
                                  {selectedFiles[task._id].name}
                                </span>
                              </div>
                            ) : (
                              <label
                                htmlFor={`file-${task._id}`}
                                className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${isSelected
                                    ? "bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white cursor-pointer shadow-sm"
                                    : "bg-slate-50 text-slate-300 cursor-not-allowed"
                                  }`}
                                title="Upload Evidence"
                              >
                                <Upload className="h-5 w-5" />
                              </label>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={tableHeaders.length + 3} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-50 rounded-full">
                          <Search className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">
                          {searchQuery ? "No tasks found matching your search" : "No pending tasks for today"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Loading indicator for pagination */}
          {isLoading && (
            <div className="flex justify-center items-center py-8 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                <span className="text-sm font-medium text-slate-600">Loading more tasks...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl transition-all duration-500 flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5 ${toast.type === "success"
            ? "bg-white border-l-4 border-green-500 text-slate-800"
            : "bg-white border-l-4 border-red-500 text-slate-800"
          }`}>
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span className="font-semibold">{toast.message}</span>
        </div>
      )}
    </AdminLayout>
  )
}

export default AllTasks