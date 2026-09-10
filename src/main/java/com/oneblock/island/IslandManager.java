package com.oneblock.island;

import com.oneblock.OneBlockPlugin;
import com.oneblock.phase.Phase;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.WorldCreator;
import org.bukkit.WorldType;
import org.bukkit.entity.Player;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Owns the island cache, the island grid layout and every island lifecycle operation. */
public final class IslandManager {

    private final OneBlockPlugin plugin;
    private final Map<UUID, Island> islands = new ConcurrentHashMap<>();
    private final Map<UUID, UUID> membership = new ConcurrentHashMap<>();
    /** Grid cell -> island, so looking up "which island is here" never scans the whole map. */
    private final Map<Long, Island> byGrid = new ConcurrentHashMap<>();

    private World world;

    public IslandManager(OneBlockPlugin plugin) {
        this.plugin = plugin;
    }

    /** Loads (or creates) the void world islands live in. Must run on the main thread. */
    public void prepareWorld() {
        String name = plugin.getConfigManager().getConfig().getString("world.name", "oneblock");
        World existing = Bukkit.getWorld(name);
        if (existing != null) {
            this.world = existing;
            return;
        }
        WorldCreator creator = new WorldCreator(name)
                .type(WorldType.FLAT)
                .generatorSettings("{\"layers\":[],\"biome\":\"minecraft:plains\"}")
                .generateStructures(false);
        this.world = creator.createWorld();
        if (world == null) {
            plugin.getLogger().severe("Could not create the world '" + name + "'.");
            return;
        }
        world.setSpawnLocation(0, 101, 0);
        if (plugin.getConfigManager().getConfig().getBoolean("world.always-day", true)) {
            world.setTime(6000L);
            world.setGameRule(org.bukkit.GameRule.DO_DAYLIGHT_CYCLE, Boolean.FALSE);
        }
    }

    public World getWorld() {
        return world;
    }

    public void cache(Island island) {
        islands.put(island.getOwner(), island);
        byGrid.put(gridKey(island.getCenter()), island);
        for (UUID member : island.getMembers()) {
            membership.put(member, island.getOwner());
        }
    }

    /** Packs the grid cell a location belongs to into a single long. */
    private long gridKey(Location location) {
        int spacing = plugin.getConfigManager().getConfig().getInt("world.island-spacing", 512);
        long gridX = Math.floorDiv(location.getBlockX() + spacing / 2, spacing);
        long gridZ = Math.floorDiv(location.getBlockZ() + spacing / 2, spacing);
        return (gridX << 32) ^ (gridZ & 0xffffffffL);
    }

    public Collection<Island> getIslands() {
        return islands.values();
    }

    public Island getIsland(UUID owner) {
        return islands.get(owner);
    }

    /** @return the island a player owns or is a member of, or {@code null}. */
    public Island getIslandOf(UUID player) {
        Island own = islands.get(player);
        if (own != null) {
            return own;
        }
        UUID ownerId = membership.get(player);
        return ownerId == null ? null : islands.get(ownerId);
    }

    /**
     * @return the island whose grid cell contains {@code location}, or {@code null}. O(1): this runs
     *     on every move, break and explosion, so it must never scan the island map.
     */
    public Island getIslandAt(Location location) {
        if (world == null || location.getWorld() == null || !location.getWorld().equals(world)) {
            return null;
        }
        return byGrid.get(gridKey(location));
    }

    /** Creates a brand new island for {@code player}, places its OneBlock and stores it. */
    public Island create(Player player) {
        if (world == null) {
            prepareWorld();
        }
        if (world == null) {
            return null;
        }
        Location center = nextFreeCenter();
        Island island = new Island(player.getUniqueId(), player.getName(), center);
        island.markDirty();
        cache(island);

        center.getBlock().setType(Material.GRASS_BLOCK);
        applyBorder(island);
        plugin.getHologramManager().refresh(island);
        plugin.getSkinManager().apply(island);
        plugin.getStorage().saveIsland(island);
        return island;
    }

