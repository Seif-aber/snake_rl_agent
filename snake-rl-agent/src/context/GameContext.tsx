import React, { createContext, useContext, ReactNode } from 'react';
import { GameState } from '../types';
import useGameState from '../hooks/useGameState';

interface GameContextType {
    gameState: GameState;
    updateGameState: (newState: Partial<GameState>) => void;
    resetGame: () => void;
    startGame: () => void;
    pauseGame: () => void;
    gameOver: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
    children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
    const gameLogic = useGameState();

    return (
        <GameContext.Provider value={gameLogic}>
            {children}
        </GameContext.Provider>
    );
};

export const useGameContext = () => {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGameContext must be used within a GameProvider');
    }
    return context;
};

