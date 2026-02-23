/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Folder, FileSpreadsheet, Download, CheckCircle, AlertCircle, Loader2, UploadCloud, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [outputFolderName, setOutputFolderName] = useState('converted_csvs');
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const excelFiles = (Array.from(selectedFiles) as File[]).filter((file: File) => {
      const name = file.name.toLowerCase();
      return name.endsWith('.xlsx') || name.endsWith('.xls');
    });

    setFiles(excelFiles);
    setError(null);
    setSuccess(false);
    setProgress(0);
    
    // Automatically set a default output folder name based on the input folder
    if (excelFiles.length > 0) {
      const firstFilePath = excelFiles[0].webkitRelativePath;
      const rootFolder = firstFilePath.split('/')[0];
      if (rootFolder) {
        setOutputFolderName(`${rootFolder}_csv`);
      }
    }
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      setError('Please select a folder containing Excel files first.');
      return;
    }

    if (!outputFolderName.trim()) {
      setError('Please provide an output folder name.');
      return;
    }

    setIsConverting(true);
    setError(null);
    setSuccess(false);
    setProgress(0);

    try {
      const zip = new JSZip();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        
        const pathParts = file.webkitRelativePath.split('/');
        // Replace the root folder name with the user-specified output folder name
        pathParts[0] = outputFolderName.trim();
        const newPathBase = pathParts.join('/');
        
        if (workbook.SheetNames.length === 1) {
          const sheetName = workbook.SheetNames[0];
          const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
          const newPathCsv = newPathBase.replace(/\.[^/.]+$/, ".csv");
          zip.file(newPathCsv, csv);
        } else {
          // If multiple sheets, create a CSV for each sheet
          workbook.SheetNames.forEach(sheetName => {
            const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
            const newPathCsvSheet = newPathBase.replace(/\.[^/.]+$/, `_${sheetName}.csv`);
            zip.file(newPathCsvSheet, csv);
          });
        }
        
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `${outputFolderName.trim()}.zip`);
      setSuccess(true);
    } catch (err: any) {
      console.error('Conversion error:', err);
      setError(err.message || 'An error occurred during conversion.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-2xl mb-6"
          >
            <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4"
          >
            Excel to CSV Converter
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 max-w-xl mx-auto"
          >
            Select a folder with Excel files. We'll convert them all to CSV while keeping your exact folder structure intact.
          </motion.p>
        </header>

        {/* Main Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
        >
          <div className="p-8 md:p-10 space-y-10">
            
            {/* Step 1: Select Folder */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-semibold text-sm">1</div>
                <h2 className="text-xl font-semibold">Select Input Folder</h2>
              </div>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 ${
                  files.length > 0 
                    ? 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50' 
                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFolderSelect}
                  className="hidden"
                  // @ts-ignore - webkitdirectory is non-standard but widely supported
                  webkitdirectory=""
                  directory=""
                  multiple
                />
                
                <div className="flex flex-col items-center gap-4">
                  <div className={`p-4 rounded-full transition-colors ${files.length > 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 mb-1">
                      {files.length > 0 ? 'Change selected folder' : 'Click to select a folder'}
                    </p>
                    <p className="text-sm text-slate-500">
                      Includes all subfolders and Excel files (.xlsx, .xls)
                    </p>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {files.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100"
                  >
                    <CheckCircle className="w-5 h-5 shrink-0" />
                    <p className="font-medium">
                      Found {files.length} Excel {files.length === 1 ? 'file' : 'files'} in the selected folder.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Step 2: Output Settings */}
            <section className={files.length === 0 ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-semibold text-sm">2</div>
                <h2 className="text-xl font-semibold">Output Settings</h2>
              </div>
              
              <div className="space-y-3">
                <label htmlFor="outputName" className="block text-sm font-medium text-slate-700">
                  Output Folder Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Folder className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    id="outputName"
                    value={outputFolderName}
                    onChange={(e) => setOutputFolderName(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    placeholder="e.g., converted_data"
                  />
                </div>
                <p className="text-sm text-slate-500">
                  This will be the root folder name inside the downloaded ZIP file.
                </p>
              </div>
            </section>

            {/* Step 3: Convert */}
            <section className={files.length === 0 ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={handleConvert}
                  disabled={isConverting || files.length === 0 || !outputFolderName.trim()}
                  className="w-full relative flex items-center justify-center gap-2 py-4 px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Converting... {progress}%</span>
                      <div 
                        className="absolute bottom-0 left-0 h-1 bg-indigo-500 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                      <span>Convert & Download ZIP</span>
                    </>
                  )}
                </button>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                  </motion.div>
                )}
                
                {success && !isConverting && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 flex flex-col items-center justify-center gap-2 p-6 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-center"
                  >
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-lg">Conversion Complete!</h3>
                    <p className="text-sm text-emerald-600/80">
                      Your files have been converted and downloaded as a ZIP archive.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

          </div>
        </motion.div>
        
        {/* File List Preview (Optional, showing first few) */}
        {files.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">
              Files to be converted ({files.length})
            </h3>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {files.slice(0, 50).map((file, idx) => (
                  <li key={idx} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                    <FileText className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {file.webkitRelativePath}
                      </p>
                    </div>
                    <div className="text-xs text-slate-400 whitespace-nowrap">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </li>
                ))}
                {files.length > 50 && (
                  <li className="p-4 text-center text-sm text-slate-500 bg-slate-50">
                    And {files.length - 50} more files...
                  </li>
                )}
              </ul>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
