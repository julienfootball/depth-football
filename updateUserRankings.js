import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

async function updateUserRankings() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT username, rankings FROM users');

        for (const row of result.rows) {
            const updatedRankings = row.rankings.map((name, index) => ({
                player_id: index + 1, // You might want to map this to actual player IDs
                name: name
            }));
            await client.query('UPDATE users SET rankings = $1 WHERE username = $2', [JSON.stringify(updatedRankings), row.username]);
        }

        console.log('User rankings updated successfully');
        client.release();
    } catch (err) {
        console.error('Error updating user rankings:', err);
    }
}

updateUserRankings();
