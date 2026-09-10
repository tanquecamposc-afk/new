package com.oneblock.storage;

import com.oneblock.island.Island;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/** Storage contract, so a MySQL backend can be dropped in without touching the rest of the plugin. */
public interface Database {

    void connect() throws Exception;

    void close();

    /** Loads every island. Runs on the calling thread - the plugin calls it off the main thread. */
    List<Island> loadIslands();

    /** Fire-and-forget asynchronous write. */
    void saveIsland(Island island);

    void deleteIsland(UUID owner);

    /** Top {@code limit} islands ordered by blocks broken, resolved asynchronously. */
    CompletableFuture<List<LeaderboardEntry>> topPlayers(int limit);

    /** One row of the leaderboard. */
    record LeaderboardEntry(UUID uuid, String name, int blocks, String phaseId) {
    }
}
