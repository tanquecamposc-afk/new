package com.oneblock.cosmetics;

import com.oneblock.OneBlockPlugin;
import com.oneblock.api.OneBlockSkinChangeEvent;
import com.oneblock.island.Island;
import com.oneblock.util.Items;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.World;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.entity.Display;
import org.bukkit.entity.Entity;
import org.bukkit.entity.ItemDisplay;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.util.Transformation;
import org.joml.Quaternionf;
import org.joml.Vector3f;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Owns every cosmetic: floating pedestals ({@link ItemDisplay}), particle halos and custom break
 * sounds. Pedestal entities are tagged with a persistent key so leftovers from a crash are cleaned up.
 */
public final class SkinManager {

    public static final String PEDESTAL_TAG = "oneblock-pedestal";

    private final OneBlockPlugin plugin;
    private final Map<String, BlockSkin> skins = new LinkedHashMap<>();
    private final Map<UUID, List<UUID>> pedestals = new ConcurrentHashMap<>();
    private final Map<UUID, String> applied = new ConcurrentHashMap<>();
    private final NamespacedKey key;

    public SkinManager(OneBlockPlugin plugin) {
        this.plugin = plugin;
        this.key = new NamespacedKey(plugin, "cosmetic");
    }

    public void load() {
        skins.clear();
        ConfigurationSection root = plugin.getConfigManager().getSkins().getConfigurationSection("skins");
        if (root == null) {
            plugin.getLogger().warning("skins.yml has no 'skins' section - cosmetics are disabled.");
            return;
        }
        for (String id : root.getKeys(false)) {
            ConfigurationSection section = root.getConfigurationSection(id);
            if (section == null) {
                continue;
            }
            BlockSkin skin = read(id, section);
            if (skin != null) {
                skins.put(id.toLowerCase(Locale.ROOT), skin);
            }
        }
        plugin.getLogger().info("Loaded " + skins.size() + " cosmetics.");
    }

