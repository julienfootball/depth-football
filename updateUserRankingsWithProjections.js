import pkg from 'pg';
const { Pool } = pkg;
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

// Fetch projected points for default players
async function fetchDefaultQBList() {
    try {
        const response = await fetch('http://localhost:3000/player-data');
        const players = await response.json();
        return players.map(player => ({
            player_id: player.qb_list.player_id,
            name: player.name,
            projected_points: player.projected_points
        }));
    } catch (err) {
        console.error('Error fetching default QB list:', err);
        throw err;
    }
}

// Update user rankings with default QB list
async function updateUserRankings() {
    try {
        const defaultQBList = await fetchDefaultQBList();
        const client = await pool.connect();

        const result = await client.query('SELECT username FROM users');
        for (const row of result.rows) {
            await client.query('UPDATE users SET rankings = $1 WHERE username = $2', [JSON.stringify(defaultQBList), row.username]);
        }

        client.release();
        console.log('User rankings updated successfully with default QB list');
    } catch (err) {
        console.error('Error updating user rankings:', err);
    }
}

updateUserRankings();