    /** Islands sit on a square spiral grid, so a world never needs pre-generation. */
    private Location nextFreeCenter() {
        int spacing = plugin.getConfigManager().getConfig().getInt("world.island-spacing", 512);
        int y = plugin.getConfigManager().getConfig().getInt("world.island-y", 100);
        int gridX = 0;
        int gridZ = 0;
        int stepX = 1;
        int stepZ = 0;
        int segmentLength = 1;
        int stepsTaken = 0;
        int turns = 0;
        for (int guard = 0; guard < 1_000_000; guard++) {
            Location candidate = new Location(world, gridX * (double) spacing, y, gridZ * (double) spacing);
            if (!isOccupied(candidate)) {
                return candidate;
            }
            gridX += stepX;
            gridZ += stepZ;
            if (++stepsTaken == segmentLength) {
                stepsTaken = 0;
                int previousX = stepX;
                stepX = -stepZ;
                stepZ = previousX;
                if (++turns % 2 == 0) {
                    segmentLength++;
                }
            }
        }
        // Practically unreachable: a million occupied cells means the grid is full.
        return new Location(world, 0.0D, y, 0.0D);
    }

    private boolean isOccupied(Location location) {
        return byGrid.containsKey(gridKey(location));
    }

    public void teleport(Player player, Island island) {
        Location spawn = island.getSpawn();
        if (spawn.getWorld() == null) {
            return;
        }
        spawn.getWorld().getChunkAtAsync(spawn).thenAccept(chunk -> {
            player.teleportAsync(spawn);
            applyBorder(player, island);
            plugin.getHudManager().show(player, island);
        });
    }

    /** Grows the animated world border of every player currently on the island. */
    public void applyBorder(Island island) {
        for (Player player : plugin.getServer().getOnlinePlayers()) {
            Island current = getIslandAt(player.getLocation());
            if (current != null && current.getOwner().equals(island.getOwner())) {
                applyBorder(player, island);
            }
        }
    }

    public void applyBorder(Player player, Island island) {
        if (!plugin.getConfigManager().getConfig().getBoolean("border.enabled", true)) {
            return;
        }
        Phase phase = plugin.getPhaseManager().byIndex(island.getPhaseIndex());
        double size = phase == null || phase.getBorderSize() <= 0.0D
                ? plugin.getConfigManager().getConfig().getDouble("border.default-size", 64.0D)
                : phase.getBorderSize();
        long seconds = plugin.getConfigManager().getConfig().getLong("border.animation-seconds", 3L);
        org.bukkit.WorldBorder border = Bukkit.createWorldBorder();
        border.setCenter(island.getCenter().add(0.5D, 0.0D, 0.5D));
        border.setSize(Math.max(16.0D, size), seconds);
        border.setWarningDistance(2);
        player.setWorldBorder(border);
    }

    public void addMember(Island island, UUID member) {
        island.getMembers().add(member);
        membership.put(member, island.getOwner());
        island.markDirty();
        plugin.getStorage().saveIsland(island);
    }

    public void removeMember(Island island, UUID member) {
        island.getMembers().remove(member);
        membership.remove(member);
        island.markDirty();
        plugin.getStorage().saveIsland(island);
    }

    /** Hands the island over to a new owner, keeping progress and cosmetics. */
    public Island transfer(Island island, UUID newOwner, String newOwnerName) {
        islands.remove(island.getOwner());
        byGrid.remove(gridKey(island.getCenter()));
        Island transferred = new Island(newOwner, newOwnerName, island.getCenter());
        transferred.setBlocksBroken(island.getBlocksBroken());
        transferred.setPhaseIndex(island.getPhaseIndex());
        transferred.setPedestalSkin(island.getPedestalSkin());
        transferred.setHalo(island.getHalo());
        transferred.setBreakSound(island.getBreakSound());
        transferred.setHologramVisible(island.isHologramVisible());
        transferred.getMembers().addAll(island.getMembers());
        transferred.getMembers().remove(newOwner);
        transferred.getMembers().add(island.getOwner());
        cache(transferred);
        plugin.getStorage().deleteIsland(island.getOwner());
        plugin.getStorage().saveIsland(transferred);
        plugin.getHologramManager().refresh(transferred);
        plugin.getSkinManager().apply(transferred);
        return transferred;
    }

    public void saveAll() {
        for (Island island : islands.values()) {
            if (island.isDirty()) {
                plugin.getStorage().saveIsland(island);
            }
        }
    }
}
