// Google Apps Script — Deploy as Web App (Anyone can access)
// Paste this in script.google.com, then Deploy > New Deployment > Web App

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // Add headers if first time
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Type', 'Message']);
  }

  try {
    const data = JSON.parse(e.postData.contents);
    sheet.appendRow([data.timestamp || new Date().toISOString(), data.type, data.text]);
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
