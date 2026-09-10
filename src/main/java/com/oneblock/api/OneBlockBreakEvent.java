package com.oneblock.api;

import com.oneblock.island.Island;
import com.oneblock.phase.Phase;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;
import org.bukkit.event.Cancellable;
import org.bukkit.event.Event;
import org.bukkit.event.HandlerList;
import org.jetbrains.annotations.NotNull;

/** Fired right before the OneBlock of an island is consumed by a player. */
public class OneBlockBreakEvent extends Event implements Cancellable {

    private static final HandlerList HANDLERS = new HandlerList();

    private final Player player;
    private final Island island;
    private final Phase phase;
    private final Block block;
    private boolean cancelled;

    public OneBlockBreakEvent(Player player, Island island, Phase phase, Block block) {
        this.player = player;
        this.island = island;
        this.phase = phase;
        this.block = block;
    }

    public Player getPlayer() {
        return player;
    }

    public Island getIsland() {
        return island;
    }

    public Phase getPhase() {
        return phase;
    }

    public Block getBlock() {
        return block;
    }

    @Override
    public boolean isCancelled() {
        return cancelled;
    }

    @Override
    public void setCancelled(boolean cancel) {
        this.cancelled = cancel;
    }

    @NotNull
    @Override
    public HandlerList getHandlers() {
        return HANDLERS;
    }

    public static HandlerList getHandlerList() {
        return HANDLERS;
    }
}
