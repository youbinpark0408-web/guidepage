import React, { useRef, useCallback } from 'react';
import { useSetRecoilState, useRecoilState } from 'recoil';
import {
  guideListAtom,
  rawExcelDataAtom,
  uploadStatusAtom,
  uploadedFileNameAtom,
  selectedGuideIdAtom,
} from '../../store/guideState';
import { opinionsAtom, opinionFormVisibleAtom } from '../../store/opinionState';
import { undoStackAtom, redoStackAtom } from '../../store/historyState';
import { parseExcelFile } from '../../utils/excelParser';
import { dbSet, clearAllStores, STORES } from '../../utils/db';
import './FileUpload.css';

const FileUpload = () => {
  const fileInputRef = useRef(null);
  const setGuideList = useSetRecoilState(guideListAtom);
  const setRawData = useSetRecoilState(rawExcelDataAtom);
  const setOpinions = useSetRecoilState(opinionsAtom);
  const setSelectedGuideId = useSetRecoilState(selectedGuideIdAtom);
  const setFormVisible = useSetRecoilState(opinionFormVisibleAtom);
  const setUndoStack = useSetRecoilState(undoStackAtom);
  const setRedoStack = useSetRecoilState(redoStackAtom);
  const [uploadStatus, setUploadStatus] = useRecoilState(uploadStatusAtom);
  const [fileName, setFileName] = useRecoilState(uploadedFileNameAtom);

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        alert('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
        return;
      }

      setUploadStatus('loading');
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          const buffer = new Uint8Array(arrayBuffer);
          const { guideList, opinions, rawWorkbook, sheetName } = parseExcelFile(buffer);

          // Store ArrayBuffer directly in IDB (no btoa needed)
          await dbSet(STORES.EXCEL, 'excelBuffer', arrayBuffer);
          await dbSet(STORES.EXCEL, 'excelSheetName', sheetName);

          setGuideList(guideList);
          setOpinions(opinions);
          setRawData({ rawWorkbook, sheetName });
          setSelectedGuideId(null);
          setFormVisible(false);
          setUndoStack([]);
          setRedoStack([]);
          setUploadStatus('success');
        } catch (err) {
          console.error('파싱 오류:', err);
          setUploadStatus('error');
        }
      };
      reader.onerror = () => setUploadStatus('error');
      reader.readAsArrayBuffer(file);
    },
    [setGuideList, setOpinions, setRawData, setSelectedGuideId, setUploadStatus, setFileName, setFormVisible, setUndoStack, setRedoStack]
  );

  const handleChange = (e) => handleFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleReset = async (e) => {
    e.stopPropagation();
    if (!window.confirm('업로드된 데이터와 모든 작업 내용을 초기화하시겠습니까?')) return;

    await clearAllStores();
    setGuideList([]);
    setOpinions({});
    setRawData(null);
    setSelectedGuideId(null);
    setFormVisible(false);
    setUndoStack([]);
    setRedoStack([]);
    setUploadStatus('idle');
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      className="file-upload-zone"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      {uploadStatus === 'idle' && (
        <div className="upload-idle">
          <span className="upload-icon">📂</span>
          <p className="upload-title">엑셀 파일을 드래그하거나 클릭하여 업로드</p>
          <p className="upload-sub">.xlsx, .xls 형식 지원</p>
        </div>
      )}

      {uploadStatus === 'loading' && (
        <div className="upload-loading">
          <div className="spinner" />
          <p>파일 파싱 중...</p>
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className="upload-success">
          <span className="upload-icon">✅</span>
          <p className="upload-filename">{fileName}</p>
          <p className="upload-sub">클릭하여 다시 업로드</p>
          <button className="btn-reset" onClick={handleReset}>
            초기화
          </button>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="upload-error">
          <span className="upload-icon">⚠️</span>
          <p>파일 처리 오류. 다시 시도하세요.</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
