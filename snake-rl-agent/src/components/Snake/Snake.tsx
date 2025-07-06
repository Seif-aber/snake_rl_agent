import React from 'react';
import './Snake.css';

interface SnakeProps {
    segments: Array<{ x: number; y: number }>;
    cellSize: number;
}

const Snake: React.FC<SnakeProps> = ({ segments, cellSize }) => {
    return (
        <>
            {segments.map((segment, index) => {
                const snakeStyle: React.CSSProperties = {
                    position: 'absolute',
                    width: `${cellSize}px`,
                    height: `${cellSize}px`,
                    backgroundColor: index === 0 ? '#38a169' : '#48bb78',
                    left: `${segment.x * cellSize}px`,
                    top: `${segment.y * cellSize}px`,
                    border: index === 0 ? '2px solid #2f855a' : '1px solid #38a169',
                    borderRadius: '2px',
                };

                return (
                    <div 
                        key={index} 
                        className={`snake-segment ${index === 0 ? 'snake-head' : ''}`}
                        style={snakeStyle} 
                    />
                );
            })}
        </>
    );
};

export default Snake;