import "dotenv/config";
import React from 'react';
import { render } from 'ink';
import { App } from './App';

// Habilitar el buffer de pantalla alternativa (modo pantalla completa como vim / htop)
process.stdout.write('\x1b[?1049h');
process.stdout.write('\x1b[H');

process.stdout.on('resize', () => {
    process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
});

render(<App />);

const cleanup = () => {
    process.stdout.write('\x1b[?1049l');
};

process.on('exit', cleanup);
process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
});



