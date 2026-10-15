import * as XLSX from 'xlsx';

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  iconLink?: string;
  modifiedTime?: string;
  size?: string;
}

const MIME_FOLDER = 'application/vnd.google-apps.folder';
const MIME_SHEET = 'application/vnd.google-apps.spreadsheet';
const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MIME_XLS = 'application/vnd.ms-excel';
const MIME_CSV = 'text/csv';

export async function fetchDriveItems(
  accessToken: string,
  folderId: string = 'root'
): Promise<{ items: DriveItem[]; folderName: string }> {
  let folderName = folderId === 'root' ? 'My Drive' : 'Folder';

  if (folderId !== 'root') {
    try {
      const folderRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${folderId}?fields=name`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (folderRes.ok) {
        const folderData = await folderRes.json();
        folderName = folderData.name || 'Folder';
      }
    } catch {
      // ignore
    }
  }

  // Query files inside folder that are either folders or excel/spreadsheet/csv files
  const query = `'${folderId}' in parents and trashed = false and (mimeType = '${MIME_FOLDER}' or mimeType = '${MIME_SHEET}' or mimeType = '${MIME_XLSX}' or mimeType = '${MIME_XLS}' or mimeType = '${MIME_CSV}' or name contains '.xlsx' or name contains '.xls' or name contains '.csv')`;

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,iconLink,modifiedTime,size)&orderBy=folder,name&pageSize=100`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return { items: data.files || [], folderName };
}

export async function loadSpreadsheetFromDrive(
  accessToken: string,
  fileId: string,
  mimeType: string
): Promise<{ workbook: XLSX.WorkBook; defaultSheet: string; sheetNames: string[] }> {
  // If Google Sheet, export as XLSX
  if (mimeType === MIME_SHEET) {
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`;
    const res = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Failed to export Google Sheet (${res.status})`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    return {
      workbook,
      sheetNames: workbook.SheetNames,
      defaultSheet: workbook.SheetNames[0],
    };
  }

  // Standard Excel/CSV file binary download
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to download file from Google Drive (${res.status})`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  return {
    workbook,
    sheetNames: workbook.SheetNames,
    defaultSheet: workbook.SheetNames[0],
  };
}
