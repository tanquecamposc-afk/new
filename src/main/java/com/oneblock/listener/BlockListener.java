package com.oneblock.listener;

import com.oneblock.OneBlockPlugin;
import com.oneblock.api.OneBlockBreakEvent;
import com.oneblock.api.OneBlockPhaseChangeEvent;
import com.oneblock.config.Messages;
import com.oneblock.cosmetics.BlockSkin;
import com.oneblock.island.Island;
import com.oneblock.phase.Phase;
import com.oneblock.util.Text;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.block.BlockFace;
import org.bukkit.block.Chest;
import org.bukkit.entity.EntityType;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.entity.EntityExplodeEvent;
import org.bukkit.inventory.ItemStack;

import java.util.List;
import java.util.Random;

/** Regenerates the OneBlock, rolls its content and protects everything around it. */
public final class BlockListener implements Listener {

    private final OneBlockPlugin plugin;
    private final Random random = new Random();

    public BlockListener(OneBlockPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onBreak(BlockBreakEvent event) {
        Player player = event.getPlayer();
        Block block = event.getBlock();
        Island island = plugin.getIslandManager().getIslandAt(block.getLocation());
        if (island == null) {
            return;
        }
        if (!island.isTrusted(player.getUniqueId()) && !player.hasPermission("oneblock.admin")) {
            event.setCancelled(true);
            plugin.getMessages().send(player, "island.not-trusted");
            return;
        }

        Location center = island.getCenter();
        if (block.getX() != center.getBlockX() || block.getY() != center.getBlockY()
                || block.getZ() != center.getBlockZ()) {
            return;
        }

        Phase phase = plugin.getPhaseManager().byIndex(island.getPhaseIndex());
        OneBlockBreakEvent apiEvent = new OneBlockBreakEvent(player, island, phase, block);
        plugin.getServer().getPluginManager().callEvent(apiEvent);
        if (apiEvent.isCancelled()) {
            event.setCancelled(true);
            return;
        }

        boolean special = plugin.isSpecialBlock(block.getLocation());
        if (special) {
            plugin.clearSpecialBlock(block.getLocation());
            giveLoot(player, phase == null ? List.of() : phase.getSpecialLoot());
            plugin.getParticleEngine().specialBlock(block.getLocation());
            plugin.getMessages().send(player, "block.special");
        }

        playBreakSound(island, block.getLocation());
        plugin.getParticleEngine().breakBurst(block.getLocation(), player.getLocation(), phase);

        int blocks = island.incrementBlocks();
        plugin.getHudManager().show(player, island);
        plugin.getHudManager().actionBar(player, island);
        plugin.getHologramManager().refresh(island);

        int newIndex = plugin.getPhaseManager().indexFor(blocks);
        if (newIndex != island.getPhaseIndex()) {
            Phase from = phase;
            island.setPhaseIndex(newIndex);
            Phase to = plugin.getPhaseManager().byIndex(newIndex);
            onPhaseChange(island, player, from, to);
        }

        if (blocks % plugin.getConfigManager().getConfig().getInt("storage.save-every-blocks", 20) == 0) {
            plugin.getStorage().saveIsland(island);
        }

        // The block is regenerated on the next tick, once vanilla finished processing the break.
        plugin.getServer().getScheduler().runTask(plugin, () -> regenerate(island));
    }

    private void onPhaseChange(Island island, Player player, Phase from, Phase to) {
        plugin.getServer().getPluginManager().callEvent(new OneBlockPhaseChangeEvent(island, from, to));
        plugin.getParticleEngine().phasePillar(island.getCenter(), to);
        plugin.getIslandManager().applyBorder(island);
        plugin.getStorage().saveIsland(island);
        if (to == null) {
            return;
        }
        for (Player online : plugin.getServer().getOnlinePlayers()) {
            if (island.isTrusted(online.getUniqueId())) {
                online.showTitle(net.kyori.adventure.title.Title.title(
                        Text.of(plugin.getMessages().raw("phase.title"),
                                Messages.of("phase", Text.plain(to.getDisplayName()))),
                        Text.of(plugin.getMessages().raw("phase.subtitle"),
                                Messages.of("phase", Text.plain(to.getDisplayName())))));
            }
        }
        plugin.getMessages().send(player, "phase.changed",
                Messages.of("phase", Text.plain(to.getDisplayName())));
    }

    /** Rolls the next content of the OneBlock: phase block, chest, mob or bonus block. */
    private void regenerate(Island island) {
        Location center = island.getCenter();
        World world = center.getWorld();
        if (world == null) {
            return;
        }
        Block block = center.getBlock();
        if (block.getType() != Material.AIR && block.getType() != Material.CAVE_AIR) {
            return;
        }
        Phase phase = plugin.getPhaseManager().byIndex(island.getPhaseIndex());
        if (phase == null) {
            block.setType(Material.STONE);
            return;
        }

        double specialChance = plugin.getConfigManager().getConfig().getDouble("chances.special", 2.0D);
        double chestChance = plugin.getConfigManager().getConfig().getDouble("chances.chest", 12.0D);
        double mobChance = plugin.getConfigManager().getConfig().getDouble("chances.mob", 15.0D);
        double roll = random.nextDouble() * 100.0D;

        if (roll < specialChance) {
            Material specialMaterial = com.oneblock.util.Items.material(
                    plugin.getConfigManager().getConfig().getString("chances.special-block"), Material.SEA_LANTERN);
            block.setType(specialMaterial);
            plugin.markSpecialBlock(center);
            plugin.getParticleEngine().specialBlock(center);
            return;
        }
        roll -= specialChance;

        if (roll < chestChance) {
            block.setType(Material.CHEST);
            if (block.getState() instanceof Chest chest) {
                for (ItemStack loot : phase.getChestLoot()) {
                    chest.getBlockInventory().addItem(loot.clone());
                }
                chest.update();
            }
            return;
        }
        roll -= chestChance;

        block.setType(plugin.getPhaseManager().randomBlock(phase));
        if (roll < mobChance) {
            EntityType mob = plugin.getPhaseManager().randomMob(phase);
            if (mob != null && mob.isSpawnable()) {
                world.spawnEntity(center.clone().add(0.5D, 1.0D, 0.5D), mob);
            }
        }
    }

    private void giveLoot(Player player, List<ItemStack> loot) {
        for (ItemStack item : loot) {
            for (ItemStack leftover : player.getInventory().addItem(item.clone()).values()) {
                player.getWorld().dropItemNaturally(player.getLocation(), leftover);
            }
        }
    }

    private void playBreakSound(Island island, Location location) {
        World world = location.getWorld();
        if (world == null) {
            return;
        }
        BlockSkin skin = plugin.getSkinManager().get(island.getBreakSound());
        if (skin == null || skin.getType() != BlockSkin.Type.SOUND) {
            return;
        }
        world.playSound(location.clone().add(0.5D, 0.5D, 0.5D), skin.getSound(),
                skin.getVolume(), skin.getPitch());
    }

    /** Nobody builds on top of another island, and the OneBlock itself can never be replaced. */
    @EventHandler(ignoreCancelled = true)
    public void onPlace(BlockPlaceEvent event) {
        Island island = plugin.getIslandManager().getIslandAt(event.getBlock().getLocation());
        if (island == null) {
            return;
        }
        Player player = event.getPlayer();
        if (!island.isTrusted(player.getUniqueId()) && !player.hasPermission("oneblock.admin")) {
            event.setCancelled(true);
            plugin.getMessages().send(player, "island.not-trusted");
            return;
        }
        Location center = island.getCenter();
        Block block = event.getBlock();
        if (block.getX() == center.getBlockX() && block.getY() == center.getBlockY()
                && block.getZ() == center.getBlockZ()) {
            event.setCancelled(true);
            plugin.getMessages().send(player, "block.protected");
        }
    }

    /** Explosions never eat the OneBlock. */
    @EventHandler(ignoreCancelled = true)
    public void onExplode(EntityExplodeEvent event) {
        event.blockList().removeIf(block -> {
            Island island = plugin.getIslandManager().getIslandAt(block.getLocation());
            if (island == null) {
                return false;
            }
            Location center = island.getCenter();
            return block.getX() == center.getBlockX() && block.getY() == center.getBlockY()
                    && block.getZ() == center.getBlockZ();
        });
    }

    /** Utility used by the void listener to find a safe spot next to the OneBlock. */
    public static Location safeSpot(Island island) {
        Location center = island.getCenter();
        for (BlockFace face : new BlockFace[]{BlockFace.UP, BlockFace.NORTH, BlockFace.EAST,
                BlockFace.SOUTH, BlockFace.WEST}) {
            Block relative = center.getBlock().getRelative(face);
            if (relative.getType().isAir() && relative.getRelative(BlockFace.UP).getType().isAir()) {
                return relative.getLocation().add(0.5D, 0.0D, 0.5D);
            }
        }
        return island.getSpawn();
    }
}
