import React from 'react';
import { motion } from 'framer-motion';

const Background = () => {
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#0a0f1d] pointer-events-none">
            {/* Primary Ambient Orbs */}
            <motion.div
                animate={{
                    x: [0, 150, -150, 0],
                    y: [0, -80, 80, 0],
                    scale: [1, 1.4, 1],
                }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-cyan-500/10 blur-[160px] rounded-full"
            />
            <motion.div
                animate={{
                    x: [0, -180, 180, 0],
                    y: [0, 120, -120, 0],
                    scale: [1, 1.5, 1],
                }}
                transition={{
                    duration: 35,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute bottom-[-25%] right-[-10%] w-[90%] h-[90%] bg-purple-600/10 blur-[180px] rounded-full"
            />
            <motion.div
                animate={{
                    opacity: [0.05, 0.15, 0.05],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute top-[30%] right-[15%] w-[40%] h-[40%] bg-blue-400/5 blur-[100px] rounded-full"
            />

            {/* Subtle Noise Texture */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-soft-light bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            
            {/* Grid Overlay (Very subtle) */}
            <div 
                className="absolute inset-0 opacity-[0.03]" 
                style={{ 
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)',
                    backgroundSize: '32px 32px'
                }} 
            />
        </div>
    );
};

export default Background;
