import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileSpreadsheet,
  ArrowLeft,
  RefreshCw,
  Search,
  ExternalLink,
  Lock,
  ChevronRight,
  HardDrive
} from 'lucide-react';
import { DriveItem, fetchDriveItems, loadSpreadsheetFromDrive } from '../lib/driveApi';
import { googleSignIn, googleSignOut, getAccessToken } from '../lib/googleAuth';
import { parseExcelWorkbook, ParsedDataset } from '../lib/excelParser';

interface GoogleDrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDataset: (dataset: ParsedDataset) => void;
  user: any;
  accessToken: string | null;
  onAuthChange: (token: string | null, user: any) => void;
}

export const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectDataset,
  user,
  accessToken,
  onAuthChange,
}) => {
  const [folderHistory, setFolderHistory] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'My Drive' },
  ]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const currentFolder = folderHistory[folderHistory.length - 1];

  const loadFolder = async (folderId: string, token: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDriveItems(token, folderId);
      setItems(result.items);
    } catch (err: any) {
      console.error('Error fetching drive items:', err);
      if (err.message && err.message.includes('401')) {
        setError('Google Drive session expired. Please sign in again.');
        onAuthChange(null, null);
      } else {
        setError(err.message || 'Could not load Google Drive items.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      loadFolder(currentFolder.id, accessToken);
    }
  }, [isOpen, accessToken, currentFolder.id]);

  const handleSignIn = async () => {
    setError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthChange(res.accessToken, res.user);
        loadFolder('root', res.accessToken);
        setFolderHistory([{ id: 'root', name: 'My Drive' }]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    }
  };

  const handleOpenFolder = (item: DriveItem) => {
    setFolderHistory((prev) => [...prev, { id: item.id, name: item.name }]);
  };

  const handleGoBack = () => {
    if (folderHistory.length > 1) {
      setFolderHistory((prev) => prev.slice(0, -1));
    }
  };

  const handleSelectFile = async (item: DriveItem) => {
    if (!accessToken) return;
    setLoadingFile(item.id);
    setError(null);
    try {
      const { workbook, defaultSheet } = await loadSpreadsheetFromDrive(
        accessToken,
        item.id,
        item.mimeType
      );
      const dataset = parseExcelWorkbook(workbook, item.name, defaultSheet);
      onSelectDataset(dataset);
      onClose();
    } catch (err: any) {
      console.error('Failed to read spreadsheet from Drive:', err);
      setError(`Failed to read file "${item.name}": ${err.message}`);
    } finally {
      setLoadingFile(null);
    }
  };

  if (!isOpen) return null;

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F2248]/10 flex items-center justify-center text-[#0F2248] font-semibold shadow-xs">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Select Dataset from Google Drive</h2>
              <p className="text-xs text-slate-500">
                Browse Google Sheets, Excel files (.xlsx, .xls) and CSV datasets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg p-2 transition text-sm font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        {!accessToken ? (
          <div className="p-8 text-center flex flex-col items-center justify-center my-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
              <Lock className="w-8 h-8" />
            </div>
            <div className="max-w-md">
              <h3 className="text-lg font-semibold text-slate-800">Google Drive Permission Required</h3>
              <p className="text-sm text-slate-600 mt-1">
                To connect to your Google Drive folders and read spreadsheets for regression analysis,
                please sign in with your Google account.
              </p>
            </div>
            <button
              onClick={handleSignIn}
              className="mt-2 inline-flex items-center gap-3 px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium shadow-sm transition hover:shadow cursor-pointer active:scale-98"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Top Toolbar: Navigation & Search */}
            <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
              {/* Breadcrumb Path */}
              <div className="flex items-center gap-1.5 text-sm overflow-x-auto py-1 max-w-full">
                {folderHistory.length > 1 && (
                  <button
                    onClick={handleGoBack}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition mr-1"
                    title="Go back up one level"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                {folderHistory.map((f, i) => (
                  <React.Fragment key={f.id + i}>
                    {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                    <button
                      onClick={() => {
                        setFolderHistory((prev) => prev.slice(0, i + 1));
                      }}
                      className={`text-xs sm:text-sm font-medium px-2 py-1 rounded-md transition ${
                        i === folderHistory.length - 1
                          ? 'bg-[#0E2044] text-white font-semibold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {f.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Action and Search */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter current folder..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => loadFolder(currentFolder.id, accessToken)}
                  disabled={loading}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  title="Refresh items"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Error banner if any */}
            {error && (
              <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-100 text-rose-700 text-xs flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800">
                  Dismiss
                </button>
              </div>
            )}

            {/* Folder Content List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 divide-y divide-slate-50">
              {loading && items.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Loading files from Drive...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">
                  {searchFilter ? 'No files match your search.' : 'This folder contains no spreadsheets or subfolders.'}
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
                  const isSheet = item.mimeType === 'application/vnd.google-apps.spreadsheet';
                  const isExcel =
                    item.name.endsWith('.xlsx') ||
                    item.name.endsWith('.xls') ||
                    item.mimeType.includes('spreadsheetml');
                  const isCSV = item.name.endsWith('.csv') || item.mimeType.includes('csv');

                  const isBusy = loadingFile === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (isFolder) {
                          handleOpenFolder(item);
                        } else {
                          handleSelectFile(item);
                        }
                      }}
                      className="group flex items-center justify-between p-3 rounded-xl hover:bg-blue-50/70 border border-transparent hover:border-blue-100 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isFolder ? (
                          <div className="w-9 h-9 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
                            <Folder className="w-5 h-5 fill-amber-500/20" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="w-5 h-5" />
                          </div>
                        )}

                        <div className="truncate">
                          <p className="text-sm font-medium text-slate-800 group-hover:text-blue-700 truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {isFolder
                              ? 'Google Drive Folder'
                              : isSheet
                              ? 'Google Sheet'
                              : isCSV
                              ? 'CSV Data'
                              : 'Excel Workbook (.xlsx)'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isFolder ? (
                          <span className="text-xs text-slate-400 group-hover:text-blue-600 flex items-center gap-0.5">
                            Open <ChevronRight className="w-4 h-4" />
                          </span>
                        ) : (
                          <button
                            disabled={isBusy}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 ${
                              isBusy
                                ? 'bg-blue-100 text-blue-700 animate-pulse'
                                : 'bg-white border border-slate-200 text-slate-700 group-hover:bg-[#0E2044] group-hover:text-white group-hover:border-[#0E2044]'
                            }`}
                          >
                            {isBusy ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              'Select File'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with logged in state */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                    {user?.displayName ? user.displayName[0] : 'U'}
                  </div>
                )}
                <span>
                  Connected as <strong className="text-slate-700">{user?.displayName || user?.email || 'Google User'}</strong>
                </span>
              </div>
              <button
                onClick={async () => {
                  await googleSignOut();
                  onAuthChange(null, null);
                }}
                className="text-rose-600 hover:text-rose-800 font-medium hover:underline"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
