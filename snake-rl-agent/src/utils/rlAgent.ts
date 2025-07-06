// This file contains functions related to the reinforcement learning agent, including initializing the agent and making predictions based on the current game state.

import * as tf from '@tensorflow/tfjs';
import { Action } from '../types';

interface QTableEntry {
    [key: string]: number[];
}

interface Experience {
    state: string;
    action: Action;
    reward: number;
    nextState: string;
    done: boolean;
}

class QLearningAgent {
    private qTable: QTableEntry = {};
    private learningRate: number = 0.3; // Increased from 0.1
    private discountFactor: number = 0.99; // Increased from 0.95
    private epsilon: number = 0.9; // Start with higher exploration
    private initialEpsilon: number = 0.9;
    private minEpsilon: number = 0.01;
    private epsilonDecay: number = 0.995;
    
    // Experience replay buffer
    private experienceBuffer: Experience[] = [];
    private maxBufferSize: number = 10000;
    private batchSize: number = 32;
    
    // Episode tracking
    private currentEpisode: number = 0;
    private maxEpisodes: number = 100;
    private episodeRewards: number[] = [];
    private isTraining: boolean = false;
    
    // Current episode state
    private currentStates: string[] = [];
    private currentActions: Action[] = [];
    private currentRewards: number[] = [];
    
    // Performance tracking
    private consecutiveGoodEpisodes: number = 0;
    private bestScore: number = 0;
    private stagnationCounter: number = 0;
    private lastAvgScore: number = 0;

    // Heuristic parameters
    private heuristicWeight: number = 0.3; // Weight for heuristic guidance
    private heuristicDecay: number = 0.99; // Decay heuristic influence over time

    constructor() {
        console.log('🎯 Enhanced Q-Learning Agent with Distance Heuristic initialized!');
        console.log(`📊 Training for ${this.maxEpisodes} episodes with ε=${this.epsilon}`);
        console.log(`🧠 Using experience replay with buffer size: ${this.maxBufferSize}`);
        console.log(`🎯 Heuristic guidance enabled with weight: ${this.heuristicWeight}`);
    }

    // Configure training parameters
    configureTraining(maxEpisodes: number, explorationRate: number): void {
        this.maxEpisodes = maxEpisodes;
        this.epsilon = explorationRate;
        this.initialEpsilon = explorationRate;
        this.currentEpisode = 0;
        this.episodeRewards = [];
        this.isTraining = false;
        this.experienceBuffer = [];
        this.consecutiveGoodEpisodes = 0;
        this.bestScore = 0;
        this.stagnationCounter = 0;
        
        console.log(`⚙️ Training configured: ${maxEpisodes} episodes, ε=${explorationRate}`);
    }

    private stateToString(state: number[]): string {
        // More robust state representation with better discretization
        return state.map(val => {
            if (val >= 0 && val <= 1) {
                // For normalized values, use finer discretization
                return Math.round(val * 20) / 20;
            } else {
                // For other values, round to 1 decimal place
                return Math.round(val * 10) / 10;
            }
        }).join(',');
    }

    private getQValues(state: string): number[] {
        if (!this.qTable[state]) {
            // Initialize with small random values instead of zeros
            this.qTable[state] = [
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
            ];
        }
        return this.qTable[state];
    }

