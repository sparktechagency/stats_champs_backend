router.patch("/status/:gameId/:teamId/:playerId", auth, async (req, res) => {
    console.log(req.params);
    try {
      const { playerId } = req.params;
      const { action } = req.body;
      const game = await Game.findById(req.params.gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      const player = await Player.findById(playerId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      const team = game.teams.find(
        (team) => team.team.toString() === req.params.teamId
      );
      if (!team) {
        return res.status(404).json({ message: "Team not found in this game" });
      }
      const playerStat = team.players.find(
        (player) => player.player.toString() === req.params.playerId
      );
      if (!playerStat) {
        return res.status(404).json({ message: "Player not found in this team" });
      }
  
      game.teams.forEach((team) => {
        team.players.forEach((player) => {
          const startTime = new Date(player.stats?.get("startTime"));
          const endTime = Date.now();
          const minutes = Math.floor((endTime - startTime) / 1000 / 60);
          player.stats?.set("TEMPMIN", (player.stats?.get("MIN") || 0) + minutes);
        });
      });
      switch (action) {
        case "point1":
          playerStat.stats?.set("FTM", (playerStat.stats?.get("FTM") || 0) + 1);
          playerStat.stats?.set("FTA", (playerStat.stats?.get("FTA") || 0) + 1);
          playerStat.stats?.set("PTS", (playerStat.stats?.get("PTS") || 0) + 1);
          playerStat.stats.set(
            "FT_PERCENT",
            (
              (playerStat.stats?.get("FTM") / playerStat.stats?.get("FTA")) *
              100
            ).toFixed(2)
          );
          team.stats.set(
            `Q${game.currentTurn}`,
            (team.stats.get(`Q${game.currentTurn}`) || 0) + 1
          );
          team.stats?.set("SCORE", (team.stats?.get("SCORE") || 0) + 1);
          team.players.forEach((teamPlayer) => {
            teamPlayer.stats?.set("PM", (teamPlayer.stats?.get("PM") || 0) + 1);
          });
          game.teams.forEach((opponentTeam) => {
            if (opponentTeam.team.toString() !== req.params.teamId) {
              opponentTeam.players.forEach((opponentPlayer) => {
                opponentPlayer.stats.set(
                  "PM",
                  (opponentPlayer.stats?.get("PM") || 0) - 1
                );
              });
            }
          });
          break;
        case "point2":
          playerStat.stats?.set("FGM", (playerStat.stats?.get("FGM") || 0) + 1);
          playerStat.stats?.set("FGA", (playerStat.stats?.get("FGA") || 0) + 1);
          playerStat.stats?.set("PTS", (playerStat.stats?.get("PTS") || 0) + 2);
          playerStat.stats.set(
            "FG_PERCENT",
            (
              (playerStat.stats?.get("FGM") / playerStat.stats?.get("FGA")) *
              100
            ).toFixed(2)
          );
          team.stats.set(
            `Q${game.currentTurn}`,
            (team.stats.get(`Q${game.currentTurn}`) || 0) + 2
          );
          team.stats?.set("SCORE", (team.stats?.get("SCORE") || 0) + 2);
          team.players.forEach((teamPlayer) => {
            teamPlayer.stats?.set("PM", (teamPlayer.stats?.get("PM") || 0) + 2);
          });
          game.teams.forEach((opponentTeam) => {
            if (opponentTeam.team.toString() !== req.params.teamId) {
              opponentTeam.players.forEach((opponentPlayer) => {
                opponentPlayer.stats.set(
                  "PM",
                  (opponentPlayer.stats?.get("PM") || 0) - 2
                );
              });
            }
          });
          break;
        case "point3":
          playerStat.stats?.set("3PM", (playerStat.stats?.get("3PM") || 0) + 1);
          playerStat.stats?.set("3PA", (playerStat.stats?.get("3PA") || 0) + 1);
          playerStat.stats?.set("PTS", (playerStat.stats?.get("PTS") || 0) + 3);
          playerStat.stats.set(
            "3P_PERCENT",
            (
              (playerStat.stats?.get("3PM") / playerStat.stats?.get("3PA")) *
              100
            ).toFixed(2)
          );
          team.stats.set(
            `Q${game.currentTurn}`,
            (team.stats.get(`Q${game.currentTurn}`) || 0) + 3
          );
          team.stats?.set("SCORE", (team.stats?.get("SCORE") || 0) + 3);
          team.players.forEach((teamPlayer) => {
            teamPlayer.stats?.set("PM", (teamPlayer.stats?.get("PM") || 0) + 3);
          });
          game.teams.forEach((opponentTeam) => {
            if (opponentTeam.team.toString() !== req.params.teamId) {
              opponentTeam.players.forEach((opponentPlayer) => {
                opponentPlayer.stats.set(
                  "PM",
                  (opponentPlayer.stats?.get("PM") || 0) - 3
                );
              });
            }
          });
          break;
        case "miss1":
          playerStat.stats?.set("FTA", (playerStat.stats?.get("FTA") || 0) + 1);
          playerStat.stats.set(
            "FT_PERCENT",
            (
              ((playerStat.stats?.get("FTM") || 0) / playerStat.stats?.get("FTA")) *
              100
            ).toFixed(2)
          );
          break;
        case "miss2":
          playerStat.stats?.set("FGA", (playerStat.stats?.get("FGA") || 0) + 1);
          playerStat.stats.set(
            "FG_PERCENT",
            (
              ((playerStat.stats?.get("FGM") || 0) / playerStat.stats?.get("FGA")) *
              100
            ).toFixed(2)
          );
          break;
        case "miss3":
          playerStat.stats?.set("3PA", (playerStat.stats?.get("3PA") || 0) + 1);
          playerStat.stats.set(
            "3P_PERCENT",
            (
              ((playerStat.stats?.get("3PM") || 0) / playerStat.stats?.get("3PA")) *
              100
            ).toFixed(2)
          );
          break;
        case "AST":
          playerStat.stats?.set("AST", (playerStat.stats?.get("AST") || 0) + 1);
          break;
        case "TO":
          playerStat.stats?.set("TO", (playerStat.stats?.get("TO") || 0) + 1);
          break;
        case "FOUL":
          playerStat.stats?.set("PF", (playerStat.stats?.get("PF") || 0) + 1);
          break;
        case "REB_OFEN":
          playerStat.stats?.set("OREB", (playerStat.stats?.get("OREB") || 0) + 1);
          playerStat.stats?.set("REB", (playerStat.stats?.get("REB") || 0) + 1);
          break;
        case "REB_DEFE":
          playerStat.stats?.set("DREB", (playerStat.stats?.get("DREB") || 0) + 1);
          playerStat.stats?.set("REB", (playerStat.stats?.get("REB") || 0) + 1);
          break;
        case "BLK":
          playerStat.stats?.set("BLK", (playerStat.stats?.get("BLK") || 0) + 1);
          break;
        case "STL":
          playerStat.stats?.set("STL", (playerStat.stats?.get("STL") || 0) + 1);
          break;
      }
      game.undoEnable = true;
      const gameaction = {
        teamId: req.params.teamId,
        playerId: req.params.playerId,
        action: req.body.action,
      };
      game.gameAction.push(gameaction);
      await game.save();
      const io = global.socketio;
      if (io) {
        const ver = "notification::" + payload?.receiver;
        io.emit("updateGame", game);
      }
  
      res.status(200).json(game);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  