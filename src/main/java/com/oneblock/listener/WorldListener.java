package com.oneblock.listener;

import com.oneblock.OneBlockPlugin;
import com.oneblock.island.Island;
import org.bukkit.Location;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockFromToEvent;
import org.bukkit.event.block.BlockPistonExtendEvent;
import org.bukkit.event.block.BlockPistonRetractEvent;
import org.bukkit.event.entity.EntityChangeBlockEvent;
import org.bukkit.event.player.PlayerBucketEmptyEvent;
import org.bukkit.event.world.ChunkLoadEvent;

import java.util.List;

/**
 * Everything that can make the OneBlock disappear without a {@code BlockBreakEvent} - pistons,
 * liquids, endermen, buckets - plus the chunk reload that has to bring the visuals back.
 */
public final class WorldListener implements Listener {

    private final OneBlockPlugin plugin;

    public WorldListener(OneBlockPlugin plugin) {
        this.plugin = plugin;
    }

    /**
     * Display entities are not persistent, so they die with their chunk. When the chunk comes back
     * the hologram and the pedestals have to be spawned again.
     */
    @EventHandler
    public void onChunkLoad(ChunkLoadEvent event) {
        Island island = plugin.getIslandManager().getIslandInChunk(event.getChunk().getX(), event.getChunk().getZ());
        if (island == null) {
            return;
        }
        plugin.sync(() -> {
            plugin.getHologramManager().refresh(island);
            plugin.getSkinManager().reapply(island);
        });
    }

    /** A piston must never push or pull the OneBlock out of its place. */
    @EventHandler(ignoreCancelled = true)
    public void onPistonExtend(BlockPistonExtendEvent event) {
        if (touchesOneBlock(event.getBlocks())) {
            event.setCancelled(true);
        }
    }

    @EventHandler(ignoreCancelled = true)
    public void onPistonRetract(BlockPistonRetractEvent event) {
        if (touchesOneBlock(event.getBlocks())) {
            event.setCancelled(true);
        }
    }

    private boolean touchesOneBlock(List<Block> blocks) {
        for (Block block : blocks) {
            if (isOneBlock(block.getLocation())) {
                return true;
            }
        }
        return false;
    }

    /** Water and lava never wash the OneBlock away. */
    @EventHandler(ignoreCancelled = true)
    public void onFlow(BlockFromToEvent event) {
        if (isOneBlock(event.getToBlock().getLocation())) {
            event.setCancelled(true);
        }
    }

    /** Endermen, sheep eating grass, falling sand, ... none of them may touch the OneBlock. */
    @EventHandler(ignoreCancelled = true)
    public void onEntityChangeBlock(EntityChangeBlockEvent event) {
        if (isOneBlock(event.getBlock().getLocation())) {
            event.setCancelled(true);
        }
    }

    /** Buckets are the classic way to grief someone else's island. */
    @EventHandler(ignoreCancelled = true)
    public void onBucketEmpty(PlayerBucketEmptyEvent event) {
        Location target = event.getBlockClicked().getRelative(event.getBlockFace()).getLocation();
        Island island = plugin.getIslandManager().getIslandAt(target);
        if (island == null) {
            return;
        }
        Player player = event.getPlayer();
        if (!island.isTrusted(player.getUniqueId()) && !player.hasPermission("oneblock.admin")) {
            event.setCancelled(true);
            plugin.getMessages().send(player, "island.not-trusted");
            return;
        }
        if (isOneBlock(target)) {
            event.setCancelled(true);
            plugin.getMessages().send(player, "block.protected");
        }
    }

    private boolean isOneBlock(Location location) {
        Island island = plugin.getIslandManager().getIslandAt(location);
        if (island == null) {
            return false;
        }
        Location center = island.getCenter();
        return location.getBlockX() == center.getBlockX()
                && location.getBlockY() == center.getBlockY()
                && location.getBlockZ() == center.getBlockZ();
    }
}
