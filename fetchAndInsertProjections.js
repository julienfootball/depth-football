async function fetchProjections() {
  const url = 'https://tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com/getNFLProjections?week=1&season=2024&twoPointConversions=2&passYards=.04&passAttempts=-.5&passTD=4&passCompletions=1&passInterceptions=-2&pointsPerReception=1&carries=.2&rushYards=.1&rushTD=6&fumbles=-2&receivingYards=.1&receivingTD=6&targets=.1&fgMade=3&fgMissed=-1&xpMade=1&xpMissed=-1';
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
    console.log(`Fetched projections data: ${JSON.stringify(data)}`); // Log to check structure

    if (data && data.data) {
      const projections = data.data;
      console.log(`Number of projections fetched: ${Object.keys(projections).length}`);

      await insertProjections(projections);
    } else {
      console.log('No projections data to update');
    }
  } catch (error) {
    console.error('Error fetching projections data:', error);
  }
}

async function insertProjections(projections) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const playerId in projections) {
      if (projections.hasOwnProperty(playerId) && projections[playerId].fantasyPointsDefault) {
        const projection = projections[playerId];
        const projectedPoints = parseFloat(projection.fantasyPointsDefault.PPR);

        console.log(`Updating player ${playerId} with projected points: ${projectedPoints}`);

        await client.query(
          'UPDATE player_data SET projected_points = $1 WHERE playerid = $2',
          [projectedPoints, playerId]
        );
      } else {
        console.log(`Missing data for playerID: ${playerId}`);
      }
    }

    await client.query('COMMIT');
    console.log('Player projections updated successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating player projections:', error);
  } finally {
    client.release();
  }
}

fetchProjections();
