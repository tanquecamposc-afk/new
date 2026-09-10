package com.oneblock.phase;

import org.bukkit.Material;
import org.bukkit.inventory.ItemStack;

import java.util.Random;

/**
 * One line of a loot table: {@code MATERIAL:amount}, {@code MATERIAL:min-max} or
 * {@code MATERIAL:min-max:chance} (chance in %, 100 by default).
 */
public record LootEntry(Material material, int min, int max, double chance) {

    /** @return the rolled stack, or {@code null} when the chance roll failed. */
    public ItemStack roll(Random random) {
        if (chance < 100.0D && random.nextDouble() * 100.0D >= chance) {
            return null;
        }
        int amount = min >= max ? min : min + random.nextInt(max - min + 1);
        return new ItemStack(material, Math.max(1, Math.min(amount, material.getMaxStackSize())));
    }
}
