package com.oneblock.display;

import com.oneblock.OneBlockPlugin;
import com.oneblock.config.Messages;
import com.oneblock.island.Island;
import com.oneblock.phase.Phase;
import com.oneblock.util.Text;
import net.kyori.adventure.text.Component;
import org.bukkit.Location;
import org.bukkit.NamespacedKey;
import org.bukkit.World;
import org.bukkit.entity.Display;
import org.bukkit.entity.Entity;
import org.bukkit.entity.TextDisplay;
import org.bukkit.persistence.PersistentDataType;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** The live {@link TextDisplay} floating over the OneBlock of every island. */
public final class HologramManager {

    public static final String HOLOGRAM_TAG = "oneblock-hologram";

    private final OneBlockPlugin plugin;
    private final Map<UUID, UUID> holograms = new ConcurrentHashMap<>();
    private final NamespacedKey key;

    public HologramManager(OneBlockPlugin plugin) {
        this.plugin = plugin;
        this.key = new NamespacedKey(plugin, "hologram");
    }

    /** Creates the hologram if needed and rewrites its text with the current island state. */
    public void refresh(Island island) {
        Location center = island.getCenter();
        World world = center.getWorld();
        if (world == null) {
            return;
        }
        if (!island.isHologramVisible()) {
            remove(island);
            return;
        }
        if (!world.isChunkLoaded(center.getBlockX() >> 4, center.getBlockZ() >> 4)) {
            return;
        }

        TextDisplay display = find(island, world);
        if (display == null) {
            double height = plugin.getConfigManager().getConfig().getDouble("hologram.height", 1.9D);
            Location at = center.clone().add(0.5D, height, 0.5D);
            display = world.spawn(at, TextDisplay.class, entity -> {
                entity.setBillboard(Display.Billboard.CENTER);
                entity.setAlignment(TextDisplay.TextAlignment.CENTER);
                entity.setSeeThrough(false);
                entity.setShadowed(true);
                entity.setViewRange(0.8F);
                entity.setPersistent(false);
                entity.setBackgroundColor(org.bukkit.Color.fromARGB(90, 0, 0, 0));
                entity.getPersistentDataContainer().set(key, PersistentDataType.STRING, HOLOGRAM_TAG);
            });
            holograms.put(island.getOwner(), display.getUniqueId());
        }
        display.text(buildText(island));
    }

    private Component buildText(Island island) {
        Phase phase = plugin.getPhaseManager().byIndex(island.getPhaseIndex());
        Phase next = plugin.getPhaseManager().next(island.getPhaseIndex());
        int progressPercent = (int) Math.round(plugin.getPhaseManager().progress(island.getBlocksBroken()) * 100.0D);
        String template = String.join("<newline>",
                plugin.getConfigManager().getMessages().getStringList("hologram.island"));
        if (template.isEmpty()) {
            template = "<gradient:#00ffcc:#0088ff><bold><owner></bold></gradient><newline>"
                    + "<color><phase></color> <gray>|</gray> <white><blocks></white> <gray>bloques</gray>";
        }
        return Text.of(template, Messages.of(
                "owner", island.getOwnerName() == null ? "?" : island.getOwnerName(),
                "phase", phase == null ? "?" : Text.plain(phase.getDisplayName()),
                "blocks", String.valueOf(island.getBlocksBroken()),
                "progress", String.valueOf(progressPercent),
                "bar", bar(progressPercent),
                "next", next == null ? "MAX" : Text.plain(next.getDisplayName()),
                "remaining", String.valueOf(plugin.getPhaseManager().blocksUntilNext(island.getBlocksBroken()))));
    }

    private String bar(int percent) {
        int filled = Math.max(0, Math.min(20, percent / 5));
        return "|".repeat(filled) + "·".repeat(20 - filled);
    }

    private TextDisplay find(Island island, World world) {
        UUID id = holograms.get(island.getOwner());
        if (id == null) {
            return null;
        }
        Entity entity = world.getEntity(id);
        if (entity instanceof TextDisplay display && !display.isDead()) {
            return display;
        }
        holograms.remove(island.getOwner());
        return null;
    }

    public void remove(Island island) {
        UUID id = holograms.remove(island.getOwner());
        World world = island.getCenter().getWorld();
        if (id == null || world == null) {
            return;
        }
        Entity entity = world.getEntity(id);
        if (entity != null) {
            entity.remove();
        }
    }

    public void removeAll() {
        for (Island island : plugin.getIslandManager().getIslands()) {
            remove(island);
        }
    }

    /** Drops hologram entities left behind by a crash or a reload. */
    public void cleanupOrphans(World world) {
        if (world == null) {
            return;
        }
        for (Entity entity : world.getEntities()) {
            if (!(entity instanceof TextDisplay)) {
                continue;
            }
            String tag = entity.getPersistentDataContainer().get(key, PersistentDataType.STRING);
            if (HOLOGRAM_TAG.equals(tag)) {
                entity.remove();
            }
        }
    }
}
