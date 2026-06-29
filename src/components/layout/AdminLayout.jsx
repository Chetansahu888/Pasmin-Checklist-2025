"use client"

import { useState, useEffect, useMemo } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { CheckSquare, ClipboardList, Home, LogOut, Menu, Database, ChevronDown, ChevronRight, Video, KeyRound, BarChart3 } from 'lucide-react'

export default function AdminLayout({ children, darkMode, toggleDarkMode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDataSubmenuOpen, setIsDataSubmenuOpen] = useState(false)
  const [username, setUsername] = useState("")
  const [userRole, setUserRole] = useState("")

  // Check authentication on component mount
  useEffect(() => {
    const storedUsername = sessionStorage.getItem('username')
    const storedRole = sessionStorage.getItem('role')
    
    if (!storedUsername) {
      // Redirect to login if not authenticated
      navigate("/login")
      return
    }
  
    setUsername(storedUsername)
    setUserRole(storedRole || "user")
  }, [navigate])

  // Handle logout
  const handleLogout = () => {
    sessionStorage.removeItem('username')
    sessionStorage.removeItem('role')
    sessionStorage.removeItem('department')
    navigate("/login")
  }

  const dataCategories = []

  // Determine which departments to show in the submenu
  // const getAccessibleDepartments = () => {
  //   if (userRole === "admin") {
  //     // Admin sees all departments
  //     return dataCategories
  //   } else {
  //     // Regular users see only their own department plus admin (if needed)
  //     return dataCategories.filter(cat => 
  //       cat.id === username || 
  //       cat.id.toLowerCase() === username.toLowerCase()
  //     )
  //   }
  // }

  // Update the routes array based on user role
  const routes = [
    {
      href: "/dashboard/admin",
      label: "Dashboard",
      icon: Database,
      active: location.pathname === "/dashboard/admin",
      showFor: ["admin", "user"] // Show for both roles
    },
    {
      href: "/dashboard/assign-task",
      label: "Assign Task",
      icon: CheckSquare,
      active: location.pathname === "/dashboard/assign-task",
      showFor: ["admin"]
    },
    {
      href: "/dashboard/pc-dashboard",
      label: "PC Dashboard",
      icon: BarChart3,
      active: location.pathname === "/dashboard/pc-dashboard",
      showFor: ["admin"]
    },
    {
      href: "/dashboard/delegation",
     label: "Delegation",
     icon: ClipboardList,
     active: location.pathname === "/dashboard/delegation",
     showFor: ["admin", "user"] // Only show for admin
   },
   {
      href: "/dashboard/re-verification",
     label: "Verification",
     icon: ClipboardList,
     active: location.pathname === "/dashboard/re-verification",
     showFor: ["admin"]
   },
   {
      href: "/dashboard/companies",
      label: "Companies",
      icon: Database,
      active: location.pathname === "/dashboard/companies",
      showFor: ["admin", "user"]
   },
    {
      href: "/dashboard/license",
      label: "License",
      icon: KeyRound,
      active: location.pathname === "/dashboard/license",
      showFor: ["admin", "user"] // Show for both role

    },
    {
      href: "/dashboard/LearningVideo",
      label: "Training Video",
      icon: Video,
      active: location.pathname === "/dashboard/LearningVideo",
      showFor: ["admin", "user"] // Show for both roles
      },

  ]

  // Memoized accessible departments and routes to optimize performance
  const accessibleDepartments = useMemo(() => {
    return dataCategories.filter(cat => 
      !cat.showFor || cat.showFor.includes(userRole)
    )
  }, [userRole])

  const accessibleRoutes = useMemo(() => {
    let baseRoutes = routes.filter(route => 
      route.showFor.includes(userRole)
    )
    
    const departmentRoutes = accessibleDepartments.map(dept => ({
      href: dept.link || `/dashboard/data/${dept.id}`,
      label: dept.name,
      icon: Database,
      active: location.pathname === (dept.link || `/dashboard/data/${dept.id}`),
      showFor: ["admin", "user"]
    }))

    const finalRoutes = []
    baseRoutes.forEach(route => {
      if (route.label === "Data") {
        finalRoutes.push(...departmentRoutes)
      } else {
        finalRoutes.push(route)
      }
    })

    return finalRoutes
  }, [userRole, accessibleDepartments, location.pathname])

  return (
    <div className={`flex h-screen overflow-hidden bg-slate-50`}>
      {/* Sidebar for desktop */}
      <aside className="hidden w-72 flex-shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col shadow-xl">
        <div className="flex h-16 items-center border-b border-slate-200 px-5 bg-slate-50">
          <Link to="/dashboard/admin" className="flex items-center gap-3 font-bold text-blue-700">
            <ClipboardList className="h-6 w-6 text-blue-600" />
            <span className="text-lg tracking-tight">Checklist & Delegation</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1.5">
            {accessibleRoutes.map((route) => (
              <li key={route.label}>
                <Link
                  to={route.href}
                  className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-semibold transition-all duration-200 ${
                    route.active
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  <route.icon className={`h-5 w-5 ${route.active ? "text-white" : "text-slate-400 group-hover:text-blue-600"}`} />
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-slate-200 p-5 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg">
                <span className="text-base font-bold text-white">{username ? username.charAt(0).toUpperCase() : 'U'}</span>
              </div>
              <div>
                <p className="text-[15px] font-bold text-slate-800 leading-tight">
                  {username || "User"}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {userRole === "admin" ? "Super Admin" : "Team Member"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {toggleDarkMode && (
                <button 
                  onClick={toggleDarkMode} 
                  className="text-blue-700 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100"
                >
                  {darkMode ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  <span className="sr-only">{darkMode ? "Light mode" : "Dark mode"}</span>
                </button>
              )}
              <button 
                onClick={handleLogout}
                className="text-blue-700 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Log out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden absolute left-4 top-3 z-50 text-blue-700 p-2 rounded-md hover:bg-blue-100"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </button>

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-2xl">
            <div className="flex h-14 items-center border-b border-slate-200 px-4 bg-slate-50">
              <Link
                to="/dashboard/admin"
                className="flex items-center gap-3 font-bold text-blue-700"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ClipboardList className="h-6 w-6 text-blue-600" />
                <span className="text-lg">Checklist & Delegation</span>
              </Link>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 bg-white">
              <ul className="space-y-1.5">
                {accessibleRoutes.map((route) => (
                  <li key={route.label}>
                    <Link
                      to={route.href}
                      className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-semibold transition-all ${
                        route.active
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                          : "text-slate-700 hover:bg-blue-50"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <route.icon className={`h-5 w-5 ${route.active ? "text-white" : "text-slate-400"}`} />
                      {route.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="border-t border-slate-200 p-5 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                    <span className="text-base font-bold text-white">{username ? username.charAt(0).toUpperCase() : 'U'}</span>
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-slate-800 leading-tight">
                      {username || "User"}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      {userRole === "admin" ? "Super Admin" : "Team Member"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {toggleDarkMode && (
                    <button 
                      onClick={toggleDarkMode} 
                      className="text-blue-700 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100"
                    >
                      {darkMode ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646A9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      )}
                      <span className="sr-only">{darkMode ? "Light mode" : "Dark mode"}</span>
                    </button>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="text-blue-700 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 "
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Log out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-blue-200 bg-white px-4 md:px-6">
          <div className="flex md:hidden w-8"></div>
          <h1 className="text-lg font-semibold text-blue-700">Checklist & Delegation</h1>
          <div className="w-8"></div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-br from-blue-50 to-purple-50">
          {children}
          <div className="fixed md:left-72 left-0 right-0 bottom-0 py-1 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center text-sm shadow-md z-10">
          <a
    href="https://www.botivate.in/" // Replace with actual URL
    target="_blank"
    rel="noopener noreferrer"
    className="hover:underline"
  >
    Powered by-<span className="font-semibold">Botivate</span>
  </a>
    </div>
        </main>
      </div>
      
    </div>
  )
}