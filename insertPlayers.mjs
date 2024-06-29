import axios from 'axios';
import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const API_HOST = "tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com";
const API_KEY = process.env.RAPIDAPI_KEY;

async function fetchPlayerProjections(week = "1") {
    const url = `https://${API_HOST}/getNFLProjections`;
    const params = {
        week: week,
        archiveSeason: "2024"
    };
    const headers = {
        'x-rapidapi-host': API_HOST,
        'x-rapidapi-key': API_KEY
    };

    try {
        const response = await axios.get(url, { params, headers });
        return response.data.body;
    } catch (error) {
        console.error('Error fetching projections:', error);
        throw error;
    }
}

async function connectToDB() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Use this for development, remove for production
        }
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL database');
        return client;
    } catch (error) {
        console.error('Error connecting to database:', error);
        throw error;
    }
}

async function insertPlayerProjections(client, projections) {
    let count = 0;

    for (const [playerId, data] of Object.entries(projections.playerProjections)) {
        if (playerId.match(/^\d+$/) && typeof data === 'object') {
            const fantasyPointsDefault = data.fantasyPointsDefault;
            if (fantasyPointsDefault && 'PPR' in fantasyPointsDefault) {
                const fantasyPointsPPR = fantasyPointsDefault.PPR;
                try {
                    await client.query(`
                        UPDATE player_data
                        SET PPR = $1
                        WHERE player_id = $2
                    `, [fantasyPointsPPR, playerId]);
                    count++;
                } catch (error) {
                    console.error(`Error updating player ${playerId}:`, error);
                }
            } else {
                console.log(`Player ${playerId} does not have PPR projection`);
            }
        } else {
            console.log(`Invalid player ID: ${playerId} or data is not an object`);
        }
    }

    console.log(`Inserted projections for ${count} players.`);
}

async function main() {
    try {
        console.log('Script is running...');
        const client = await connectToDB();
        const projections = await fetchPlayerProjections();
        console.log('Fetched projections.');
        await insertPlayerProjections(client, projections);
        await client.end();
        console.log('Script execution completed.');
    } catch (error) {
        console.error('Error running script:', error);
    }
}

main();
