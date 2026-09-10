package com.oneblock.storage;

import com.oneblock.OneBlockPlugin;
import com.oneblock.island.Island;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.World;

import java.io.File;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.logging.Level;

/** SQLite backend pooled through HikariCP. Every write leaves the main thread immediately. */
public final class SQLiteStorage implements Database {

    private static final String CREATE_ISLANDS = """
            CREATE TABLE IF NOT EXISTS ob_islands (
                owner        TEXT PRIMARY KEY,
                owner_name   TEXT NOT NULL,
                world        TEXT NOT NULL,
                x            INTEGER NOT NULL,
                y            INTEGER NOT NULL,
                z            INTEGER NOT NULL,
                blocks       INTEGER NOT NULL DEFAULT 0,
                phase_index  INTEGER NOT NULL DEFAULT 0,
                pedestal     TEXT NOT NULL DEFAULT 'none',
                halo         TEXT NOT NULL DEFAULT 'none',
                break_sound  TEXT NOT NULL DEFAULT 'default',
                hologram     INTEGER NOT NULL DEFAULT 1,
                special      INTEGER NOT NULL DEFAULT 0
            )""";

    /** Added after 1.0.0; ignored when the column is already there. */
    private static final String MIGRATE_SPECIAL =
            "ALTER TABLE ob_islands ADD COLUMN special INTEGER NOT NULL DEFAULT 0";

    private static final String CREATE_MEMBERS = """
            CREATE TABLE IF NOT EXISTS ob_members (
                owner  TEXT NOT NULL,
                member TEXT NOT NULL,
                PRIMARY KEY (owner, member)
            )""";

    private static final String CREATE_INDEX =
            "CREATE INDEX IF NOT EXISTS ob_islands_blocks ON ob_islands (blocks DESC)";

    private static final String UPSERT = """
            INSERT INTO ob_islands (owner, owner_name, world, x, y, z, blocks, phase_index,
                                    pedestal, halo, break_sound, hologram, special)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(owner) DO UPDATE SET
                owner_name = excluded.owner_name,
                world = excluded.world,
                x = excluded.x, y = excluded.y, z = excluded.z,
                blocks = excluded.blocks,
                phase_index = excluded.phase_index,
                pedestal = excluded.pedestal,
                halo = excluded.halo,
                break_sound = excluded.break_sound,
                hologram = excluded.hologram,
                special = excluded.special""";

    private final OneBlockPlugin plugin;
    private HikariDataSource dataSource;

    public SQLiteStorage(OneBlockPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public void connect() throws SQLException {
        File folder = plugin.getDataFolder();
        if (!folder.exists() && !folder.mkdirs()) {
            throw new SQLException("Could not create the plugin data folder.");
        }
        File file = new File(folder, plugin.getConfigManager().getConfig()
                .getString("storage.file", "oneblock.db"));

        HikariConfig config = new HikariConfig();
        config.setPoolName("OneBlock-SQLite");
        config.setDriverClassName("org.sqlite.JDBC");
        config.setJdbcUrl("jdbc:sqlite:" + file.getAbsolutePath());
        config.setMaximumPoolSize(plugin.getConfigManager().getConfig().getInt("storage.pool-size", 4));
        config.setConnectionTimeout(10_000L);
        config.setLeakDetectionThreshold(30_000L);
        config.addDataSourceProperty("journal_mode", "WAL");
        config.addDataSourceProperty("synchronous", "NORMAL");
        this.dataSource = new HikariDataSource(config);

        try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
            statement.executeUpdate(CREATE_ISLANDS);
            statement.executeUpdate(CREATE_MEMBERS);
            statement.executeUpdate(CREATE_INDEX);
            try {
                statement.executeUpdate(MIGRATE_SPECIAL);
            } catch (SQLException ignored) {
                // The column already exists: this database was created by a newer version.
            }
        }
    }

    @Override
    public void close() {
        if (dataSource != null && !dataSource.isClosed()) {
            dataSource.close();
        }
    }

