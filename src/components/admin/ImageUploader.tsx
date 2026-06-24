import React from 'react';
/**
 * Image Uploader Component
 * Supports: URL input + drag & drop with base64 preview
 * Falls back to URL-based approach when Firebase Storage is unavailable
 */
import { useState, useRef, useCallback } from 'react';
import { Upload, X, ImageIcon, Link as LinkIcon, Camera, Loader2 } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';

interface ImageUploaderProps {
  currentUrl?: string;
  storagePath: string;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  className?: string;
}

export default function ImageUploader({
  currentUrl,
  storagePath,
  onUpload,
  onRemove,
  className = '',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [dragging, setDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert file to base64 data URL for immediate preview & storage in Firestore
  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Только изображения (JPG, PNG, WebP, GIF)');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Максимальный размер — 10 MB');
        return;
      }

      setError('');
      setUploading(true);
      
      try {
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const fullPath = `${storagePath}/${fileName}`;
        const storageRef = ref(storage, fullPath);
        
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        
        onUpload(url);
      } catch (err: any) {
        console.error('Storage upload error:', err);
        setError(`Ошибка загрузки: ${err.message || 'неизвестная ошибка'}`);
      } finally {
        setUploading(false);
      }
    },
    [onUpload, storagePath]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    try {
      new URL(urlInput.trim());
      onUpload(urlInput.trim());
      setUrlInput('');
      setError('');
    } catch {
      setError('Некорректный URL');
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Current image preview */}
      {currentUrl && (
        <div className="relative rounded-xl overflow-hidden border border-white/10 group">
          <img
            src={currentUrl}
            alt="Preview"
            className="w-full h-40 object-cover"
            referrerPolicy="no-referrer"
          />
          {onRemove && (
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Mode switcher */}
      <div className="flex gap-1 bg-white/3 border border-white/8 rounded-lg p-0.5">
        <button
          onClick={() => setMode('upload')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'upload' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Camera size={12} />
          Файл
        </button>
        <button
          onClick={() => setMode('url')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === 'url' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <LinkIcon size={12} />
          Ссылка
        </button>
      </div>

      {mode === 'upload' ? (
        /* Drop zone */
        <div
          onDragOver={(e) => { e.preventDefault(); !uploading && setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 transition-all ${
            uploading ? 'cursor-wait opacity-60' : 'cursor-pointer'
          } ${
            dragging
              ? 'border-primary bg-primary/10'
              : 'border-white/10 hover:border-white/20 hover:bg-white/3'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? (
            <Loader2 size={24} className="text-primary animate-spin" />
          ) : currentUrl ? (
            <ImageIcon size={24} className="text-slate-500" />
          ) : (
            <Upload size={24} className="text-slate-500" />
          )}
          <div className="text-center">
            <p className="text-slate-300 text-sm font-medium">
              {uploading ? 'Загрузка...' : currentUrl ? 'Заменить изображение' : 'Загрузить изображение'}
            </p>
            <p className="text-slate-600 text-xs mt-1">
              Перетащите файл или нажмите • JPG, PNG, WebP • до 10 MB
            </p>
          </div>
        </div>
      ) : (
        /* URL input */
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            placeholder="https://example.com/image.jpg"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 text-sm"
          />
          <button
            onClick={handleUrlSubmit}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:brightness-110 transition-all"
          >
            OK
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-400 text-xs px-1">{error}</p>
      )}
    </div>
  );
}