    // NEW: Calculate heuristic values based on wrapped distance to food
    private calculateHeuristic(state: number[]): number[] {
        // Extended state vector: [headX, headY, foodX, foodY, foodDeltaX, foodDeltaY, distanceToFood, 
        //                        dangerStraight, dangerLeft, dangerRight, nearLeft, nearRight, nearTop, nearBottom]
        const headX = state[0] * 10; // Denormalize
        const headY = state[1] * 10;
        const foodX = state[2] * 10;
        const foodY = state[3] * 10;
        const foodDeltaX = state[4] * 10; // Already accounts for wrapping
        const foodDeltaY = state[5] * 10; // Already accounts for wrapping
        const dangerStraight = state[7];
        const dangerLeft = state[8];
        const dangerRight = state[9];
        const nearLeftBorder = state[10];
        const nearRightBorder = state[11];
        const nearTopBorder = state[12];
        const nearBottomBorder = state[13];

        const heuristicValues = [0, 0, 0]; // [straight, left, right]

        // For each possible action, calculate heuristic score
        for (let action = 0; action < 3; action++) {
            let score = 0;

            // Penalty for immediate danger (only self-collision now)
            if (action === 0 && dangerStraight > 0) {
                score -= 1000; // Huge penalty for collision
            } else if (action === 1 && dangerLeft > 0) {
                score -= 1000;
            } else if (action === 2 && dangerRight > 0) {
                score -= 1000;
            }

            // If not dangerous, calculate distance-based heuristic
            if (score > -1000) {
                // Use the wrapped deltas directly for better heuristic
                if (action === 0) { // straight
                    // Reward continuing towards food
                    if ((foodDeltaX > 0 && headX < 5) || (foodDeltaX < 0 && headX >= 5)) {
                        score += 30;
                    }
                    if ((foodDeltaY > 0 && headY < 5) || (foodDeltaY < 0 && headY >= 5)) {
                        score += 30;
                    }
                } else if (action === 1) { // left turn
                    // Reward turning towards food
                    if (Math.abs(foodDeltaX) > Math.abs(foodDeltaY)) {
                        if (foodDeltaX < 0) score += 40; // Food is to the left
                    } else {
                        if (foodDeltaY < 0) score += 40; // Food is above
                    }
                } else { // right turn
                    // Reward turning towards food
                    if (Math.abs(foodDeltaX) > Math.abs(foodDeltaY)) {
                        if (foodDeltaX > 0) score += 40; // Food is to the right
                    } else {
                        if (foodDeltaY > 0) score += 40; // Food is below
                    }
                }

                // Bonus for wrapping when it's beneficial
                if (nearLeftBorder && foodDeltaX < -0.3) {
                    if (action === 1) score += 25; // Turn left to wrap around
                }
                if (nearRightBorder && foodDeltaX > 0.3) {
                    if (action === 2) score += 25; // Turn right to wrap around
                }
                if (nearTopBorder && foodDeltaY < -0.3) {
                    if (action === 0) score += 25; // Go straight up to wrap
                }
                if (nearBottomBorder && foodDeltaY > 0.3) {
                    if (action === 0) score += 25; // Go straight down to wrap
                }

                // Direct path bonus using wrapped coordinates
                const wrappedDistance = Math.abs(foodDeltaX) + Math.abs(foodDeltaY);
                if (wrappedDistance < 0.3) { // Very close to food
                    score += 20;
                }
            }

            heuristicValues[action] = score;
        }

        return heuristicValues;
    }

    // Enhanced action selection with heuristic guidance
    private getBestActionWithHeuristic(state: string, stateVector: number[]): Action {
        const qValues = this.getQValues(state);
        const heuristicValues = this.calculateHeuristic(stateVector);
        
        // Current heuristic weight (decays over time as Q-values become more reliable)
        const currentHeuristicWeight = this.heuristicWeight * Math.pow(this.heuristicDecay, this.currentEpisode);
        
        // Combine Q-values with heuristic guidance
        const combinedValues = qValues.map((qVal, idx) => {
            return qVal + (currentHeuristicWeight * heuristicValues[idx]);
        });

        console.log(`🎯 Q-values: [${qValues.map(v => v.toFixed(2)).join(', ')}]`);
        console.log(`🧭 Heuristic: [${heuristicValues.map(v => v.toFixed(2)).join(', ')}]`);
        console.log(`⚖️ Combined: [${combinedValues.map(v => v.toFixed(2)).join(', ')}] (weight: ${currentHeuristicWeight.toFixed(3)})`);

        // Select action with highest combined value
        let maxValue = Math.max(...combinedValues);
        let bestActions = combinedValues.map((val, idx) => val === maxValue ? idx : -1).filter(idx => idx !== -1);
        return bestActions[Math.floor(Math.random() * bestActions.length)] as Action;
    }

