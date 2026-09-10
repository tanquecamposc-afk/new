package com.oneblock.gui;

import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.InventoryHolder;
import org.jetbrains.annotations.NotNull;

import java.util.HashMap;
import java.util.Map;

/** Marks an inventory as owned by the plugin and carries the click actions of every slot. */
public final class GUIHolder implements InventoryHolder {

    /** The menus the plugin can open. */
    public enum Menu {
        MAIN,
        PHASES,
        COSMETICS,
        STATS,
        SETTINGS
    }

    private final Menu menu;
    private final Map<Integer, GUIAction> actions = new HashMap<>();
    private Inventory inventory;

    public GUIHolder(Menu menu) {
        this.menu = menu;
    }

    public Menu getMenu() {
        return menu;
    }

    public void bind(int slot, GUIAction action) {
        actions.put(slot, action);
    }

    public GUIAction action(int slot) {
        return actions.get(slot);
    }

    public void setInventory(Inventory inventory) {
        this.inventory = inventory;
    }

    @NotNull
    @Override
    public Inventory getInventory() {
        return inventory;
    }
}
