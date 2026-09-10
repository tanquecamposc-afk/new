package com.oneblock.api;

import com.oneblock.cosmetics.BlockSkin;
import com.oneblock.island.Island;
import org.bukkit.entity.Player;
import org.bukkit.event.Cancellable;
import org.bukkit.event.Event;
import org.bukkit.event.HandlerList;
import org.jetbrains.annotations.NotNull;

/** Fired when a player equips a cosmetic on the OneBlock of their island. */
public class OneBlockSkinChangeEvent extends Event implements Cancellable {

    private static final HandlerList HANDLERS = new HandlerList();

    private final Player player;
    private final Island island;
    private final BlockSkin skin;
    private boolean cancelled;

    public OneBlockSkinChangeEvent(Player player, Island island, BlockSkin skin) {
        this.player = player;
        this.island = island;
        this.skin = skin;
    }

    public Player getPlayer() {
        return player;
    }

    public Island getIsland() {
        return island;
    }

    public BlockSkin getSkin() {
        return skin;
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
