import { useEffect, useRef, useCallback } from 'react';
import { initializeAgent, predictAction } from '../utils/rlAgent';
import { GameState, Action } from '../types';

const useAgent = (gameState: GameState) => {
    const agentRef = useRef(initializeAgent());
    const isTraining = useRef(false);

    const wrapPosition = useCallback((x: number, y: number, boardSize: number) => {
        return {
            x: ((x % boardSize) + boardSize) % boardSize,
            y: ((y % boardSize) + boardSize) % boardSize
        };
    }, []);

    const getWrappedDistance = useCallback((x1: number, y1: number, x2: number, y2: number, boardSize: number) => {
        // Calculate distance considering wrapping
        const dx1 = Math.abs(x2 - x1);
        const dx2 = boardSize - dx1;
        const minDx = Math.min(dx1, dx2);

        const dy1 = Math.abs(y2 - y1);
        const dy2 = boardSize - dy1;
        const minDy = Math.min(dy1, dy2);

        return Math.sqrt(minDx * minDx + minDy * minDy);
    }, []);

    const getWrappedDelta = useCallback((from: number, to: number, boardSize: number) => {
        const direct = to - from;
        const wrapped = direct > boardSize / 2 ? direct - boardSize : direct < -boardSize / 2 ? direct + boardSize : direct;
        return wrapped / boardSize; // Normalize
    }, []);

    const getStateVector = useCallback((state: GameState): number[] => {
        const { snake, food, direction } = state;
        const head = snake[0];
        const boardSize = 10;
        
        // Normalize positions to 0-1 range
        const normalizedHeadX = head.x / boardSize;
        const normalizedHeadY = head.y / boardSize;
        const normalizedFoodX = food.x / boardSize;
        const normalizedFoodY = food.y / boardSize;
        
        // Calculate relative food position considering wrapping
        const foodDeltaX = getWrappedDelta(head.x, food.x, boardSize);
        const foodDeltaY = getWrappedDelta(head.y, food.y, boardSize);
        
        // Calculate wrapped distance to food (normalized)
        const distanceToFood = getWrappedDistance(head.x, head.y, food.x, food.y, boardSize) / (boardSize * Math.sqrt(2));
        
        // Check for dangers in different directions (only self-collision now)
        const checkDanger = (dx: number, dy: number) => {
            const wrappedPos = wrapPosition(head.x + dx, head.y + dy, boardSize);
            
            // Only check self collision (no wall collision with wrapping)
            for (let i = 1; i < snake.length; i++) {
                if (snake[i].x === wrappedPos.x && snake[i].y === wrappedPos.y) {
                    return 1;
                }
            }
            
            return 0;
        };
        
        // Get direction vectors
        const getDirectionVector = (dir: string) => {
            switch (dir) {
                case 'up': return { x: 0, y: -1 };
                case 'down': return { x: 0, y: 1 };
                case 'left': return { x: -1, y: 0 };
                case 'right': return { x: 1, y: 0 };
                default: return { x: 1, y: 0 };
            }
        };
        
        const currentDir = getDirectionVector(direction);
        const leftDir = getDirectionVector(getLeftDirection(direction));
        const rightDir = getDirectionVector(getRightDirection(direction));
        
        const dangerStraight = checkDanger(currentDir.x, currentDir.y);
        const dangerLeft = checkDanger(leftDir.x, leftDir.y);
        const dangerRight = checkDanger(rightDir.x, rightDir.y);
        
        // Add additional features for wrapping awareness
        const nearLeftBorder = head.x <= 1 ? 1 : 0;
        const nearRightBorder = head.x >= boardSize - 2 ? 1 : 0;
        const nearTopBorder = head.y <= 1 ? 1 : 0;
        const nearBottomBorder = head.y >= boardSize - 2 ? 1 : 0;
        
        // Extended state vector with 14 features for wrapping game
        return [
            normalizedHeadX,
            normalizedHeadY,
            normalizedFoodX,
            normalizedFoodY,
            foodDeltaX,
            foodDeltaY,
            distanceToFood,
            dangerStraight,
            dangerLeft,
            dangerRight,
            nearLeftBorder,
            nearRightBorder,
            nearTopBorder,
            nearBottomBorder
        ];
    }, [wrapPosition, getWrappedDistance, getWrappedDelta]);
    
    const getLeftDirection = (direction: string): string => {
        const directions = ['up', 'right', 'down', 'left'];
        const index = directions.indexOf(direction);
        return directions[(index + 3) % 4];
    };
    
    const getRightDirection = (direction: string): string => {
        const directions = ['up', 'right', 'down', 'left'];
        const index = directions.indexOf(direction);
        return directions[(index + 1) % 4];
    };

    const getNextAction = useCallback(async (state: GameState): Promise<Action> => {
        const stateVector = getStateVector(state);
        console.log('🧠 State vector (with wrapping):', stateVector);
        const action = await predictAction(stateVector);
        console.log('🎯 Predicted action:', action);
        return action;
    }, [getStateVector]);

    const trainAgent = useCallback(async (experiences: any[]) => {
        if (isTraining.current || experiences.length === 0) return;
        
        isTraining.current = true;
        try {
            console.log('🎓 Training agent with', experiences.length, 'experiences');
        } catch (error) {
            console.error('Training error:', error);
        } finally {
            isTraining.current = false;
        }
    }, []);

    useEffect(() => {
        agentRef.current = initializeAgent();
    }, []);

    return {
        getNextAction,
        trainAgent,
        isTraining: isTraining.current
    };
};

export default useAgent;