    private getBestAction(state: string): Action {
        const qValues = this.getQValues(state);
        let maxValue = Math.max(...qValues);
        let bestActions = qValues.map((val, idx) => val === maxValue ? idx : -1).filter(idx => idx !== -1);
        return bestActions[Math.floor(Math.random() * bestActions.length)] as Action;
    }

    // Epsilon-greedy with decay based on performance
    private getEpsilon(): number {
        // Adaptive epsilon based on recent performance
        if (this.consecutiveGoodEpisodes > 5) {
            return Math.max(this.minEpsilon, this.epsilon * 0.9);
        }
        return this.epsilon;
    }

    async predict(state: number[]): Promise<Action> {
        const stateKey = this.stateToString(state);
        let action: Action;
        const currentEpsilon = this.getEpsilon();

        if (this.isTraining && Math.random() < currentEpsilon) {
            // Smart exploration with heuristic guidance
            action = this.getSmartExplorationActionWithHeuristic(state, stateKey);
            console.log(`🎲 Smart exploration action: ${action} (ε=${currentEpsilon.toFixed(3)})`);
        } else {
            // Use heuristic-guided action selection
            action = this.getBestActionWithHeuristic(stateKey, state);
            console.log(`🧠 Heuristic-guided action: ${action}`);
        }

        if (this.isTraining) {
            this.currentStates.push(stateKey);
            this.currentActions.push(action);
        }

        return action;
    }

    private getSmartExplorationActionWithHeuristic(state: number[], stateKey: string): Action {
        const qValues = this.getQValues(stateKey);
        const heuristicValues = this.calculateHeuristic(state);
        const hasLearned = qValues.some(v => Math.abs(v) > 0.1);
        
        if (hasLearned) {
            // Use combination of Q-values and heuristics for smart exploration
            const combinedValues = qValues.map((qVal, idx) => {
                return qVal + (this.heuristicWeight * 0.5 * heuristicValues[idx]); // Reduced weight for exploration
            });
            
            const minValue = Math.min(...combinedValues);
            const worstAction = combinedValues.indexOf(minValue);
            
            // 80% chance to avoid worst combined action during exploration
            if (Math.random() < 0.8) {
                const availableActions = [0, 1, 2].filter(a => a !== worstAction);
                return availableActions[Math.floor(Math.random() * availableActions.length)] as Action;
            }
        } else {
            // For new states, use heuristic to guide exploration
            const validActions = heuristicValues.map((val, idx) => val > -1000 ? idx : -1).filter(idx => idx !== -1);
            if (validActions.length > 0) {
                // Prefer actions with better heuristic values
                const heuristicProbs = validActions.map(action => Math.exp(heuristicValues[action] / 100));
                const totalProb = heuristicProbs.reduce((sum, prob) => sum + prob, 0);
                
                const rand = Math.random() * totalProb;
                let cumProb = 0;
                for (let i = 0; i < validActions.length; i++) {
                    cumProb += heuristicProbs[i];
                    if (rand <= cumProb) {
                        return validActions[i] as Action;
                    }
                }
            }
        }
        
        return Math.floor(Math.random() * 3) as Action;
    }

