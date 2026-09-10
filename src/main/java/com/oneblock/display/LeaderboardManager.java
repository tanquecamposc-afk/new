package com.oneblock.display;

import com.oneblock.OneBlockPlugin;
import com.oneblock.storage.Database;
import com.oneblock.util.Bars;
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
    private final UUID[] podiumIds = new UUID[3];
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
        board.text(buildBoard(0.0D));

        podium(world);
    }

    /**
     * Three floating heads under the board: the leader in the middle and slightly higher, second
     * and third to the sides. Empty places are left as a plain skull so the podium keeps its shape.
     */
    private void podium(World world) {
        double base = plugin.getConfigManager().getConfig().getDouble("leaderboard.head-height", 1.4D);
        double[][] offsets = {{0.0D, base + 0.55D}, {-0.9D, base + 0.1D}, {0.9D, base + 0.1D}};
        float[] scales = {1.3F, 1.0F, 1.0F};
        for (int i = 0; i < podiumIds.length; i++) {
            Location at = location.clone().add(offsets[i][0], offsets[i][1], 0.0D);
            ItemDisplay display = podiumHead(world, i, at, scales[i]);
            if (i < cache.size()) {
                Database.LeaderboardEntry entry = cache.get(i);
                display.setItemStack(com.oneblock.util.Items.head(Bukkit.getOfflinePlayer(entry.uuid()),
                        "<yellow>" + entry.name(), List.of()));
            } else {
                display.setItemStack(new ItemStack(org.bukkit.Material.SKELETON_SKULL));
            }
        }
    }

    private ItemDisplay podiumHead(World world, int index, Location at, float scale) {
        UUID id = podiumIds[index];
        Entity existing = id == null ? null : world.getEntity(id);
        if (existing instanceof ItemDisplay display && !display.isDead()) {
            return display;
        }
        ItemDisplay display = world.spawn(at, ItemDisplay.class, entity -> {
            entity.setBillboard(Display.Billboard.FIXED);
            entity.setBrightness(new Display.Brightness(15, 15));
            entity.setPersistent(false);
            entity.setViewRange(1.2F);
            entity.setTransformation(new Transformation(
                    new Vector3f(0.0F, 0.0F, 0.0F),
                    new Quaternionf(),
                    new Vector3f(scale, scale, scale),
                    new Quaternionf()));
        });
        podiumIds[index] = display.getUniqueId();
        return display;
    }

    /** Slow spin plus a gentle bob, so the podium reads as alive from a distance. */
    public void animate(double tick) {
        if (location == null || location.getWorld() == null) {
            return;
        }
        World world = location.getWorld();
        Entity boardEntity = boardId == null ? null : world.getEntity(boardId);
        if (boardEntity instanceof TextDisplay display && !display.isDead()) {
            display.text(buildBoard(tick));
        }
        double base = plugin.getConfigManager().getConfig().getDouble("leaderboard.head-height", 1.4D);
        double[][] offsets = {{0.0D, base + 0.55D}, {-0.9D, base + 0.1D}, {0.9D, base + 0.1D}};
        for (int i = 0; i < podiumIds.length; i++) {
            UUID id = podiumIds[i];
            Entity entity = id == null ? null : world.getEntity(id);
            if (!(entity instanceof ItemDisplay display) || display.isDead()) {
                continue;
            }
            Location at = location.clone().add(
                    offsets[i][0],
                    offsets[i][1] + Math.sin(tick + i) * 0.06D,
                    0.0D);
            at.setYaw((float) Math.toDegrees(tick * 0.6D));
            display.teleport(at);
        }
    }

    private Component buildBoard(double tick) {
        List<String> header = plugin.getConfigManager().getMessages().getStringList("leaderboard.header");
        String lineFormat = plugin.getConfigManager().getMessages().getString("leaderboard.line",
                "<medal> <color><position>.</color> <white><player></white> <gray>-</gray> <aqua><blocks></aqua>");
        String empty = plugin.getConfigManager().getMessages().getString("leaderboard.empty",
                "<gray>Todavia no hay nadie en el ranking.</gray>");

        // The gradient phase is plugin data, so it is inlined before parsing.
        String headerText = String.join("<newline>", header).replace("<shift>", Bars.shift(tick));
        Component board = header.isEmpty()
                ? Text.of("<gradient:#ffd700:#fff6a9><bold>TOP 10 ONEBLOCK</bold></gradient>")
                : Text.of(headerText);
        if (cache.isEmpty()) {
            return board.append(Component.newline()).append(Text.of(empty));
        }
        for (int i = 0; i < cache.size(); i++) {
            board = board.append(Component.newline()).append(line(lineFormat, i + 1, cache.get(i)));
        }
        String footer = plugin.getConfigManager().getMessages().getString("leaderboard.footer", "");
        if (!footer.isEmpty()) {
            board = board.append(Component.newline()).append(Text.of(footer.replace("<shift>", Bars.shift(tick))));
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

    public void despawn() {
        if (location == null || location.getWorld() == null) {
            boardId = null;
            java.util.Arrays.fill(podiumIds, null);
            return;
        }
        World world = location.getWorld();
        UUID[] all = {boardId, podiumIds[0], podiumIds[1], podiumIds[2]};
        for (UUID id : all) {
            if (id == null) {
                continue;
            }
            Entity entity = world.getEntity(id);
            if (entity != null) {
                entity.remove();
            }
        }
        boardId = null;
        java.util.Arrays.fill(podiumIds, null);
    }
}
