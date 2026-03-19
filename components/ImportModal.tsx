import React, { useState, useEffect, useRef } from 'react';
import { getPublicRoadmap, importRoadmap } from '../services/supabaseService';
import { RoadmapData } from '../types';

// Declare HTML5Qrcode to satisfy TS since it's loaded via script tag
declare const Html5Qrcode: any;

interface ImportModalProps {
    onClose: () => void;
    onImportSuccess: (data: RoadmapData) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImportSuccess }) => {
    const [mode, setMode] = useState<'link' | 'scan'>('link');
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [previewData, setPreviewData] = useState<RoadmapData | null>(null);
    const scannerRef = useRef<any>(null);

    // Cleanup scanner on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch((err: any) => console.error("Failed to stop scanner", err));
            }
        };
    }, []);

    const startScanner = () => {
        setMode('scan');
        setError('');
        // Give DOM time to render the ID inside the modal
        setTimeout(() => {
            try {
                const html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;
                html5QrCode.start(
                    { facingMode: "environment" }, 
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText: string) => {
                        // Success
                        html5QrCode.stop();
                        handleUrlSubmit(decodedText);
                    },
                    (errorMessage: string) => {
                        // parse error, ignore
                    }
                ).catch((err: any) => {
                    setError("Could not access camera.");
                });
            } catch (e) {
                setError("Scanner initialization failed.");
            }
        }, 100);
    };

    const handleUrlSubmit = async (inputUrl: string = url) => {
        setLoading(true);
        setError('');
        try {
            let roadmapId = '';
            // Try to extract ID from URL, or assume input is ID
            try {
                const urlObj = new URL(inputUrl);
                roadmapId = urlObj.searchParams.get('roadmapId') || '';
            } catch {
                roadmapId = inputUrl; // Assume raw ID
            }

            if (!roadmapId) throw new Error("Invalid URL or ID");

            const data = await getPublicRoadmap(roadmapId);
            setPreviewData(data);
            setMode('link'); // Reset UI to show preview
        } catch (e: any) {
            setError(e.message || "Failed to fetch roadmap.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!previewData) return;
        setLoading(true);
        try {
            await importRoadmap(previewData);
            onImportSuccess(previewData);
            onClose();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {previewData ? (
                <div className="text-center animate-fadeIn">
                    <div className="bg-blue-50 p-6 rounded-xl mb-6 border border-blue-100">
                        <h4 className="text-xl font-bold text-blue-800 mb-2">{previewData.skill}</h4>
                        <p className="text-sm text-blue-600">{previewData.roadmap.length} Weeks • {previewData.progress}% Complete (Original)</p>
                    </div>
                    <p className="text-sm text-slate-600 mb-6">
                        This will create a fresh copy in your dashboard. You can track your own progress independently.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => setPreviewData(null)} className="px-6 py-2 rounded-full border border-slate-300 hover:bg-slate-50 text-slate-700">Cancel</button>
                        <button onClick={handleConfirmImport} disabled={loading} className="dynamic-button">
                            {loading ? 'Importing...' : 'Confirm Import'}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-lg">
                        <button 
                            onClick={() => setMode('link')}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'link' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Paste Link
                        </button>
                        <button 
                            onClick={startScanner}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'scan' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Scan QR
                        </button>
                    </div>

                    {mode === 'link' ? (
                        <div className="space-y-4 animate-fadeIn">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Roadmap Link</label>
                                <input 
                                    type="text" 
                                    placeholder="https://horizon-ai.com/?roadmapId=..." 
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            <div className="text-center">
                                <button 
                                    onClick={() => handleUrlSubmit()} 
                                    disabled={loading || !url}
                                    className="dynamic-button w-full"
                                >
                                    {loading ? 'Fetching...' : 'Fetch Roadmap'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fadeIn">
                            <div id="reader" className="w-full min-h-[300px] bg-slate-100 rounded-lg overflow-hidden border-2 border-slate-200"></div>
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            <p className="text-xs text-slate-500 text-center">Point your camera at a valid Horizon AI QR code.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ImportModal;