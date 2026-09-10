package com.oneblock.phase;

import com.oneblock.OneBlockPlugin;
import com.oneblock.util.Items;
import org.bukkit.Material;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.entity.EntityType;
import org.bukkit.inventory.ItemStack;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;

/** Loads {@code phases.yml} and answers every "what comes next" question about progression. */
public final class PhaseManager {

    private final OneBlockPlugin plugin;
    private final List<Phase> phases = new ArrayList<>();
    private final Random random = new Random();

    public PhaseManager(OneBlockPlugin plugin) {
        this.plugin = plugin;
    }

    public void load() {
        phases.clear();
        FileConfiguration config = plugin.getConfigManager().getPhases();
        ConfigurationSection root = config.getConfigurationSection("phases");
        if (root == null) {
            plugin.getLogger().severe("phases.yml has no 'phases' section - progression is disabled.");
            return;
        }
        for (String key : root.getKeys(false)) {
            ConfigurationSection section = root.getConfigurationSection(key);
            if (section == null) {
                continue;
            }
            phases.add(readPhase(key, section));
        }
        phases.sort((a, b) -> Integer.compare(a.getRequiredBlocks(), b.getRequiredBlocks()));
        plugin.getLogger().info("Loaded " + phases.size() + " OneBlock phases.");
    }

    private Phase readPhase(String key, ConfigurationSection section) {
        Map<Material, Integer> blocks = new LinkedHashMap<>();
        for (String entry : section.getStringList("blocks")) {
            String[] parts = entry.split(":");
            Material material = Items.material(parts[0], null);
            if (material == null || !material.isBlock()) {
                plugin.getLogger().warning("Phase " + key + ": unknown block '" + parts[0] + "', skipped.");
                continue;
            }
            blocks.put(material, parts.length > 1 ? parseInt(parts[1], 1) : 1);
        }
        if (blocks.isEmpty()) {
            blocks.put(Material.STONE, 1);
        }

        Map<EntityType, Integer> mobs = new LinkedHashMap<>();
        for (String entry : section.getStringList("mobs")) {
            String[] parts = entry.split(":");
            try {
                mobs.put(EntityType.valueOf(parts[0].toUpperCase(Locale.ROOT)),
                        parts.length > 1 ? parseInt(parts[1], 1) : 1);
            } catch (IllegalArgumentException ex) {
                plugin.getLogger().warning("Phase " + key + ": unknown mob '" + parts[0] + "', skipped.");
            }
        }

        return new Phase(
                key,
                section.getString("display-name", key),
                section.getString("color", "<white>"),
                section.getInt("required-blocks", 0),
                Items.material(section.getString("icon"), Material.STONE),
                blocks,
                mobs,
                readLoot(section.getStringList("chest-loot"), key),
                readLoot(section.getStringList("special-loot"), key),
                section.getDouble("border-size", 0.0D),
                section.getString("bossbar-color", "BLUE"));
    }

    private List<ItemStack> readLoot(List<String> raw, String phaseKey) {
        List<ItemStack> loot = new ArrayList<>(raw.size());
        for (String entry : raw) {
            String[] parts = entry.split(":");
            Material material = Items.material(parts[0], null);
            if (material == null) {
                plugin.getLogger().warning("Phase " + phaseKey + ": unknown loot item '" + parts[0] + "', skipped.");
                continue;
            }
            int amount = parts.length > 1 ? Math.max(1, parseInt(parts[1], 1)) : 1;
            loot.add(new ItemStack(material, Math.min(amount, material.getMaxStackSize())));
        }
        return loot;
    }

    private int parseInt(String raw, int fallback) {
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException ex) {
            return fallback;
        }
    }

    public List<Phase> getPhases() {
        return phases;
    }

    public boolean isEmpty() {
        return phases.isEmpty();
    }

    public int size() {
        return phases.size();
    }

    /** @return the index of the phase an island with {@code blocks} broken currently sits in. */
    public int indexFor(int blocks) {
        int index = 0;
        for (int i = 0; i < phases.size(); i++) {
            if (blocks >= phases.get(i).getRequiredBlocks()) {
                index = i;
            }
        }
        return index;
    }

    public Phase byIndex(int index) {
        if (phases.isEmpty()) {
            return null;
        }
        return phases.get(Math.max(0, Math.min(index, phases.size() - 1)));
    }

    public Phase next(int index) {
        return index + 1 < phases.size() ? phases.get(index + 1) : null;
    }

    /** Progress inside the current phase, in the 0..1 range. 1 means the last phase is reached. */
    public double progress(int blocks) {
        int index = indexFor(blocks);
        Phase current = byIndex(index);
        Phase next = next(index);
        if (current == null || next == null) {
            return 1.0D;
        }
        int span = next.getRequiredBlocks() - current.getRequiredBlocks();
        if (span <= 0) {
            return 1.0D;
        }
        return Math.max(0.0D, Math.min(1.0D, (blocks - current.getRequiredBlocks()) / (double) span));
    }

    public int blocksUntilNext(int blocks) {
        Phase next = next(indexFor(blocks));
        return next == null ? 0 : Math.max(0, next.getRequiredBlocks() - blocks);
    }

    public Material randomBlock(Phase phase) {
        return weighted(phase.getBlockWeights(), Material.STONE);
    }

    public EntityType randomMob(Phase phase) {
        return weighted(phase.getMobWeights(), null);
    }

    private <T> T weighted(Map<T, Integer> weights, T fallback) {
        int total = 0;
        for (int weight : weights.values()) {
            total += Math.max(0, weight);
        }
        if (total <= 0) {
            return fallback;
        }
        int roll = random.nextInt(total);
        for (Map.Entry<T, Integer> entry : weights.entrySet()) {
            roll -= Math.max(0, entry.getValue());
            if (roll < 0) {
                return entry.getKey();
            }
        }
        return fallback;
    }

    public Random getRandom() {
        return random;
    }
}
