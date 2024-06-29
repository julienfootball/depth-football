import fetch from 'node-fetch';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fetchPlayerData() {
  const url = 'https://tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com/getNFLPlayerList';
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com',
      'x-rapidapi-key': '5a2939d193msh5a23a5312a1b3b9p179038jsn5f15913b5e25'
    }
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    // Log the fetched data
    console.log('Fetched data:', JSON.stringify(data, null, 2));

    // Check if data is an array
    if (Array.isArray(data) || (data && data.players)) {
      const players = data.players || data;
      console.log('Number of players fetched:', players.length);
      await insertPlayerData(players);
    } else {
      console.log('No player data to update or data is not an array');
    }
  } catch (error) {
    console.error('Error fetching player data:', error);
  }
}

async function insertPlayerData(players) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const player of players) {
      const { playerID, longName, team, pos } = player;

      console.log(`Inserting player: ${JSON.stringify(player)}`);

      if (!playerID) {
        console.log(`Missing playerID for player: ${JSON.stringify(player)}`);
        continue;
      }

      await client.query(
        'INSERT INTO player_data (playerid, longname, team, pos, projected_points) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (playerid) DO NOTHING',
        [playerID, longName, team, pos, 0]
      );
    }

    await client.query('COMMIT');
    console.log('Player data inserted successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting player data:', error);
  } finally {
    client.release();
  }
}

fetchPlayerData();