    calculateReward(gameState: any, prevGameState: any): number {
        let reward = 0;

        // Food eaten - high reward
        if (gameState.score > prevGameState.score) {
            reward += 100;
            console.log('🍎 Food eaten! +100');
            return reward;
        }

        // Game over - severe penalty (only self-collision now)
        if (gameState.gameStatus === 'gameOver') {
            reward -= 200;
            console.log('💀 Game over! -200');
            return reward;
        }

        const head = gameState.snake[0];
        const food = gameState.food;
        const prevHead = prevGameState.snake[0];
        const boardSize = 10;
        
        // Calculate wrapped distances
        const getWrappedDistance = (x1: number, y1: number, x2: number, y2: number) => {
            const dx1 = Math.abs(x2 - x1);
            const dx2 = boardSize - dx1;
            const minDx = Math.min(dx1, dx2);

            const dy1 = Math.abs(y2 - y1);
            const dy2 = boardSize - dy1;
            const minDy = Math.min(dy1, dy2);

            return minDx + minDy; // Manhattan distance with wrapping
        };

        const currentDistance = getWrappedDistance(head.x, head.y, food.x, food.y);
        const prevDistance = getWrappedDistance(prevHead.x, prevHead.y, food.x, food.y);

        // Distance-based rewards with wrapping consideration
        if (currentDistance < prevDistance) {
            reward += 15; // Moving closer to food
        } else if (currentDistance > prevDistance) {
            reward -= 8; // Moving away from food
        }

        // Bonus for being very close to food (wrapped)
        if (currentDistance <= 2) {
            reward += 10; // Additional bonus for being close
        }

        // Bonus for effective wrapping usage
        const isNearBorder = head.x <= 1 || head.x >= boardSize - 2 || head.y <= 1 || head.y >= boardSize - 2;
        const wasNearBorder = prevHead.x <= 1 || prevHead.x >= boardSize - 2 || prevHead.y <= 1 || prevHead.y >= boardSize - 2;
        
        if (isNearBorder && !wasNearBorder && currentDistance < prevDistance) {
            reward += 5; // Bonus for approaching border to get closer to food
        }

        // Survival bonus
        reward += 1;

        // No wall penalties anymore, only self-collision danger
        const snake = gameState.snake;
        for (let i = 1; i < snake.length; i++) {
            const segment = snake[i];
            const segmentDistance = Math.abs(head.x - segment.x) + Math.abs(head.y - segment.y);
            if (segmentDistance <= 1) {
                reward -= 15; // Penalty for being close to self
                break;
            }
        }

        return reward;
    }

    updateQLearning(reward: number): void {
        if (!this.isTraining || this.currentStates.length === 0) return;

        this.currentRewards.push(reward);

        // Store experience for replay
        if (this.currentStates.length >= 2) {
            const experience: Experience = {
                state: this.currentStates[this.currentStates.length - 2],
                action: this.currentActions[this.currentActions.length - 2],
                reward: this.currentRewards[this.currentRewards.length - 2],
                nextState: this.currentStates[this.currentStates.length - 1],
                done: reward < -100 // Game over
            };
            
            this.addExperience(experience);
        }

        // Perform Q-learning update
        this.performQLearningUpdate();
        
        // Experience replay
        if (this.experienceBuffer.length >= this.batchSize) {
            this.replayExperiences();
        }
    }

    private addExperience(experience: Experience): void {
        this.experienceBuffer.push(experience);
        if (this.experienceBuffer.length > this.maxBufferSize) {
            this.experienceBuffer.shift(); // Remove oldest experience
        }
    }

    private performQLearningUpdate(): void {
        if (this.currentStates.length < 2) return;

        const prevStateKey = this.currentStates[this.currentStates.length - 2];
        const prevAction = this.currentActions[this.currentActions.length - 2];
        const currentStateKey = this.currentStates[this.currentStates.length - 1];
        const currentReward = this.currentRewards[this.currentRewards.length - 2];

        const prevQValues = this.getQValues(prevStateKey);
        const currentQValues = this.getQValues(currentStateKey);
        const maxNextQ = Math.max(...currentQValues);

        const oldQ = prevQValues[prevAction];
        
        // Dynamic learning rate based on experience
        const dynamicLR = this.getDynamicLearningRate(prevStateKey);
        const newQ = oldQ + dynamicLR * (currentReward + this.discountFactor * maxNextQ - oldQ);
        
        prevQValues[prevAction] = newQ;

        console.log(`📚 Q-update: ${oldQ.toFixed(3)} → ${newQ.toFixed(3)} (reward: ${currentReward}, lr: ${dynamicLR.toFixed(3)})`);
    }

    private getDynamicLearningRate(stateKey: string): number {
        // Higher learning rate for new states, lower for well-visited states
        const qValues = this.getQValues(stateKey);
        const stateVisits = Math.max(1, Math.abs(qValues.reduce((sum, val) => sum + Math.abs(val), 0)) * 10);
        return Math.max(0.05, this.learningRate / Math.sqrt(stateVisits));
    }

