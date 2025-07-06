import React, { useState } from 'react';
import './Settings.css';

interface SettingsProps {
    onSettingsChange: (settings: { maxEpisodes: number; explorationRate: number }) => void;
    isTraining: boolean;
}

const Settings: React.FC<SettingsProps> = ({ onSettingsChange, isTraining }) => {
    const [maxEpisodes, setMaxEpisodes] = useState(100);
    const [explorationRate, setExplorationRate] = useState(0.1);
    const [isOpen, setIsOpen] = useState(false);

    const handleApplySettings = () => {
        onSettingsChange({ maxEpisodes, explorationRate });
        setIsOpen(false);
    };

    return (
        <div className="settings">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="settings-toggle"
                disabled={isTraining}
            >
                ⚙️ Settings
            </button>
            
            {isOpen && (
                <div className="settings-panel">
                    <h3>Q-Learning Settings</h3>
                    
                    <div className="setting-item">
                        <label>Number of Episodes:</label>
                        <input
                            type="number"
                            min="1"
                            max="1000"
                            value={maxEpisodes}
                            onChange={(e) => setMaxEpisodes(parseInt(e.target.value))}
                            disabled={isTraining}
                        />
                    </div>
                    
                    <div className="setting-item">
                        <label>Exploration Rate (ε):</label>
                        <input
                            type="number"
                            min="0.01"
                            max="1"
                            step="0.01"
                            value={explorationRate}
                            onChange={(e) => setExplorationRate(parseFloat(e.target.value))}
                            disabled={isTraining}
                        />
                        <small>Higher = more random exploration</small>
                    </div>
                    
                    <div className="settings-actions">
                        <button onClick={handleApplySettings} disabled={isTraining}>
                            Apply
                        </button>
                        <button onClick={() => setIsOpen(false)}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;