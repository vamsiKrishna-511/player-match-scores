const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "cricketMatchDetails.db");
let database = null;

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DataBase error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//returns the list of all the players in the player table
//API 1
const ConvertAPI1 = (objectItem) => {
  return {
    playerId: objectItem.player_id,
    playerName: objectItem.player_name,
  };
};

app.get("/players/", async (request, response) => {
  const getPlayersQuery = `SELECT * FROM player_details;`;
  const playersArray = await database.all(getPlayersQuery);
  response.send(playersArray.map((eachPlayer) => ConvertAPI1(eachPlayer)));
});

//returns a specific player based on the player ID
// API 2

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `SELECT * FROM player_details WHERE player_id = ${playerId};`;
  const getPlayerQueryResponse = await database.get(getPlayerQuery);
  response.send(ConvertAPI1(getPlayerQueryResponse));
});

//Updates the details of a specific player based on the player ID
//API 3

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `UPDATE player_details SET player_name = '${playerName}'
     WHERE 
    player_id = ${playerId};`;
  await database.run(updatePlayerQuery);
  response.send(`Player Details Updated`);
});

//Returns the match details of a specific match
//API 4
const convertAPI2 = (objectItem) => {
  return {
    matchId: objectItem.match_id,
    match: objectItem.match,
    year: objectItem.year,
  };
};

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `SELECT * FROM match_details WHERE match_id = ${matchId};`;
  const getMatchQueryResponse = await database.get(getMatchQuery);
  response.send(convertAPI2(getMatchQueryResponse));
});

//Returns a list of all the matches of a player
//API 5

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerIdQuery = `select * from player_match_score where player_id = ${playerId};`;
  const getPlayerIdQueryResponse = await database.all(getPlayerIdQuery);
  const matchesIdArr = getPlayerIdQueryResponse.map((eachMatch) => {
    return eachMatch.match_id;
  });

  const getMatchDetailsQuery = `
    SELECT *
        FROM match_details 
    WHERE match_id IN (${matchesIdArr});`;

  const fetchMatchDetailsResponse = await database.all(getMatchDetailsQuery);
  response.send(
    fetchMatchDetailsResponse.map((eachMatch) => convertAPI2(eachMatch))
  );
});

//Returns a list of players of a specific match
//API 6
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersOfMatchQuery = `
    SELECT *
        FROM player_match_score
            NATURAL JOIN player_details
    WHERE match_id=${matchId};`;
  const getPlayersOfMatchResponse = await database.all(getPlayersOfMatchQuery);
  response.send(
    getPlayersOfMatchResponse.map((eachPlayer) => ConvertAPI1(eachPlayer))
  );
});

//Returns the statistics of the total score, fours, sixes of a specific player based on the player ID
//API 7

const playerStatsObject = (playerName, statsObj) => {
  return {
    playerId: statsObj.player_id,
    playerName: playerName,
    totalScore: statsObj.totalScore,
    totalFours: statsObj.totalFours,
    totalSixes: statsObj.totalSixes,
  };
};

//GET Returns the statistics of the total score, fours, sixes
//  of a specific player based on the player ID

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerNameQuery = `
    SELECT player_name
        FROM player_details
    WHERE player_id=${playerId};`;
  const getPlayerNameResponse = await database.get(getPlayerNameQuery);
  const getPlayerStatisticsQuery = `
    SELECT 
        player_id,
        sum(score) AS totalScore,
        sum(fours) AS totalFours,
        sum(sixes) AS totalSixes
    FROM 
        player_match_score
    WHERE 
        player_id=${playerId};`;

  const getPlayerStatisticsResponse = await database.get(
    getPlayerStatisticsQuery
  );
  response.send(
    playerStatsObject(
      getPlayerNameResponse.player_name,
      getPlayerStatisticsResponse
    )
  );
});

module.exports = app;
