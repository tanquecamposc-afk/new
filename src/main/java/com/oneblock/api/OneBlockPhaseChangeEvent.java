package com.oneblock.api;

import com.oneblock.island.Island;
import com.oneblock.phase.Phase;
import org.bukkit.event.Event;
import org.bukkit.event.HandlerList;
import org.jetbrains.annotations.NotNull;

/** Fired after an island crossed the block threshold of a new phase. */
public class OneBlockPhaseChangeEvent extends Event {

    private static final HandlerList HANDLERS = new HandlerList();

    private final Island island;
    private final Phase from;
    private final Phase to;

    public OneBlockPhaseChangeEvent(Island island, Phase from, Phase to) {
        this.island = island;
        this.from = from;
        this.to = to;
    }

    public Island getIsland() {
        return island;
    }

    public Phase getFrom() {
        return from;
    }

    public Phase getTo() {
        return to;
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
