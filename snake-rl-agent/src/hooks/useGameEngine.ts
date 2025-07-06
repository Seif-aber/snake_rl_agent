/* filepath: /home/seif/Desktop/personal_projects/autonomous_snake/snake-rl-agent/src/hooks/useGameEngine.ts */
import { useEffect, useRef, useCallback } from 'react';
import { GameState, Position } from '../types';
import { generateFoodPosition, updateSnake } from '../utils/gameLogic';
import useAgent from './useAgent';
import { updateQLearning, calculateReward, startEpisode, endEpisode } from '../utils/rlAgent';

interface UseGameEngineProps {
    gameState: GameState;
    updateGameState: (newState: Partial<GameState>) => void;
    gameOver: () => void;
}

const useGameEngine = ({ gameState, updateGameState, gameOver }: UseGameEngineProps) => {
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    // const boardSize = 20;
    const boardSize = 10; // Reduced board size for easier debugging and testing
    const { getNextAction } = useAgent(gameState);
    const prevGameStateRef = useRef<GameState>(gameState);
    const autoRestartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const getDirectionVector = useCallback((direction: string): Position => {
        switch (direction) {
            case 'up': return { x: 0, y: -1 };
            case 'down': return { x: 0, y: 1 };
            case 'left': return { x: -1, y: 0 };
            case 'right': return { x: 1, y: 0 };
            default: return { x: 1, y: 0 };
        }
    }, []);

    const generateNewFood = useCallback((snake: Position[]): Position => {
        let newFood: Position;
        do {
            newFood = generateFoodPosition(boardSize);
        } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        return newFood;
    }, []);

    const applyAgentAction = useCallback((action: number, currentDirection: string): 'up' | 'down' | 'left' | 'right' => {
        const directions: ('up' | 'down' | 'left' | 'right')[] = ['up', 'right', 'down', 'left'];
        const currentIndex = directions.indexOf(currentDirection as 'up' | 'down' | 'left' | 'right');
        
        switch (action) {
            case 0: return currentDirection as 'up' | 'down' | 'left' | 'right';
            case 1: return directions[(currentIndex + 1) % 4];
            case 2: return directions[(currentIndex + 3) % 4];
            default: return currentDirection as 'up' | 'down' | 'left' | 'right';
        }
    }, []);

    const autoRestartGame = useCallback(() => {
        console.log('🔄 Auto-restarting game for next episode...');
        
        const newFood = generateFoodPosition(boardSize);
        updateGameState({
            // snake: [{ x: 10, y: 10 }],
            snake: [{ x: 5, y: 5 }],
            food: newFood,
            score: 0,
            gameStatus: 'running',
            direction: 'right'
        });
        
        startEpisode();
    }, [updateGameState, boardSize]);

    const checkCollision = useCallback((head: Position, snake: Position[]): boolean => {
        // Remove wall collision check - borders now wrap around
        // Only check self-collision
        for (let i = 1; i < snake.length; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) {
                return true;
            }
        }
        return false;
    }, []);

    const wrapPosition = useCallback((position: Position): Position => {
        return {
            x: ((position.x % boardSize) + boardSize) % boardSize,
            y: ((position.y % boardSize) + boardSize) % boardSize
        };
    }, [boardSize]);

    const moveSnake = useCallback((currentSnake: Position[], direction: 'up' | 'down' | 'left' | 'right', ateFood: boolean = false): Position[] => {
        const head = currentSnake[0];
        let newHead: Position;

        switch (direction) {
            case 'up':
                newHead = { x: head.x, y: head.y - 1 };
                break;
            case 'down':
                newHead = { x: head.x, y: head.y + 1 };
                break;
            case 'left':
                newHead = { x: head.x - 1, y: head.y };
                break;
            case 'right':
                newHead = { x: head.x + 1, y: head.y };
                break;
            default:
                newHead = head;
        }

        // Wrap the new head position around borders
        newHead = wrapPosition(newHead);

        // Create new snake array with new head
        const newSnake = [newHead, ...currentSnake];
        
        // Only keep the tail if food was eaten, otherwise remove it
        if (!ateFood) {
            newSnake.pop(); // Remove the tail segment
        }

        return newSnake;
    }, [wrapPosition]);

    const moveSnakeGameLogic = useCallback(async () => {
        if (gameState.gameStatus !== 'running') return;

        prevGameStateRef.current = { ...gameState };
        let newDirection = gameState.direction;

        if (gameState.isAgentPlaying) {
            try {
                const action = await getNextAction(gameState);
                newDirection = applyAgentAction(action, gameState.direction);
            } catch (error) {
                console.error('Agent decision error:', error);
            }
        }

        const direction = getDirectionVector(newDirection);
        let newSnake = moveSnake(gameState.snake, newDirection);

        if (checkCollision(newSnake[0], newSnake)) {
            if (gameState.isAgentPlaying) {
                const reward = calculateReward({ ...gameState, gameStatus: 'gameOver' }, prevGameStateRef.current);
                updateQLearning(reward);
                
                // Update high score BEFORE ending episode
                const newHighScore = Math.max(gameState.score, gameState.highScore);
                updateGameState({ 
                    highScore: newHighScore,
                    gameStatus: 'gameOver' 
                });
                
                const shouldContinue = endEpisode(gameState.score);
                
                if (shouldContinue) {
                    // Auto-restart immediately for next episode
                    autoRestartTimeoutRef.current = setTimeout(() => {
                        autoRestartGame();
                    }, 500); // Short delay to see the game over
                    return;
                } else {
                    // Training completed
                    console.log('🎓 All episodes completed! Training finished.');
                    updateGameState({ isAgentPlaying: false });
                }
            } else {
                // Manual play - update high score and call gameOver
                const newHighScore = Math.max(gameState.score, gameState.highScore);
                updateGameState({
                    gameStatus: 'gameOver',
                    highScore: newHighScore
                });
                gameOver();
            }
            return;
        }

        const head = newSnake[0];
        let newFood = gameState.food;
        let newScore = gameState.score;

        if (head.x === gameState.food.x && head.y === gameState.food.y) {
            newSnake = [...newSnake, newSnake[newSnake.length - 1]];
            newFood = generateNewFood(newSnake);
            newScore += 10;
        }

        const newGameState = {
            snake: newSnake,
            food: newFood,
            score: newScore,
            direction: newDirection
        };

        if (gameState.isAgentPlaying) {
            const reward = calculateReward(newGameState, prevGameStateRef.current);
            updateQLearning(reward);
        }

        updateGameState(newGameState);
    }, [gameState, getDirectionVector, generateNewFood, updateGameState, gameOver, getNextAction, applyAgentAction, autoRestartGame, moveSnake, checkCollision]);

    // Start episode when AI is activated and game is running
    useEffect(() => {
        if (gameState.isAgentPlaying && gameState.gameStatus === 'running') {
            startEpisode();
        }
    }, [gameState.isAgentPlaying]);

    // Handle keyboard input
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'p') {
                if (gameState.gameStatus === 'running') {
                    updateGameState({ gameStatus: 'paused' });
                } else if (gameState.gameStatus === 'paused') {
                    updateGameState({ gameStatus: 'running' });
                }
                return;
            }
            
            if (event.key.toLowerCase() === 'r') {
                if (autoRestartTimeoutRef.current) {
                    clearTimeout(autoRestartTimeoutRef.current);
                    autoRestartTimeoutRef.current = null;
                }
                
                updateGameState({
                    // snake: [{ x: 10, y: 10 }],
                    snake: [{ x: 5, y: 5 }],
                    food: generateFoodPosition(boardSize),
                    score: 0,
                    gameStatus: 'idle',
                    direction: 'right',
                    isAgentPlaying: false
                });
                return;
            }

            if (gameState.gameStatus !== 'running' || gameState.isAgentPlaying) return;

            let newDirection = gameState.direction;
            switch (event.key) {
                case 'ArrowUp':
                    if (gameState.direction !== 'down') newDirection = 'up';
                    break;
                case 'ArrowDown':
                    if (gameState.direction !== 'up') newDirection = 'down';
                    break;
                case 'ArrowLeft':
                    if (gameState.direction !== 'right') newDirection = 'left';
                    break;
                case 'ArrowRight':
                    if (gameState.direction !== 'left') newDirection = 'right';
                    break;
            }
            
            if (newDirection !== gameState.direction) {
                updateGameState({ direction: newDirection });
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [gameState.direction, gameState.gameStatus, gameState.isAgentPlaying, updateGameState, boardSize]);

    // Game loop
    useEffect(() => {
        if (gameState.gameStatus === 'running') {
            const speed = gameState.isAgentPlaying ? 50 : 150;
            intervalRef.current = setInterval(moveSnakeGameLogic, speed);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [gameState.gameStatus, gameState.isAgentPlaying, moveSnakeGameLogic]);

    useEffect(() => {
        return () => {
            if (autoRestartTimeoutRef.current) {
                clearTimeout(autoRestartTimeoutRef.current);
            }
        };
    }, []);

    return { boardSize };
};

export default useGameEngine;