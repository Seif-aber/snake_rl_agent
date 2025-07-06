import React, { useState, useEffect } from 'react';
import { getAgentStats, configureTraining, startTraining } from '../../utils/rlAgent';
import Settings from '../Settings/Settings';
import './Controls.css';

interface ControlsProps {
    gameStatus: 'idle' | 'running' | 'paused' | 'gameOver';
    score: number;
    highScore: number;
    onStart: () => void;
    onPause: () => void;
    onReset: () => void;
    onToggleAgent: () => void;
    isAgentPlaying: boolean;
}

const Controls: React.FC<ControlsProps> = ({
    gameStatus,
    score,
    highScore,
    onStart,
    onPause,
    onReset,
    onToggleAgent,
    isAgentPlaying
}) => {
    const [agentStats, setAgentStats] = useState<any>(null);

    // Update agent stats periodically when AI is playing
    useEffect(() => {
        let interval: NodeJS.Timeout;
        
        if (isAgentPlaying) {
            interval = setInterval(() => {
                const stats = getAgentStats();
                setAgentStats(stats);
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isAgentPlaying]);

    const handleSettingsChange = (settings: { maxEpisodes: number; explorationRate: number }) => {
        configureTraining(settings.maxEpisodes, settings.explorationRate);
        console.log(`⚙️ Settings updated: ${settings.maxEpisodes} episodes, ε=${settings.explorationRate}`);
    };

    const handleStart = () => {
        if (isAgentPlaying) {
            // If AI is active, start training mode
            startTraining();
        }
        onStart();
    };

    return (
        <div className="controls">
            <div className="game-info">
                <div className="score-display">
                    <span>Score: {score}</span>
                    <span>High Score: {highScore}</span>
                </div>
                <div className="game-status">
                    Status: {gameStatus.toUpperCase()}
                    {isAgentPlaying && gameStatus === 'running' && (
                        <span style={{ color: '#007bff', marginLeft: '10px' }}>
                            🤖 AI Learning
                        </span>
                    )}
                </div>
                
                {/* Q-Learning Progress */}
                {isAgentPlaying && agentStats && (
                    <div className="ai-progress" style={{ 
                        marginTop: '10px', 
                        padding: '10px', 
                        backgroundColor: '#e3f2fd', 
                        borderRadius: '5px',
                        fontSize: '14px'
                    }}>
                        <div><strong>🎯 Q-Learning Progress:</strong></div>
                        <div>Episode: {agentStats.currentEpisode}/{agentStats.maxEpisodes}</div>
                        <div>Exploration Rate: {(agentStats.epsilon * 100).toFixed(1)}%</div>
                        <div>Average Score: {agentStats.avgScore.toFixed(1)}</div>
                        <div>States Learned: {agentStats.totalStates}</div>
                        <div className="progress-bar" style={{
                            width: '100%',
                            height: '10px',
                            backgroundColor: '#ddd',
                            borderRadius: '5px',
                            marginTop: '5px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${(agentStats.currentEpisode / agentStats.maxEpisodes) * 100}%`,
                                height: '100%',
                                backgroundColor: '#4caf50',
                                transition: 'width 0.3s ease'
                            }}></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Settings Panel */}
            <Settings 
                onSettingsChange={handleSettingsChange} 
                isTraining={agentStats?.isTraining || false}
            />
            
            <div className="control-buttons">
                {gameStatus === 'idle' || gameStatus === 'gameOver' ? (
                    <button onClick={handleStart} className="start-btn">
                        {isAgentPlaying ? '🚀 Start Training' : 'Start Game'}
                    </button>
                ) : gameStatus === 'running' ? (
                    <button onClick={onPause} className="pause-btn">
                        Pause
                    </button>
                ) : (
                    <button onClick={handleStart} className="resume-btn">
                        Resume
                    </button>
                )}
                
                <button onClick={onReset} className="reset-btn">
                    Reset
                </button>
                
                <button 
                    onClick={onToggleAgent} 
                    className={`agent-toggle ${isAgentPlaying ? 'active' : ''}`}
                >
                    {isAgentPlaying ? '🤖 Q-Learning' : '👤 Manual Control'}
                </button>
            </div>
            
            <div className="game-controls-info">
                {!isAgentPlaying ? (
                    <>
                        <p>Use arrow keys to control the snake manually</p>
                        <p>Press 'P' to pause, 'R' to reset</p>
                    </>
                ) : (
                    <>
                        <p>🤖 AI agent will learn using Q-Learning algorithm</p>
                        <p>Configure episodes and exploration rate in settings</p>
                        <p>Click "Start Training" to begin automatic training</p>
                        <p>Game will auto-restart until all episodes are completed</p>
                    </>
                )}
                <p>Toggle between manual and AI control anytime</p>
            </div>
        </div>
    );
};

export default Controls;