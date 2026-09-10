package com.oneblock.phase;

import org.bukkit.Material;
import org.bukkit.entity.EntityType;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/** Immutable description of one of the ten OneBlock phases. */
public final class Phase {

    private final String id;
    private final String displayName;
    private final String colorTag;
    private final int requiredBlocks;
    private final Material icon;
    private final Map<Material, Integer> blockWeights;
    private final Map<EntityType, Integer> mobWeights;
    private final List<LootEntry> chestLoot;
    private final List<LootEntry> specialLoot;
    private final double borderSize;
    private final String bossBarColor;

    public Phase(String id, String displayName, String colorTag, int requiredBlocks, Material icon,
                 Map<Material, Integer> blockWeights, Map<EntityType, Integer> mobWeights,
                 List<LootEntry> chestLoot, List<LootEntry> specialLoot, double borderSize, String bossBarColor) {
        this.id = id;
        this.displayName = displayName;
        this.colorTag = colorTag;
        this.requiredBlocks = requiredBlocks;
        this.icon = icon;
        this.blockWeights = Collections.unmodifiableMap(blockWeights);
        this.mobWeights = Collections.unmodifiableMap(mobWeights);
        this.chestLoot = Collections.unmodifiableList(chestLoot);
        this.specialLoot = Collections.unmodifiableList(specialLoot);
        this.borderSize = borderSize;
        this.bossBarColor = bossBarColor;
    }

    public String getId() {
        return id;
    }

    public String getDisplayName() {
        return displayName;
    }

    /** MiniMessage colour used for this phase in the HUD, holograms and menus. */
    public String getColorTag() {
        return colorTag;
    }

    public int getRequiredBlocks() {
        return requiredBlocks;
    }

    public Material getIcon() {
        return icon;
    }

    public Map<Material, Integer> getBlockWeights() {
        return blockWeights;
    }

    public Map<EntityType, Integer> getMobWeights() {
        return mobWeights;
    }

    public List<LootEntry> getChestLoot() {
        return chestLoot;
    }

    public List<LootEntry> getSpecialLoot() {
        return specialLoot;
    }

    public double getBorderSize() {
        return borderSize;
    }

    public String getBossBarColor() {
        return bossBarColor;
    }
}
