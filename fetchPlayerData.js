import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

// Function to fetch player list from Rapid API
async function fetchPlayerList() {
    const response = await fetch('https://tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com/getNFLPlayerList', {
        method: 'GET',
        headers: {
            'x-rapidapi-host': 'tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com',
            'x-rapidapi-key': process.env.RAPIDAPI_KEY // Store your API key in .env file
        }
    });
    const data = await response.json();
    return data;
}

// Fetch and log player list
(async () => {
    try {
        const players = await fetchPlayerList();
        console.log(JSON.stringify(players, null, 2)); // Log the structure in a readable format
    } catch (error) {
        console.error('Error fetching player list:', error);
    }
})();
