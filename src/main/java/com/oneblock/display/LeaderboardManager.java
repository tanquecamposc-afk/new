package com.oneblock.display;

import com.oneblock.OneBlockPlugin;
import com.oneblock.storage.Database;
import com.oneblock.util.Text;
import net.kyori.adventure.text.Component;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.OfflinePlayer;
import org.bukkit.World;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Display;
import org.bukkit.entity.Entity;
import org.bukkit.entity.ItemDisplay;
import org.bukkit.entity.TextDisplay;
import org.bukkit.inventory.ItemStack;
import org.bukkit.util.Transformation;
import org.joml.Quaternionf;
import org.joml.Vector3f;

import java.io.File;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;

/**
 * The floating Top 10: one {@link TextDisplay} for the board plus one {@link ItemDisplay} holding
 * the head of the current leader. The ranking itself is recomputed asynchronously.
 */
public final class LeaderboardManager {

    private final OneBlockPlugin plugin;
    private final File file;

    private Location location;
    private UUID boardId;
    private UUID headId;
    private List<Database.LeaderboardEntry> cache = Collections.emptyList();

    public LeaderboardManager(OneBlockPlugin plugin) {
        this.plugin = plugin;
        this.file = new File(plugin.getDataFolder(), "leaderboard.yml");
    }

    public void load() {
        if (!file.exists()) {
            return;
        }
        FileConfiguration data = YamlConfiguration.loadConfiguration(file);
        this.location = data.getLocation("location");
    }

    public void save() {
        FileConfiguration data = new YamlConfiguration();
        if (location != null) {
            data.set("location", location);
        }
        try {
            data.save(file);
        } catch (IOException ex) {
            plugin.getLogger().log(Level.SEVERE, "Could not save leaderboard.yml", ex);
        }
    }

    /** Moves (or creates) the hologram at {@code location}. */
    public void setLocation(Location target) {
        despawn();
        this.location = target.clone();
        save();
        refresh();
    }

    public Location getLocation() {
        return location == null ? null : location.clone();
    }

    public List<Database.LeaderboardEntry> getTop() {
        return cache;
    }

    /** @return the entry at {@code position} (1-based), or {@code null}. */
    public Database.LeaderboardEntry get(int position) {
        return position >= 1 && position <= cache.size() ? cache.get(position - 1) : null;
    }

    /** Recomputes the ranking off the main thread and repaints the hologram on the main thread. */
    public void refresh() {
        // Islands only autosave every N blocks, so flush pending progress before ranking.
        plugin.getIslandManager().saveAll();
        int limit = plugin.getConfigManager().getConfig().getInt("leaderboard.size", 10);
        plugin.getStorage().topPlayers(limit).thenAccept(entries -> plugin.sync(() -> {
            this.cache = entries;
            render();
        }));
    }

    private void render() {
        if (location == null || location.getWorld() == null) {
            return;
        }
        World world = location.getWorld();
        if (!world.isChunkLoaded(location.getBlockX() >> 4, location.getBlockZ() >> 4)) {
            return;
        }

        TextDisplay board = board(world);
        board.text(buildBoard());

        Database.LeaderboardEntry leader = cache.isEmpty() ? null : cache.get(0);
        ItemDisplay head = head(world);
        if (leader == null) {
            head.setItemStack(new ItemStack(org.bukkit.Material.PLAYER_HEAD));
            return;
        }
        OfflinePlayer offline = Bukkit.getOfflinePlayer(leader.uuid());
        head.setItemStack(com.oneblock.util.Items.head(offline, "<yellow>" + leader.name(), List.of()));
    }

