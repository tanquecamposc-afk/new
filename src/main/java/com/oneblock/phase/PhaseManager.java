package com.oneblock.phase;

import com.oneblock.OneBlockPlugin;
import com.oneblock.util.Items;
import org.bukkit.Material;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.entity.EntityType;
import org.bukkit.inventory.ItemStack;

import java.util.ArrayList;
import java.util.EnumMap;
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
                readChests(section, key),
                readLoot(section.getStringList("special-loot"), key),
                section.getDouble("border-size", 0.0D),
                section.getString("bossbar-color", "BLUE"));
    }

    /**
     * Chests can be graded by rarity ({@code chest-loot.common}, {@code .uncommon}, {@code .rare},
     * {@code .epic}). A flat {@code chest-loot} list is still accepted and read as the common table.
     */
    private Map<Rarity, List<LootEntry>> readChests(ConfigurationSection section, String phaseKey) {
        Map<Rarity, List<LootEntry>> tables = new EnumMap<>(Rarity.class);
        ConfigurationSection chests = section.getConfigurationSection("chest-loot");
        if (chests == null) {
            tables.put(Rarity.COMMON, readLoot(section.getStringList("chest-loot"), phaseKey));
            return tables;
        }
        for (Rarity rarity : Rarity.values()) {
            List<String> raw = chests.getStringList(rarity.name().toLowerCase(Locale.ROOT));
            if (!raw.isEmpty()) {
                tables.put(rarity, readLoot(raw, phaseKey));
            }
        }
        return tables;
    }

    private List<LootEntry> readLoot(List<String> raw, String phaseKey) {
        List<LootEntry> loot = new ArrayList<>(raw.size());
        for (String entry : raw) {
            String[] parts = entry.split(":");
            Material material = Items.material(parts[0], null);
            if (material == null) {
                plugin.getLogger().warning("Phase " + phaseKey + ": unknown loot item '" + parts[0] + "', skipped.");
                continue;
            }
            int min = 1;
            int max = 1;
            if (parts.length > 1) {
                String[] range = parts[1].split("-");
                min = Math.max(1, parseInt(range[0], 1));
                max = range.length > 1 ? Math.max(min, parseInt(range[1], min)) : min;
            }
            double chance = parts.length > 2 ? parseDouble(parts[2]) : 100.0D;
            loot.add(new LootEntry(material, min, max, chance));
        }
        return loot;
    }

    /** Rolls a loot table, honouring the per-entry chance and amount range. */
    public List<ItemStack> rollLoot(List<LootEntry> table) {
        List<ItemStack> rolled = new ArrayList<>();
        for (LootEntry entry : table) {
            ItemStack item = entry.roll(random);
            if (item != null) {
                rolled.add(item);
            }
        }
        return rolled;
    }

    private double parseDouble(String raw) {
        try {
            return Double.parseDouble(raw.trim());
        } catch (NumberFormatException ex) {
            return 100.0D;
        }
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

    /** Blocks that make up one lap of the endless run. */
    public int lapLength() {
        return Math.max(1, plugin.getConfig().getInt("infinite.lap-blocks", 1000));
    }

    /** Which lap of the endless run the island is on, starting at 1. */
    public int lapOf(int blocks) {
        return infiniteProgress(blocks) / lapLength() + 1;
    }

    /** Name to show for the current phase, taking the endless run into account. */
    public String labelFor(int blocks, Phase phase) {
        if (isInfinite(blocks)) {
            return plugin.getConfigManager().getMessages()
                    .getString("phase.infinite-name", "Fase Infinita")
                    .replace("<lap>", String.valueOf(lapOf(blocks)));
        }
        return phase == null ? "?" : com.oneblock.util.Text.plain(phase.getDisplayName());
    }

    /** Name of whatever comes next: the following phase, the next lap, or the endless run itself. */
    public String nextLabelFor(int blocks) {
        if (isInfinite(blocks)) {
            return plugin.getConfigManager().getMessages()
                    .getString("phase.infinite-name", "Fase Infinita")
                    .replace("<lap>", String.valueOf(lapOf(blocks) + 1));
        }
        Phase next = next(indexFor(blocks));
        if (next != null) {
            return com.oneblock.util.Text.plain(next.getDisplayName());
        }
        return plugin.getConfigManager().getMessages()
                .getString("phase.infinite-name", "Fase Infinita").replace("<lap>", "1");
    }

    /** Progress inside the current phase, in the 0..1 range. */
    public double progress(int blocks) {
        if (isInfinite(blocks)) {
            return (infiniteProgress(blocks) % lapLength()) / (double) lapLength();
        }
        int index = indexFor(blocks);
        Phase current = byIndex(index);
        Phase next = next(index);
        if (current == null) {
            return 1.0D;
        }
        if (next == null) {
            int span = infiniteFrom() - current.getRequiredBlocks();
            return span <= 0 ? 1.0D
                    : Math.max(0.0D, Math.min(1.0D, (blocks - current.getRequiredBlocks()) / (double) span));
        }
        int span = next.getRequiredBlocks() - current.getRequiredBlocks();
        if (span <= 0) {
            return 1.0D;
        }
        return Math.max(0.0D, Math.min(1.0D, (blocks - current.getRequiredBlocks()) / (double) span));
    }

    public int blocksUntilNext(int blocks) {
        if (isInfinite(blocks)) {
            return lapLength() - (infiniteProgress(blocks) % lapLength());
        }
        Phase next = next(indexFor(blocks));
        if (next != null) {
            return Math.max(0, next.getRequiredBlocks() - blocks);
        }
        // Last phase: what is left before the endless run starts.
        return Math.max(0, infiniteFrom() - blocks);
    }

    public Material randomBlock(Phase phase) {
        return weighted(phase.getBlockWeights(), Material.STONE);
    }

    /**
     * The original map sprinkles blocks from earlier phases into the current one, so the island
     * never stops producing the basics.
     */
    public Material randomLegacyBlock(int currentIndex) {
        if (currentIndex <= 0) {
            return null;
        }
        Phase earlier = phases.get(random.nextInt(currentIndex));
        return randomBlock(earlier);
    }

    /** Once the last phase is cleared the block keeps going, mixing every phase at once. */
    public boolean isInfinite(int blocks) {
        if (phases.isEmpty() || !plugin.getConfig().getBoolean("infinite.enabled", true)) {
            return false;
        }
        return blocks >= infiniteFrom();
    }

    public int infiniteFrom() {
        if (phases.isEmpty()) {
            return Integer.MAX_VALUE;
        }
        return phases.get(phases.size() - 1).getRequiredBlocks()
                + plugin.getConfig().getInt("infinite.last-phase-length", 5000);
    }

    /** How many blocks into the endless run the island is. */
    public int infiniteProgress(int blocks) {
        return Math.max(0, blocks - infiniteFrom());
    }

    /** A block from any phase at all, used while the island is in the endless run. */
    public Material randomBlockAnyPhase() {
        if (phases.isEmpty()) {
            return Material.STONE;
        }
        return randomBlock(phases.get(random.nextInt(phases.size())));
    }

    public EntityType randomMobAnyPhase() {
        if (phases.isEmpty()) {
            return null;
        }
        return randomMob(phases.get(random.nextInt(phases.size())));
    }

    /** Picks a chest rarity using the weights in config.yml, then rolls that table. */
    public Rarity rollRarity() {
        Map<Rarity, Integer> weights = new EnumMap<>(Rarity.class);
        for (Rarity rarity : Rarity.values()) {
            weights.put(rarity, plugin.getConfig().getInt(
                    "chest-rarity." + rarity.name().toLowerCase(Locale.ROOT), 0));
        }
        Rarity rolled = weighted(weights, Rarity.COMMON);
        return rolled == null ? Rarity.COMMON : rolled;
    }

    /** Falls back to a less rare table when a phase does not define the rolled one. */
    public List<ItemStack> rollChest(Phase phase, Rarity rarity) {
        Rarity[] order = Rarity.values();
        for (int i = rarity.ordinal(); i >= 0; i--) {
            List<LootEntry> table = phase.getChestLoot(order[i]);
            if (!table.isEmpty()) {
                return rollLoot(table);
            }
        }
        return List.of();
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
