// This file contains utility functions for game logic, such as collision detection, updating the game state, and generating food positions.

export const generateFoodPosition = (boardSize: number): { x: number; y: number } => {
    const x = Math.floor(Math.random() * boardSize);
    const y = Math.floor(Math.random() * boardSize);
    return { x, y };
};

export const checkCollision = (snake: Array<{ x: number; y: number }>, boardSize: number): boolean => {
    const head = snake[0];
    // Check wall collision
    if (head.x < 0 || head.x >= boardSize || head.y < 0 || head.y >= boardSize) {
        return true;
    }
    // Check self collision
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    return false;
};

export const updateSnake = (snake: Array<{ x: number; y: number }>, direction: { x: number; y: number }): Array<{ x: number; y: number }> => {
    const newHead = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const newSnake = [newHead, ...snake.slice(0, snake.length - 1)];
    return newSnake;
};

export const growSnake = (snake: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> => {
    const newHead = { ...snake[0] };
    return [newHead, ...snake];
};