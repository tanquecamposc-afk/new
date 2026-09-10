package com.oneblock.display;

import com.oneblock.OneBlockPlugin;
import com.oneblock.config.Messages;
import com.oneblock.island.Island;
import com.oneblock.phase.Phase;
import com.oneblock.util.Bars;
import com.oneblock.util.Text;
import net.kyori.adventure.text.Component;
import org.bukkit.Location;
import org.bukkit.NamespacedKey;
import org.bukkit.World;
import org.bukkit.entity.Display;
import org.bukkit.entity.Entity;
import org.bukkit.entity.ItemDisplay;
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
    private final Map<UUID, UUID> icons = new ConcurrentHashMap<>();
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
        display.text(buildText(island, 0.0D));
        icon(island, world);
    }

    /**
     * Floating icon of the current phase, hovering over the hologram. It is the only part of the
     * island hologram that is not text, and it makes the phase readable from far away.
     */
    private void icon(Island island, World world) {
        if (!plugin.getConfigManager().getConfig().getBoolean("hologram.phase-icon", true)) {
            return;
        }
        Phase phase = plugin.getPhaseManager().byIndex(island.getPhaseIndex());
        if (phase == null) {
            return;
        }
        double height = plugin.getConfigManager().getConfig().getDouble("hologram.height", 1.9D);
        Location at = island.getCenter().add(0.5D, height + 0.75D, 0.5D);
        UUID id = icons.get(island.getOwner());
        Entity existing = id == null ? null : world.getEntity(id);
        if (existing instanceof ItemDisplay display && !display.isDead()) {
            display.setItemStack(new org.bukkit.inventory.ItemStack(phase.getIcon()));
            return;
        }
        ItemDisplay display = world.spawn(at, ItemDisplay.class, entity -> {
            entity.setItemStack(new org.bukkit.inventory.ItemStack(phase.getIcon()));
            entity.setBillboard(Display.Billboard.FIXED);
            entity.setBrightness(new Display.Brightness(15, 15));
            entity.setViewRange(0.8F);
            entity.setPersistent(false);
            entity.setTransformation(new org.bukkit.util.Transformation(
                    new org.joml.Vector3f(0.0F, 0.0F, 0.0F),
                    new org.joml.Quaternionf(),
                    new org.joml.Vector3f(0.55F, 0.55F, 0.55F),
                    new org.joml.Quaternionf()));
            entity.getPersistentDataContainer().set(key, PersistentDataType.STRING, HOLOGRAM_TAG);
        });
        icons.put(island.getOwner(), display.getUniqueId());
    }

    /** Repaints the animated part of the hologram: gradient phase and the spinning phase icon. */
    public void animate(Island island, double tick) {
        if (!island.isHologramVisible()) {
            return;
        }
        World world = island.getCenter().getWorld();
        if (world == null) {
            return;
        }
        TextDisplay display = find(island, world);
        if (display != null) {
            display.text(buildText(island, tick));
        }
        UUID id = icons.get(island.getOwner());
        Entity entity = id == null ? null : world.getEntity(id);
        if (entity instanceof ItemDisplay icon && !icon.isDead()) {
            double height = plugin.getConfigManager().getConfig().getDouble("hologram.height", 1.9D);
            Location at = island.getCenter().add(0.5D, height + 0.75D + Math.sin(tick) * 0.08D, 0.5D);
            at.setYaw((float) Math.toDegrees(tick));
            icon.teleport(at);
        }
    }

    private Component buildText(Island island, double tick) {
        Phase phase = plugin.getPhaseManager().byIndex(island.getPhaseIndex());
        int progressPercent = (int) Math.round(plugin.getPhaseManager().progress(island.getBlocksBroken()) * 100.0D);
        String template = String.join("<newline>",
                plugin.getConfigManager().getMessages().getStringList("hologram.island"));
        if (template.isEmpty()) {
            template = "<gradient:#00ffcc:#0088ff:<shift>><bold><owner></bold></gradient><newline>"
                    + "<phase> <dark_gray>|</dark_gray> <white><blocks></white> <gray>bloques</gray>";
        }
        // The gradient phase is plugin data, not player data, so it is inlined before parsing.
        template = template.replace("<shift>", Bars.shift(tick))
                .replace("<phase_color>", phase == null ? "<white>" : phase.getColorTag());
        template = template.replace("<bar>",
                Bars.phaseProgress(plugin.getPhaseManager().progress(island.getBlocksBroken()), 16));
        return Text.of(template, Messages.of(
                "owner", island.getOwnerName() == null ? "?" : island.getOwnerName(),
                "phase", plugin.getPhaseManager().labelFor(island.getBlocksBroken(), phase),
                "blocks", String.valueOf(island.getBlocksBroken()),
                "progress", String.valueOf(progressPercent),
                "next", plugin.getPhaseManager().nextLabelFor(island.getBlocksBroken()),
                "remaining", String.valueOf(plugin.getPhaseManager().blocksUntilNext(island.getBlocksBroken()))));
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
        World world = island.getCenter().getWorld();
        if (world == null) {
            holograms.remove(island.getOwner());
            icons.remove(island.getOwner());
            return;
        }
        for (UUID id : new UUID[]{holograms.remove(island.getOwner()), icons.remove(island.getOwner())}) {
            if (id == null) {
                continue;
            }
            Entity entity = world.getEntity(id);
            if (entity != null) {
                entity.remove();
            }
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
            if (!(entity instanceof TextDisplay) && !(entity instanceof ItemDisplay)) {
                continue;
            }
            String tag = entity.getPersistentDataContainer().get(key, PersistentDataType.STRING);
            if (HOLOGRAM_TAG.equals(tag)) {
                entity.remove();
            }
        }
    }
}
