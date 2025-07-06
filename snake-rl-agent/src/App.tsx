import React, { useState, useEffect } from 'react';
import { GameProvider, useGameContext } from './context/GameContext';
import GameBoard from './components/GameBoard/GameBoard';
import Controls from './components/Controls/Controls';
import useGameEngine from './hooks/useGameEngine';
import './App.css';

const GameContainer: React.FC = () => {
    const {
        gameState,
        updateGameState,
        resetGame,
        startGame,
        pauseGame,
        gameOver
    } = useGameContext();

    const { boardSize } = useGameEngine({
        gameState,
        updateGameState,
        gameOver
    });

    // Dynamic cell size based on screen size
    const [cellSize, setCellSize] = useState(20);

    useEffect(() => {
        const calculateCellSize = () => {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            
            // Calculate max available space (accounting for UI elements)
            // Reserve more space for header and controls
            const maxWidth = Math.min(screenWidth * 0.95, screenWidth - 60);
            const maxHeight = Math.min(screenHeight * 0.5, screenHeight - 300);
            
            // Calculate cell size based on board size and available space
            const cellSizeByWidth = Math.floor(maxWidth / boardSize);
            const cellSizeByHeight = Math.floor(maxHeight / boardSize);
            
            // Use the smaller size to ensure the board fits
            const newCellSize = Math.max(6, Math.min(cellSizeByWidth, cellSizeByHeight, 25));
            setCellSize(newCellSize);
        };

        calculateCellSize();
        window.addEventListener('resize', calculateCellSize);
        
        return () => window.removeEventListener('resize', calculateCellSize);
    }, [boardSize]);

    const handleStart = () => {
        if (gameState.gameStatus === 'idle' || gameState.gameStatus === 'gameOver') {
            if (gameState.gameStatus === 'gameOver') {
                resetGame();
            }
            startGame();
        } else if (gameState.gameStatus === 'paused') {
            startGame();
        }
    };

    const handlePause = () => {
        pauseGame();
    };

    const handleReset = () => {
        resetGame();
    };

    const handleToggleAgent = () => {
        updateGameState({ 
            isAgentPlaying: !gameState.isAgentPlaying 
        });
    };

    return (
        <div className="App">
            <header className="app-header">
🐍                <h1>🐍 Snake RL Agent 🐍</h1>
                <p>Watch an AI learn to play Snake using Q-Learning</p>
            </header>
            
            <main className="app-main">
                <div className="game-section">
                    <GameBoard 
                        snake={gameState.snake} 
                        food={gameState.food} 
                        boardSize={boardSize} 
                        cellSize={cellSize}
                        gameStatus={gameState.gameStatus}
                    />
                    <Controls 
                        gameStatus={gameState.gameStatus}
                        score={gameState.score}
                        highScore={gameState.highScore}
                        onStart={handleStart}
                        onPause={handlePause}
                        onReset={handleReset}
                        onToggleAgent={handleToggleAgent}
                        isAgentPlaying={gameState.isAgentPlaying}
                    />
                </div>
            </main>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <GameProvider>
            <GameContainer />
        </GameProvider>
    );
};

export default App;