    @Override
    public List<Island> loadIslands() {
        List<Island> islands = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement("SELECT * FROM ob_islands");
             ResultSet result = statement.executeQuery()) {
            while (result.next()) {
                Island island = read(result);
                if (island != null) {
                    islands.add(island);
                }
            }
        } catch (SQLException ex) {
            plugin.getLogger().log(Level.SEVERE, "Could not load islands", ex);
            return islands;
        }

        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement("SELECT * FROM ob_members");
             ResultSet result = statement.executeQuery()) {
            while (result.next()) {
                UUID owner = UUID.fromString(result.getString("owner"));
                UUID member = UUID.fromString(result.getString("member"));
                for (Island island : islands) {
                    if (island.getOwner().equals(owner)) {
                        island.getMembers().add(member);
                        break;
                    }
                }
            }
        } catch (SQLException ex) {
            plugin.getLogger().log(Level.SEVERE, "Could not load island members", ex);
        }
        for (Island island : islands) {
            island.clearDirty();
        }
        return islands;
    }

    private Island read(ResultSet result) throws SQLException {
        World world = Bukkit.getWorld(result.getString("world"));
        if (world == null) {
            plugin.getLogger().warning("Island of " + result.getString("owner_name")
                    + " points at the unknown world '" + result.getString("world") + "', skipped.");
            return null;
        }
        Location center = new Location(world, result.getInt("x"), result.getInt("y"), result.getInt("z"));
        Island island = new Island(UUID.fromString(result.getString("owner")),
                result.getString("owner_name"), center);
        island.setBlocksBroken(result.getInt("blocks"));
        island.setPhaseIndex(result.getInt("phase_index"));
        island.setPedestalSkin(result.getString("pedestal"));
        island.setHalo(result.getString("halo"));
        island.setBreakSound(result.getString("break_sound"));
        island.setHologramVisible(result.getInt("hologram") == 1);
        island.setSpecialBlock(result.getInt("special") == 1);
        return island;
    }

    @Override
    public void saveIsland(Island island) {
        Location center = island.getCenter();
        String worldName = center.getWorld() == null ? "world" : center.getWorld().getName();
        UUID owner = island.getOwner();
        String ownerName = island.getOwnerName();
        int x = center.getBlockX();
        int y = center.getBlockY();
        int z = center.getBlockZ();
        int blocks = island.getBlocksBroken();
        int phaseIndex = island.getPhaseIndex();
        String pedestal = island.getPedestalSkin();
        String halo = island.getHalo();
        String sound = island.getBreakSound();
        int hologram = island.isHologramVisible() ? 1 : 0;
        int special = island.isSpecialBlock() ? 1 : 0;
        List<UUID> members = new ArrayList<>(island.getMembers());
        island.clearDirty();

        plugin.async(() -> {
            try (Connection connection = dataSource.getConnection()) {
                try (PreparedStatement statement = connection.prepareStatement(UPSERT)) {
                    statement.setString(1, owner.toString());
                    statement.setString(2, ownerName);
                    statement.setString(3, worldName);
                    statement.setInt(4, x);
                    statement.setInt(5, y);
                    statement.setInt(6, z);
                    statement.setInt(7, blocks);
                    statement.setInt(8, phaseIndex);
                    statement.setString(9, pedestal);
                    statement.setString(10, halo);
                    statement.setString(11, sound);
                    statement.setInt(12, hologram);
                    statement.setInt(13, special);
                    statement.executeUpdate();
                }
                try (PreparedStatement delete = connection.prepareStatement(
                        "DELETE FROM ob_members WHERE owner = ?")) {
                    delete.setString(1, owner.toString());
                    delete.executeUpdate();
                }
                if (!members.isEmpty()) {
                    try (PreparedStatement insert = connection.prepareStatement(
                            "INSERT OR IGNORE INTO ob_members (owner, member) VALUES (?,?)")) {
                        for (UUID member : members) {
                            insert.setString(1, owner.toString());
                            insert.setString(2, member.toString());
                            insert.addBatch();
                        }
                        insert.executeBatch();
                    }
                }
            } catch (SQLException ex) {
                plugin.getLogger().log(Level.SEVERE, "Could not save the island of " + ownerName, ex);
            }
        });
    }

    @Override
    public void deleteIsland(UUID owner) {
        plugin.async(() -> {
            try (Connection connection = dataSource.getConnection()) {
                try (PreparedStatement statement = connection.prepareStatement(
                        "DELETE FROM ob_islands WHERE owner = ?")) {
                    statement.setString(1, owner.toString());
                    statement.executeUpdate();
                }
                try (PreparedStatement statement = connection.prepareStatement(
                        "DELETE FROM ob_members WHERE owner = ?")) {
                    statement.setString(1, owner.toString());
                    statement.executeUpdate();
                }
            } catch (SQLException ex) {
                plugin.getLogger().log(Level.SEVERE, "Could not delete the island of " + owner, ex);
            }
        });
    }

    @Override
    public CompletableFuture<List<LeaderboardEntry>> topPlayers(int limit) {
        CompletableFuture<List<LeaderboardEntry>> future = new CompletableFuture<>();
        plugin.async(() -> {
            List<LeaderboardEntry> entries = new ArrayList<>();
            try (Connection connection = dataSource.getConnection();
                 PreparedStatement statement = connection.prepareStatement(
                         "SELECT owner, owner_name, blocks, phase_index FROM ob_islands "
                                 + "ORDER BY blocks DESC, owner_name ASC LIMIT ?")) {
                statement.setInt(1, limit);
                try (ResultSet result = statement.executeQuery()) {
                    while (result.next()) {
                        entries.add(new LeaderboardEntry(
                                UUID.fromString(result.getString("owner")),
                                result.getString("owner_name"),
                                result.getInt("blocks"),
                                String.valueOf(result.getInt("phase_index"))));
                    }
                }
                future.complete(entries);
            } catch (SQLException ex) {
                plugin.getLogger().log(Level.SEVERE, "Could not compute the leaderboard", ex);
                future.complete(entries);
            }
        });
        return future;
    }
}
