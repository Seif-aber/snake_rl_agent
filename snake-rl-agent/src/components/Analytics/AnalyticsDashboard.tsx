/* filepath: /home/seif/Desktop/personal_projects/autonomous_snake/snake-rl-agent/src/components/Analytics/AnalyticsDashboard.tsx */
import React, { useState } from 'react';
import './AnalyticsDashboard.css';

interface AnalyticsDashboardProps {
    isAgentPlaying: boolean;
    currentScore: number;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
    isAgentPlaying, 
    currentScore 
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={`analytics-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
            <button 
                className="analytics-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Hide Analytics' : 'Show Analytics'}
            >
                {isExpanded ? '📊 ➡️' : '⬅️ 📊'}
            </button>

            {isExpanded && (
                <div className="analytics-content">
                    <div className="no-data-message">
                        <p>Analytics panel removed</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;