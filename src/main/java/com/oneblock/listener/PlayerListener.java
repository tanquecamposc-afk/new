package com.oneblock.listener;

import com.oneblock.OneBlockPlugin;
import com.oneblock.island.Island;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.player.PlayerTeleportEvent;

/** Keeps the HUD, the world border and the island name in sync with the player session. */
public final class PlayerListener implements Listener {

    private final OneBlockPlugin plugin;

    public PlayerListener(OneBlockPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler
    public void onJoin(PlayerJoinEvent event) {
        Player player = event.getPlayer();
        Island island = plugin.getIslandManager().getIsland(player.getUniqueId());
        if (island != null && !player.getName().equals(island.getOwnerName())) {
            island.setOwnerName(player.getName());
            plugin.getStorage().saveIsland(island);
            plugin.getHologramManager().refresh(island);
        }
        updateContext(player);
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent event) {
        plugin.getHudManager().hide(event.getPlayer());
    }

    @EventHandler
    public void onTeleport(PlayerTeleportEvent event) {
        plugin.getServer().getScheduler().runTask(plugin, () -> updateContext(event.getPlayer()));
    }

    private void updateContext(Player player) {
        if (!player.isOnline()) {
            return;
        }
        Island island = plugin.getIslandManager().getIslandAt(player.getLocation());
        if (island == null) {
            plugin.getHudManager().hide(player);
            return;
        }
        plugin.getHudManager().show(player, island);
        plugin.getIslandManager().applyBorder(player, island);
        plugin.getHologramManager().refresh(island);
        plugin.getSkinManager().apply(island);
    }
}