    private replayExperiences(): void {
        // Sample random batch from experience buffer
        const batch: Experience[] = [];
        for (let i = 0; i < this.batchSize; i++) {
            const randomIndex = Math.floor(Math.random() * this.experienceBuffer.length);
            batch.push(this.experienceBuffer[randomIndex]);
        }

        // Update Q-values for the batch
        batch.forEach(exp => {
            const qValues = this.getQValues(exp.state);
            const nextQValues = this.getQValues(exp.nextState);
            const maxNextQ = exp.done ? 0 : Math.max(...nextQValues);
            
            const target = exp.reward + this.discountFactor * maxNextQ;
            const oldQ = qValues[exp.action];
            
            // Use smaller learning rate for replay
            const replayLR = this.learningRate * 0.5;
            qValues[exp.action] = oldQ + replayLR * (target - oldQ);
        });
    }

    startTraining(): void {
        this.isTraining = true;
        this.currentEpisode = 0;
        this.episodeRewards = [];
        this.epsilon = this.initialEpsilon;
        this.experienceBuffer = [];
        this.consecutiveGoodEpisodes = 0;
        this.bestScore = 0;
        this.stagnationCounter = 0;
        console.log(`🚀 Enhanced training with heuristics started: ${this.maxEpisodes} episodes with ε=${this.epsilon}`);
    }

    startEpisode(): void {
        this.currentEpisode++;
        this.currentStates = [];
        this.currentActions = [];
        this.currentRewards = [];
        
        console.log(`🚀 Episode ${this.currentEpisode}/${this.maxEpisodes} started`);
    }

    endEpisode(finalScore: number): boolean {
        if (!this.isTraining) return false;

        // Handle final state update
        if (this.currentStates.length > 0 && this.currentRewards.length > 0) {
            const lastStateKey = this.currentStates[this.currentStates.length - 1];
            const lastAction = this.currentActions[this.currentActions.length - 1];
            const lastReward = this.currentRewards[this.currentRewards.length - 1];

            const qValues = this.getQValues(lastStateKey);
            const oldQ = qValues[lastAction];
            const newQ = oldQ + this.learningRate * (lastReward - oldQ);
            qValues[lastAction] = newQ;
        }

        this.episodeRewards.push(finalScore);
        
        // Performance-based epsilon decay
        if (finalScore > this.bestScore) {
            this.bestScore = finalScore;
            this.consecutiveGoodEpisodes++;
            this.stagnationCounter = 0;
        } else {
            this.consecutiveGoodEpisodes = Math.max(0, this.consecutiveGoodEpisodes - 1);
            this.stagnationCounter++;
        }

        // Adaptive epsilon decay
        if (this.consecutiveGoodEpisodes > 3) {
            this.epsilon = Math.max(this.minEpsilon, this.epsilon * 0.98); // Faster decay when performing well
        } else if (this.stagnationCounter > 10) {
            this.epsilon = Math.min(this.initialEpsilon * 0.5, this.epsilon * 1.05); // Increase exploration if stagnating
            this.stagnationCounter = 0;
        } else {
            this.epsilon = Math.max(this.minEpsilon, this.epsilon * this.epsilonDecay);
        }

        const currentHeuristicWeight = this.heuristicWeight * Math.pow(this.heuristicDecay, this.currentEpisode);
        console.log(`📈 Episode ${this.currentEpisode} ended - Score: ${finalScore}, ε: ${this.epsilon.toFixed(3)}, Best: ${this.bestScore}, Heuristic: ${currentHeuristicWeight.toFixed(3)}`);
        
        const recentScores = this.episodeRewards.slice(-10);
        const avgScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
        console.log(`📊 Average score (last 10): ${avgScore.toFixed(1)}, Buffer size: ${this.experienceBuffer.length}`);

        // Check for early convergence (reduced threshold since heuristics help)
        if (this.episodeRewards.length >= 15) {
            const last15Avg = this.episodeRewards.slice(-15).reduce((a, b) => a + b, 0) / 15;
            if (last15Avg >= 30 && this.currentEpisode >= 30) { // Lower threshold with heuristics
                console.log('🎯 Early convergence detected! Agent performing well consistently with heuristic guidance.');
                this.isTraining = false;
                return false;
            }
        }

        const shouldContinue = this.currentEpisode < this.maxEpisodes;
        
        if (!shouldContinue) {
            this.isTraining = false;
            console.log('🎓 Training completed!');
            console.log(`📊 Final average score: ${avgScore.toFixed(1)}`);
            console.log(`📚 Q-table size: ${Object.keys(this.qTable).length} states`);
            console.log(`🧠 Experience buffer size: ${this.experienceBuffer.length}`);
        }

        this.lastAvgScore = avgScore;
        return shouldContinue;
    }

