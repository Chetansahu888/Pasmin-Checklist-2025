function doGet(e) {
  try {
    var params = e.parameter;
    
    if (params.sheet && params.action === 'fetch') {
      return fetchSheetData(params.sheet);
    } else if (params.sheet) {
      return fetchSheetData(params.sheet);
    }
    
    return ContentService.createTextOutput("Google Apps Script is running.")
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    console.error("Error in doGet:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function fetchSheetData(sheetName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    var range = sheet.getDataRange();
    var values = range.getValues();
    
    console.log("Fetching data from sheet: " + sheetName);
    console.log("Total rows found: " + values.length);
    
    // Define the column headers for the DELEGATION sheet
    var result = {
      table: {
        cols: [
          {label: "Timestamp", type: "string"},       // A
          {label: "Task ID", type: "string"},         // B
          {label: "Department", type: "string"},      // C
          {label: "Given By", type: "string"},        // D
          {label: "Name", type: "string"},            // E
          {label: "Task Description", type: "string"}, // F
          {label: "Task Start Date", type: "date"},   // G
          {label: "Column H", type: "string"},        // H
          {label: "Column I", type: "string"},        // I
          {label: "Column J", type: "string"},        // J
          {label: "Planned Date", type: "date"},      // K
          {label: "Column L", type: "string"},        // L
          {label: "Status", type: "string"},          // M
          {label: "Remarks", type: "string"},         // N
          {label: "Column O", type: "string"},        // O
          {label: "Column P", type: "string"},        // P
          {label: "Column Q", type: "string"},        // Q
          {label: "Column R", type: "string"},        // R
          {label: "Verification Date", type: "date"}, // S
          {label: "Verification Remarks", type: "string"} // T
        ],
        rows: values.map(function(row, index) {
          if (index < 5) {
            console.log("Row " + index + " data:", JSON.stringify(row));
          }
          
          return {
            c: row.map(function(cell) {
              return {v: cell};
            })
          };
        })
      }
    };
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error("Error fetching sheet data:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    console.log("Received POST request with parameters:", JSON.stringify(e.parameter));
    var params = e.parameter;
    
    // Handle re-verification data update
    if (params.action === 'updateReverificationData') {
      return updateReverificationData(params);
    }
    
    if (params.action === 'uploadFile') {
      var base64Data = params.base64Data;
      var fileName = params.fileName;
      var mimeType = params.mimeType;
      var folderId = params.folderId;
      
      if (!base64Data || !fileName || !mimeType || !folderId) {
        throw new Error("Missing required parameters for file upload");
      }
      
      var fileUrl = uploadFileToDrive(base64Data, fileName, mimeType, folderId);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileUrl: fileUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (params.action === 'updateTaskData') {
      return updateTaskData(params);
    }
    
    if (params.action === 'updateSalesData') {
      return updateSalesData(params);
    }
    
    var sheetName = params.sheetName;
    var action = params.action || 'insert';
    if (action === 'add') action = 'insert';
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    if (action === 'insert') {
      var rowData;
      try {
        rowData = JSON.parse(params.rowData);
        console.log("Parsed row data:", JSON.stringify(rowData));
      } catch (parseError) {
        console.error("Error parsing rowData:", parseError);
        throw new Error("Invalid rowData format: " + parseError.message);
      }
      
      if (params.batchInsert === 'true' && Array.isArray(rowData)) {
        console.log("Processing batch insert for " + rowData.length + " tasks");
        
        var dataToInsert = rowData.map(task => [
          task.timestamp,
          task.taskId,
          task.firm,
          task.givenBy,
          task.name,
          task.description,
          task.startDate,
          task.freq,
          task.enableReminders,
          task.requireAttachment
        ]);
        
        console.log("Prepared data for batch insertion:", JSON.stringify(dataToInsert));
        
        var lastRow = sheet.getLastRow();
        if (dataToInsert.length > 0) {
          sheet.getRange(lastRow + 1, 1, dataToInsert.length, dataToInsert[0].length)
               .setValues(dataToInsert);
          
          console.log("Successfully inserted " + dataToInsert.length + " rows starting at row " + (lastRow + 1));
        }
        
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true,
          message: "Batch insert completed successfully",
          rowsInserted: dataToInsert.length,
          totalRows: sheet.getLastRow()
        })).setMimeType(ContentService.MimeType.JSON);
      } else {
        console.log("Processing single row insert");
        
        if (!Array.isArray(rowData) || rowData.length === 0) {
          throw new Error("Invalid or empty row data array");
        }
        
        sheet.appendRow(rowData);
        return ContentService.createTextOutput(JSON.stringify({ 
          success: true,
          message: "Single row added successfully",
          rowCount: sheet.getLastRow()
        })).setMimeType(ContentService.MimeType.JSON);
      }
    } 
    else if (action === 'update') {
      var rowIndex = parseInt(params.rowIndex);
      var rowData = JSON.parse(params.rowData);
      
      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index for update: " + rowIndex);
      }
      
      for (var i = 0; i < rowData.length; i++) {
        if (rowData[i] !== '') {
          sheet.getRange(rowIndex, i + 1).setValue(rowData[i]);
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: true,
        message: "Row updated successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    } 
    else {
      throw new Error("Unknown action: " + action);
    }
  } catch (error) {
    console.error("Error in doPost:", error.message, error.stack);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: "Failed to process request: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// NEW FUNCTION: Handle re-verification data updates
function updateReverificationData(params) {
  try {
    var sheetName = params.sheetName;
    var rowDataArray = JSON.parse(params.rowData);
    
    console.log("Processing re-verification data update for sheet:", sheetName);
    console.log("Row data array:", JSON.stringify(rowDataArray));
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    var updateResults = [];
    
    rowDataArray.forEach(function(taskData, index) {
      console.log("Processing re-verification task " + (index + 1) + ":", JSON.stringify(taskData));
      
      var rowIndex = parseInt(taskData.rowIndex);
      
      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index: " + taskData.rowIndex + " (must be >= 2)");
      }
      
      // Verify Task ID matches
      var currentTaskId = sheet.getRange(rowIndex, 2).getValue(); // Column B
      console.log("Verifying Task ID at row " + rowIndex + ", Column B:");
      console.log("  Current Task ID: '" + currentTaskId + "'");
      console.log("  Expected Task ID: '" + taskData.taskId + "'");
      
      if (currentTaskId.toString().trim() !== taskData.taskId.toString().trim()) {
        console.error("TASK ID MISMATCH DETECTED!");
        var correctRow = findRowByTaskId(sheet, taskData.taskId);
        if (correctRow > 0) {
          console.log("Found correct row for Task ID " + taskData.taskId + " at row " + correctRow);
          rowIndex = correctRow;
        } else {
          throw new Error("Task ID mismatch and could not find correct row for Task ID: " + taskData.taskId);
        }
      } else {
        console.log("Task ID verification successful - proceeding with re-verification update");
      }
      
      var rowUpdates = {
        rowIndex: rowIndex,
        taskId: taskData.taskId,
        updates: []
      };
      
      // Update Column S (Verification Date)
      if (taskData.verificationDate) {
        console.log("Updating Column S (Verification Date) at row " + rowIndex + " with: " + taskData.verificationDate);
        var verificationDateCell = sheet.getRange(rowIndex, 19); // Column S
        verificationDateCell.setValue(taskData.verificationDate);
        verificationDateCell.setNumberFormat('dd/mm/yyyy');
        rowUpdates.updates.push("Column S (Verification Date): " + taskData.verificationDate);
      }
      
      // Update Column T (Remarks)
      if (taskData.remarks) {
        console.log("Updating Column T (Remarks) at row " + rowIndex + " with: " + taskData.remarks);
        sheet.getRange(rowIndex, 20).setValue(taskData.remarks); // Column T
        rowUpdates.updates.push("Column T (Remarks): " + taskData.remarks);
      }
      
      updateResults.push(rowUpdates);
      console.log("Successfully updated re-verification data for row " + rowIndex + " for Task ID " + taskData.taskId);
    });
    
    console.log("Re-verification data update completed successfully");
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Re-verification data updated successfully",
      updatedRows: rowDataArray.length,
      updateDetails: updateResults
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error("Error updating re-verification data:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: "Failed to update re-verification data: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateTaskData(params) {
  try {
    var sheetName = params.sheetName;
    var rowDataArray = JSON.parse(params.rowData);
    
    console.log("Processing task data update for sheet:", sheetName);
    console.log("Row data array:", JSON.stringify(rowDataArray));
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    var updateResults = [];
    
    rowDataArray.forEach(function(taskData, index) {
      console.log("Processing task " + (index + 1) + ":", JSON.stringify(taskData));
      
      var rowIndex = parseInt(taskData.rowIndex);
      
      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index: " + taskData.rowIndex + " (must be >= 2)");
      }
      
      var currentTaskId = sheet.getRange(rowIndex, 2).getValue();
      console.log("Verifying Task ID at row " + rowIndex + ", Column B:");
      console.log("  Current Task ID: '" + currentTaskId + "'");
      console.log("  Expected Task ID: '" + taskData.taskId + "'");
      
      if (currentTaskId.toString().trim() !== taskData.taskId.toString().trim()) {
        console.error("TASK ID MISMATCH DETECTED!");
        var correctRow = findRowByTaskId(sheet, taskData.taskId);
        if (correctRow > 0) {
          console.log("Found correct row for Task ID " + taskData.taskId + " at row " + correctRow);
          rowIndex = correctRow;
        } else {
          throw new Error("Task ID mismatch and could not find correct row for Task ID: " + taskData.taskId);
        }
      } else {
        console.log("Task ID verification successful - proceeding with update");
      }
      
      var rowUpdates = {
        rowIndex: rowIndex,
        taskId: taskData.taskId,
        updates: []
      };
      
      if (taskData.actualDate) {
        console.log("Updating Column K (Actual) at row " + rowIndex + " with: " + taskData.actualDate);
        var actualCell = sheet.getRange(rowIndex, 11);
        actualCell.setValue(taskData.actualDate);
        actualCell.setNumberFormat('dd/mm/yyyy');
        rowUpdates.updates.push("Column K (Actual): " + taskData.actualDate);
      }
      
      if (taskData.status) {
        console.log("Updating Column M (Status) at row " + rowIndex + " with: " + taskData.status);
        sheet.getRange(rowIndex, 13).setValue(taskData.status);
        rowUpdates.updates.push("Column M (Status): " + taskData.status);
      }
      
      if (taskData.remarks) {
        console.log("Updating Column N (Remarks) at row " + rowIndex + " with: " + taskData.remarks);
        sheet.getRange(rowIndex, 14).setValue(taskData.remarks);
        rowUpdates.updates.push("Column N (Remarks): " + taskData.remarks);
      }
      
      if (taskData.imageUrl) {
        console.log("Updating Column O (Image) at row " + rowIndex + " with: " + taskData.imageUrl);
        sheet.getRange(rowIndex, 15).setValue(taskData.imageUrl);
        rowUpdates.updates.push("Column O (Image): " + taskData.imageUrl);
      }
      
      updateResults.push(rowUpdates);
      console.log("Successfully updated row " + rowIndex + " for Task ID " + taskData.taskId);
    });
    
    console.log("Task data update completed successfully");
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Task data updated successfully",
      updatedRows: rowDataArray.length,
      updateDetails: updateResults
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error("Error updating task data:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: "Failed to update task data: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateSalesData(params) {
  try {
    var sheetName = params.sheetName;
    var rowDataArray = JSON.parse(params.rowData);
    
    console.log("Processing sales data update (marking as done) for sheet:", sheetName);
    console.log("Row data array:", JSON.stringify(rowDataArray));
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error("Sheet not found: " + sheetName);
    }
    
    var updateResults = [];
    
    rowDataArray.forEach(function(taskData, index) {
      console.log("Processing history task " + (index + 1) + " for marking as done:", JSON.stringify(taskData));
      
      var rowIndex = parseInt(taskData.rowIndex);
      
      if (isNaN(rowIndex) || rowIndex < 2) {
        throw new Error("Invalid row index: " + taskData.rowIndex);
      }
      
      var currentTaskId = sheet.getRange(rowIndex, 2).getValue();
      console.log("Verifying Task ID for history item at row " + rowIndex + ":");
      console.log("  Current Task ID: '" + currentTaskId + "'");
      console.log("  Expected Task ID: '" + taskData.taskId + "'");
      
      if (currentTaskId.toString().trim() !== taskData.taskId.toString().trim()) {
        var correctRow = findRowByTaskId(sheet, taskData.taskId);
        if (correctRow > 0) {
          console.log("Found correct row for Task ID " + taskData.taskId + " at row " + correctRow);
          rowIndex = correctRow;
        } else {
          throw new Error("Task ID mismatch for: " + taskData.taskId);
        }
      }
      
      if (taskData.doneStatus) {
        console.log("Marking Task ID " + taskData.taskId + " as " + taskData.doneStatus + " at row " + rowIndex);
        sheet.getRange(rowIndex, 13).setValue(taskData.doneStatus);
      }
      
      updateResults.push({
        rowIndex: rowIndex,
        taskId: taskData.taskId,
        status: taskData.doneStatus
      });
    });
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Sales data updated successfully",
      updatedRows: rowDataArray.length,
      updateDetails: updateResults
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error("Error updating sales data:", error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      message: "Failed to update sales data: " + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function findRowByTaskId(sheet, taskId) {
  try {
    var lastRow = sheet.getLastRow();
    console.log("Searching for Task ID '" + taskId + "' in " + lastRow + " rows");
    
    for (var i = 2; i <= lastRow; i++) {
      var cellValue = sheet.getRange(i, 2).getValue();
      if (cellValue && cellValue.toString().trim() === taskId.toString().trim()) {
        console.log("Found Task ID '" + taskId + "' at row " + i);
        return i;
      }
    }
    
    console.log("Task ID '" + taskId + "' not found in any row");
    return -1;
  } catch (error) {
    console.error("Error searching for Task ID:", error);
    return -1;
  }
}

function uploadFileToDrive(base64Data, fileName, mimeType, folderId) {
  try {
    console.log("Uploading file to Google Drive:");
    console.log("  File name: " + fileName);
    console.log("  MIME type: " + mimeType);
    console.log("  Folder ID: " + folderId);
    
    let fileData = base64Data;
    if (base64Data.indexOf('base64,') !== -1) {
      fileData = base64Data.split('base64,')[1];
    }
    
    const decoded = Utilities.base64Decode(fileData);
    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const folder = DriveApp.getFolderById(folderId);
    const file = folder.createFile(blob);
    
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    var fileUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
    console.log("File uploaded successfully. URL: " + fileUrl);
    
    return fileUrl;
  } catch (error) {
    console.error("Error uploading file: " + error.toString());
    return null;
  }
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

function doOptions(e) {
  var response = ContentService.createTextOutput('');
  return setCorsHeaders(response);
}
