import React, { useState } from 'react';
import QRCode from 'react-qr-code';

interface ShareModalProps {
    roadmapId: string;
    skillName: string;
    onClose?: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ roadmapId, skillName }) => {
    const shareUrl = `${window.location.origin}/?roadmapId=${roadmapId}`;
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Share Roadmap
                </h3>
                <p className="text-slate-500">
                    Let others master <strong>{skillName}</strong> with you!
                </p>
            </div>

            <div className="flex justify-center bg-white p-4 rounded-xl border border-slate-100">
                <QRCode value={shareUrl} size={180} />
            </div>

            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block text-center">Public Link</label>
                <div className="flex items-center gap-2">
                    <input 
                        type="text" 
                        readOnly 
                        value={shareUrl} 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm focus:outline-none"
                    />
                    <button 
                        onClick={handleCopy}
                        className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                    >
                        <ion-icon name={copied ? "checkmark" : "copy-outline"} className="text-xl"></ion-icon>
                    </button>
                </div>
                {copied && <p className="text-center text-xs text-green-600 font-medium">Link copied to clipboard!</p>}
            </div>
        </div>
    );
};

export default ShareModal;