    private Component buildBoard() {
        List<String> header = plugin.getConfigManager().getMessages().getStringList("leaderboard.header");
        String lineFormat = plugin.getConfigManager().getMessages().getString("leaderboard.line",
                "<medal> <color><position>.</color> <white><player></white> <gray>-</gray> <aqua><blocks></aqua>");
        String empty = plugin.getConfigManager().getMessages().getString("leaderboard.empty",
                "<gray>Todavia no hay nadie en el ranking.</gray>");

        Component board = header.isEmpty()
                ? Text.of("<gradient:#ffd700:#fff6a9><bold>TOP 10 JUGADORES ONEBLOCK</bold></gradient>")
                : Text.of(String.join("<newline>", header));
        if (cache.isEmpty()) {
            return board.append(Component.newline()).append(Text.of(empty));
        }
        for (int i = 0; i < cache.size(); i++) {
            board = board.append(Component.newline()).append(line(lineFormat, i + 1, cache.get(i)));
        }
        return board;
    }

    /**
     * Builds one row. Medal and colour are plugin-controlled tags and are inlined, but the player
     * name is passed as an unparsed placeholder so a name can never inject MiniMessage into the board.
     */
    private Component line(String format, int position, Database.LeaderboardEntry entry) {
        String template = format
                .replace("<medal>", medal(position))
                .replace("<color>", positionColor(position))
                .replace("<position>", String.valueOf(position));
        return Text.of(template, com.oneblock.config.Messages.of(
                "player", entry.name() == null ? "?" : entry.name(),
                "blocks", String.valueOf(entry.blocks())));
    }

    private String medal(int position) {
        return switch (position) {
            case 1 -> "<gold>✦</gold>";
            case 2 -> "<gray>✦</gray>";
            case 3 -> "<color:#cd7f32>✦</color>";
            default -> "<dark_gray>•</dark_gray>";
        };
    }

    private String positionColor(int position) {
        return switch (position) {
            case 1 -> "<gold>";
            case 2 -> "<gray>";
            case 3 -> "<color:#cd7f32>";
            default -> "<dark_gray>";
        };
    }

    private TextDisplay board(World world) {
        Entity existing = boardId == null ? null : world.getEntity(boardId);
        if (existing instanceof TextDisplay display && !display.isDead()) {
            return display;
        }
        TextDisplay display = world.spawn(location.clone(), TextDisplay.class, entity -> {
            entity.setBillboard(Display.Billboard.CENTER);
            entity.setAlignment(TextDisplay.TextAlignment.CENTER);
            entity.setShadowed(true);
            entity.setSeeThrough(false);
            entity.setPersistent(false);
            entity.setViewRange(1.2F);
            entity.setBackgroundColor(org.bukkit.Color.fromARGB(120, 0, 0, 0));
        });
        boardId = display.getUniqueId();
        return display;
    }

    private ItemDisplay head(World world) {
        Entity existing = headId == null ? null : world.getEntity(headId);
        if (existing instanceof ItemDisplay display && !display.isDead()) {
            return display;
        }
        double offset = plugin.getConfigManager().getConfig().getDouble("leaderboard.head-height", 1.4D);
        ItemDisplay display = world.spawn(location.clone().add(0.0D, offset, 0.0D), ItemDisplay.class, entity -> {
            entity.setBillboard(Display.Billboard.VERTICAL);
            entity.setBrightness(new Display.Brightness(15, 15));
            entity.setPersistent(false);
            entity.setViewRange(1.2F);
            entity.setTransformation(new Transformation(
                    new Vector3f(0.0F, 0.0F, 0.0F),
                    new Quaternionf(),
                    new Vector3f(1.2F, 1.2F, 1.2F),
                    new Quaternionf()));
        });
        headId = display.getUniqueId();
        return display;
    }

    public void despawn() {
        if (location == null || location.getWorld() == null) {
            boardId = null;
            headId = null;
            return;
        }
        World world = location.getWorld();
        for (UUID id : new UUID[]{boardId, headId}) {
            if (id == null) {
                continue;
            }
            Entity entity = world.getEntity(id);
            if (entity != null) {
                entity.remove();
            }
        }
        boardId = null;
        headId = null;
    }
}
