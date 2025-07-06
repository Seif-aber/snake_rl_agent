import React from 'react';
import Snake from '../Snake/Snake';
import './GameBoard.css';

interface GameBoardProps {
    snake: Array<{ x: number; y: number }>;
    food: { x: number; y: number };
    boardSize: number;
    cellSize: number;
    gameStatus: string;
}

const GameBoard: React.FC<GameBoardProps> = ({
    snake,
    food,
    boardSize,
    cellSize,
    gameStatus
}) => {
    const boardStyle: React.CSSProperties = {
        width: boardSize * cellSize,
        height: boardSize * cellSize,
        position: 'relative',
        border: '3px solid #333',
        backgroundColor: '#2d3748',
        borderRadius: '8px',
        backgroundImage: 
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: `${cellSize}px ${cellSize}px`,
    };

    const foodStyle: React.CSSProperties = {
        position: 'absolute',
        left: food.x * cellSize,
        top: food.y * cellSize,
        width: cellSize,
        height: cellSize,
        backgroundColor: '#e53e3e',
        border: '2px solid #c53030',
        borderRadius: '50%',
        boxShadow: '0 0 10px rgba(229, 62, 62, 0.6)',
    };

    return (
        <div className="game-container">
            <div className="game-board" style={boardStyle}>
                {/* Render snake */}
                <Snake segments={snake} cellSize={cellSize} />
                
                {/* Render food */}
                <div className="food" style={foodStyle} />
                
                {/* Game overlay messages */}
                {gameStatus === 'gameOver' && (
                    <div className="game-overlay">
                        <h2>Game Over!</h2>
                        <p>Press Start to play again</p>
                    </div>
                )}
                
                {gameStatus === 'paused' && (
                    <div className="game-overlay">
                        <h2>Paused</h2>
                        <p>Press Resume to continue</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameBoard;



