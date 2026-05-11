"use client"

import { useParams } from "react-router-dom"
import { Sparkles, FileText, AlertCircle } from "lucide-react"
import AdminLayout from "../../components/layout/AdminLayout.jsx"
import SalesDataPage from "./SalesDataPage.jsx"
import ServiceDataPage from "./service-data-page.jsx"
import JockeyDataPage from "./jockey-data-page.jsx"
import AccountDataPage from "./account-data-page.jsx"
import WarehouseDataPage from "./ware-house-data.jsx"
import RefratechDataPage from "./refratech-data-page.jsx"
import PurchaseDataPage from "./purchase-data-page.jsx"
import DirectorDataPage from "./director-data-page.jsx"
import ManagingDirector from "./managingDirector-data-page.jsx"
import AdminDataPage from "./admin-data-page.jsx"
import Coo from "./coo-data-page.jsx"

export default function DataPage() {
  const { category } = useParams()

  // Format the category name for display
  const formatCategoryName = (cat) => {
    if (cat === "coo") return "COO"
    return cat
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  // Render the appropriate component based on category
  switch (category) {
    case "main":
      return <AdminDataPage/>
    case "sales":
      return <SalesDataPage />
    // case "service":
    //   return <ServiceDataPage />
    // case "jockey":
    //   return <JockeyDataPage />
    case "account":
      return <AccountDataPage />
    case "warehouse":
      return <WarehouseDataPage />
    case "refratech":
      return <RefratechDataPage />
      case "purchase":
        return <PurchaseDataPage/>
        case "director":
        return <DirectorDataPage/>
        case "managing-director":
          return <ManagingDirector/>
    //       case "coo":
    //       return <Coo/>
    default:
      return (
        <AdminLayout>
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                {formatCategoryName(category)} Module
              </h1>
            </div>

            <div className="rounded-2xl border border-slate-200 shadow-xl bg-white overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 leading-none">System Module Info</h2>
                    <p className="text-sm text-slate-500 mt-1">Viewing management details for {formatCategoryName(category)}</p>
                  </div>
                </div>
              </div>
              <div className="p-12 text-center">
                <div className="mx-auto w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
                  <AlertCircle className="h-10 w-10 text-blue-500 opacity-50" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Module Under Construction</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  The {formatCategoryName(category).toLowerCase()} data module is currently being optimized for the new corporate system. Check back soon for full functionality.
                </p>
                <div className="mt-8 flex justify-center gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              </div>
            </div>
          </div>
        </AdminLayout>
      )
  }
}
