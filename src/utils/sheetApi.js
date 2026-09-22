// Centralized Google Sheets Data Fetch Utility
export const SPREADSHEET_ID = "1sn8_JWWODv3JM097Q1oIpVt0EhxRxEBi4sy7onV95tc"
export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzxy5T34g3xcteQg6CT5sLNSCYsU8gXqxGBN3vnz2gWI5MxO8pb_fuw_k_FT5kx06hG/exec"

/**
 * Fetch sheet data using Google Visualization (GViz) API for lightning-fast (0.2s) response.
 * If GViz fails, automatically falls back to Apps Script Web App.
 *
 * @param {string} sheetName - The tab name in the spreadsheet
 * @returns {Promise<{ rows: Array, isGviz: boolean, table: Object }>}
 */
export async function fetchSheetDataFast(sheetName) {
  // 1. Try Google Sheets GViz API first (superfast ~200-400ms, Google CDN cached)
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
    const response = await fetch(gvizUrl)

    if (response.ok) {
      const text = await response.text()
      const jsonStart = text.indexOf("{")
      const jsonEnd = text.lastIndexOf("}")

      if (jsonStart !== -1 && jsonEnd !== -1) {
        const json = JSON.parse(text.substring(jsonStart, jsonEnd + 1))
        if (json && json.table && Array.isArray(json.table.rows)) {
          return {
            rows: json.table.rows,
            isGviz: true,
            table: json.table,
          }
        }
      }
    }
  } catch (gvizError) {
    console.warn(`[sheetApi] GViz fetch failed for sheet "${sheetName}", falling back to Apps Script:`, gvizError)
  }

  // 2. Fallback to Apps Script if GViz is unreachable
  try {
    const scriptUrl = `${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(sheetName)}&action=fetch`
    const response = await fetch(scriptUrl)

    if (!response.ok) {
      throw new Error(`Apps Script responded with status: ${response.status}`)
    }

    const text = await response.text()
    let data

    try {
      data = JSON.parse(text)
    } catch {
      const jsonStart = text.indexOf("{")
      const jsonEnd = text.lastIndexOf("}")
      if (jsonStart !== -1 && jsonEnd !== -1) {
        data = JSON.parse(text.substring(jsonStart, jsonEnd + 1))
      } else {
        throw new Error("Invalid JSON response from Apps Script")
      }
    }

    let rows = []
    if (data.table && data.table.rows) {
      rows = data.table.rows
    } else if (Array.isArray(data)) {
      rows = data
    } else if (data.values) {
      rows = data.values.map((row) => ({ c: row.map((val) => ({ v: val })) }))
    }

    return {
      rows,
      isGviz: false,
      table: data.table || null,
    }
  } catch (scriptError) {
    console.error(`[sheetApi] Both GViz and Apps Script failed for sheet "${sheetName}":`, scriptError)
    throw new Error(`Failed to load sheet data: ${scriptError.message}`)
  }
}