    private BlockSkin read(String id, ConfigurationSection section) {
        BlockSkin.Type type;
        try {
            type = BlockSkin.Type.valueOf(section.getString("type", "HALO").toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            plugin.getLogger().warning("Cosmetic " + id + " has an unknown type, skipped.");
            return null;
        }
        BlockSkin.Shape shape;
        try {
            shape = BlockSkin.Shape.valueOf(section.getString("shape", "RING").toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            shape = BlockSkin.Shape.RING;
        }
        return new BlockSkin(
                id.toLowerCase(Locale.ROOT),
                type,
                section.getString("display-name", id),
                section.getStringList("lore"),
                Items.material(section.getString("icon"), Material.NETHER_STAR),
                section.getString("permission", "oneblock.skin." + id.toLowerCase(Locale.ROOT)),
                section.getInt("required-phase", 0),
                Items.material(section.getString("pedestal-material"), Material.AMETHYST_BLOCK),
                (float) section.getDouble("pedestal-scale", 0.35D),
                Math.max(1, section.getInt("pedestal-count", 4)),
                shape,
                section.getStringList("particles"),
                Math.max(1, section.getInt("particle-count", 2)),
                section.getDouble("radius", 1.1D),
                section.getInt("color.red", 255),
                section.getInt("color.green", 85),
                section.getInt("color.blue", 255),
                section.getString("sound", "block.stone.break"),
                (float) section.getDouble("pitch", 1.0D),
                (float) section.getDouble("volume", 1.0D));
    }

    public BlockSkin get(String id) {
        return id == null ? null : skins.get(id.toLowerCase(Locale.ROOT));
    }

    public List<BlockSkin> byType(BlockSkin.Type type) {
        List<BlockSkin> out = new ArrayList<>();
        for (BlockSkin skin : skins.values()) {
            if (skin.getType() == type) {
                out.add(skin);
            }
        }
        return out;
    }

    /** A cosmetic is unlocked by permission OR by having reached its phase. */
    public boolean isUnlocked(Player player, Island island, BlockSkin skin) {
        if (player.hasPermission("oneblock.skin.*") || player.hasPermission(skin.getPermission())) {
            return true;
        }
        return skin.getRequiredPhase() > 0 && island != null && island.getPhaseIndex() >= skin.getRequiredPhase();
    }

    /** Equips a cosmetic. Returns false when the player may not use it or the event was cancelled. */
    public boolean equip(Player player, Island island, BlockSkin skin) {
        if (!isUnlocked(player, island, skin)) {
            return false;
        }
        OneBlockSkinChangeEvent event = new OneBlockSkinChangeEvent(player, island, skin);
        plugin.getServer().getPluginManager().callEvent(event);
        if (event.isCancelled()) {
            return false;
        }
        switch (skin.getType()) {
            case PEDESTAL -> island.setPedestalSkin(skin.getId());
            case HALO -> island.setHalo(skin.getId());
            case SOUND -> island.setBreakSound(skin.getId());
            default -> {
                return false;
            }
        }
        apply(island);
        plugin.getStorage().saveIsland(island);
        return true;
    }

    /** Clears the cosmetic of the given slot. */
    public void unequip(Island island, BlockSkin.Type type) {
        switch (type) {
            case PEDESTAL -> island.setPedestalSkin("none");
            case HALO -> island.setHalo("none");
            case SOUND -> island.setBreakSound("default");
            default -> {
            }
        }
        apply(island);
        plugin.getStorage().saveIsland(island);
    }

    /** Rebuilds the pedestal entities of an island to match its equipped cosmetic. */
    public void apply(Island island) {
        String wanted = island.getPedestalSkin() == null ? "none" : island.getPedestalSkin();
        if (wanted.equals(applied.get(island.getOwner())) && pedestals.containsKey(island.getOwner())) {
            return;
        }
        despawnPedestals(island);
        applied.put(island.getOwner(), wanted);
        BlockSkin skin = get(island.getPedestalSkin());
        if (skin == null || skin.getType() != BlockSkin.Type.PEDESTAL) {
            return;
        }
        Location center = island.getCenter();
        World world = center.getWorld();
        if (world == null || !world.isChunkLoaded(center.getBlockX() >> 4, center.getBlockZ() >> 4)) {
            return;
        }
        List<UUID> spawned = new ArrayList<>(skin.getPedestalCount());
        ItemStack item = new ItemStack(skin.getPedestalMaterial());
        for (int i = 0; i < skin.getPedestalCount(); i++) {
            double angle = 2.0D * Math.PI * i / skin.getPedestalCount();
            Location at = center.clone().add(0.5D + Math.cos(angle) * 1.2D, 0.15D, 0.5D + Math.sin(angle) * 1.2D);
            ItemDisplay display = world.spawn(at, ItemDisplay.class, entity -> {
                entity.setItemStack(item);
                entity.setBillboard(Display.Billboard.FIXED);
                entity.setBrightness(new Display.Brightness(15, 15));
                entity.setViewRange(0.6F);
                entity.setPersistent(false);
                entity.setTransformation(new Transformation(
                        new Vector3f(0.0F, 0.0F, 0.0F),
                        new Quaternionf(),
                        new Vector3f(skin.getPedestalScale(), skin.getPedestalScale(), skin.getPedestalScale()),
                        new Quaternionf()));
                entity.getPersistentDataContainer().set(key, PersistentDataType.STRING, PEDESTAL_TAG);
            });
            spawned.add(display.getUniqueId());
        }
        pedestals.put(island.getOwner(), spawned);
    }

    /** Slow rotation of the pedestal ring, driven by {@link ParticleHaloTask}. */
    public void animatePedestals(Island island, double phaseAngle) {
        List<UUID> ids = pedestals.get(island.getOwner());
        if (ids == null || ids.isEmpty()) {
            return;
        }
        Location center = island.getCenter();
        World world = center.getWorld();
        if (world == null) {
            return;
        }
        for (int i = 0; i < ids.size(); i++) {
            Entity entity = world.getEntity(ids.get(i));
            if (!(entity instanceof ItemDisplay display) || display.isDead()) {
                continue;
            }
            double angle = phaseAngle + 2.0D * Math.PI * i / ids.size();
            Location at = center.clone().add(
                    0.5D + Math.cos(angle) * 1.2D,
                    0.15D + Math.sin(phaseAngle * 2.0D) * 0.12D,
                    0.5D + Math.sin(angle) * 1.2D);
            at.setYaw((float) Math.toDegrees(-angle));
            display.teleport(at);
        }
    }

    public void despawnPedestals(Island island) {
        applied.remove(island.getOwner());
        List<UUID> ids = pedestals.remove(island.getOwner());
        if (ids == null) {
            return;
        }
        World world = island.getCenter().getWorld();
        if (world == null) {
            return;
        }
        for (UUID id : ids) {
            Entity entity = world.getEntity(id);
            if (entity != null) {
                entity.remove();
            }
        }
    }

    public void despawnAll() {
        for (Island island : plugin.getIslandManager().getIslands()) {
            despawnPedestals(island);
        }
    }

    /** Removes pedestals left behind by a crash or a reload. */
    public void cleanupOrphans(World world) {
        if (world == null) {
            return;
        }
        for (Entity entity : world.getEntities()) {
            if (!(entity instanceof ItemDisplay)) {
                continue;
            }
            String tag = entity.getPersistentDataContainer().get(key, PersistentDataType.STRING);
            if (PEDESTAL_TAG.equals(tag)) {
                entity.remove();
            }
        }
    }

    public NamespacedKey getKey() {
        return key;
    }
}
