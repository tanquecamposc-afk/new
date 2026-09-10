package com.oneblock.gui;

import org.bukkit.entity.Player;
import org.bukkit.event.inventory.ClickType;

/** What happens when a player clicks a bound slot. */
@FunctionalInterface
public interface GUIAction {

    void run(Player player, ClickType click);
}
