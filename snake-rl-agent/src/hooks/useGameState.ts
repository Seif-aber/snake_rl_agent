import { useState, useCallback } from 'react';
import { GameState } from '../types';

const initialGameState: GameState = {
    // snake: [{ x: 10, y: 10 }],
    snake: [{ x: 5, y: 5 }],
    food: { x: 7, y: 7 },
    // food: { x: 15, y: 15 },
    score: 0,
    highScore: 0,
    gameStatus: 'idle',
    direction: 'right',
    isAgentPlaying: false
};

const useGameState = () => {
    const [gameState, setGameState] = useState<GameState>(initialGameState);

    const updateGameState = useCallback((newState: Partial<GameState>) => {
        setGameState((prevState) => ({
            ...prevState,
            ...newState,
        }));
    }, []);

    const resetGame = useCallback(() => {
        setGameState({
            ...initialGameState,
            highScore: gameState.highScore
        });
    }, [gameState.highScore]);

    const startGame = useCallback(() => {
        updateGameState({ gameStatus: 'running' });
    }, [updateGameState]);

    const pauseGame = useCallback(() => {
        updateGameState({ gameStatus: 'paused' });
    }, [updateGameState]);

    const gameOver = () => {
        setGameState(prevState => ({
            ...prevState,
            gameStatus: 'gameOver',
            // Update high score if current score is higher
            highScore: Math.max(prevState.score, prevState.highScore),
            isAgentPlaying: prevState.isAgentPlaying // Preserve agent mode
        }));
    };

    return {
        gameState,
        updateGameState,
        resetGame,
        startGame,
        pauseGame,
        gameOver
    };
};

export default useGameState;