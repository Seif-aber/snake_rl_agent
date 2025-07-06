// This file exports TypeScript types and interfaces used throughout the application.

export interface Position {
    x: number;
    y: number;
}

export interface GameState {
    snake: Position[];
    food: Position;
    score: number;
    highScore: number;
    gameStatus: 'idle' | 'running' | 'paused' | 'gameOver';
    direction: 'up' | 'down' | 'left' | 'right';
    isAgentPlaying: boolean;
}

export interface RLAgentState {
    distanceToFood: number;
    foodDirection: number;
    dangerStraight: number;
    dangerLeft: number;
    dangerRight: number;
}

export type Action = 0 | 1 | 2; // 0: straight, 1: left, 2: right