    getStats() {
        const currentHeuristicWeight = this.heuristicWeight * Math.pow(this.heuristicDecay, this.currentEpisode);
        return {
            currentEpisode: this.currentEpisode,
            maxEpisodes: this.maxEpisodes,
            epsilon: this.epsilon,
            isTraining: this.isTraining,
            avgScore: this.episodeRewards.length > 0 
                ? this.episodeRewards.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, this.episodeRewards.length)
                : 0,
            totalStates: Object.keys(this.qTable).length,
            bestScore: this.bestScore,
            bufferSize: this.experienceBuffer.length,
            consecutiveGoodEpisodes: this.consecutiveGoodEpisodes,
            heuristicWeight: currentHeuristicWeight
        };
    }

    resetTraining(): void {
        this.currentEpisode = 0;
        this.episodeRewards = [];
        this.epsilon = this.initialEpsilon;
        this.isTraining = false;
        this.experienceBuffer = [];
        this.consecutiveGoodEpisodes = 0;
        this.bestScore = 0;
        this.stagnationCounter = 0;
        console.log('🔄 Enhanced training with heuristics reset');
    }

    getEpisodeHistory(): number[] {
        return [...this.episodeRewards];
    }

    getQTableSize(): number {
        return Object.keys(this.qTable).length;
    }
}

let agentInstance: QLearningAgent | null = null;

export const initializeAgent = (): QLearningAgent => {
    if (!agentInstance) {
        agentInstance = new QLearningAgent();
    }
    return agentInstance;
};

export const configureTraining = (maxEpisodes: number, explorationRate: number): void => {
    if (agentInstance) {
        agentInstance.configureTraining(maxEpisodes, explorationRate);
    }
};

export const startTraining = (): void => {
    if (agentInstance) {
        agentInstance.startTraining();
    }
};

export const predictAction = async (state: number[]): Promise<Action> => {
    if (!agentInstance) {
        agentInstance = initializeAgent();
    }
    return await agentInstance.predict(state);
};

export const updateQLearning = (reward: number): void => {
    if (agentInstance) {
        agentInstance.updateQLearning(reward);
    }
};

export const calculateReward = (gameState: any, prevGameState: any): number => {
    if (agentInstance) {
        return agentInstance.calculateReward(gameState, prevGameState);
    }
    return 0;
};

export const startEpisode = (): void => {
    if (agentInstance) {
        agentInstance.startEpisode();
    }
};

export const endEpisode = (finalScore: number): boolean => {
    if (agentInstance) {
        return agentInstance.endEpisode(finalScore);
    }
    return false;
};

export const getAgentStats = () => {
    if (agentInstance) {
        return agentInstance.getStats();
    }
    return null;
};

export const resetTraining = (): void => {
    if (agentInstance) {
        agentInstance.resetTraining();
    }
};

export const getEpisodeHistory = (): number[] => {
    if (agentInstance) {
        return agentInstance.getEpisodeHistory();
    }
    return [];
};

export const getQTableSize = (): number => {
    if (agentInstance) {
        return agentInstance.getQTableSize();
    }
    return 0;
};

export default QLearningAgent;