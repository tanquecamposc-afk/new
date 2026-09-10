package com.oneblock.listener;

import com.oneblock.OneBlockPlugin;
import com.oneblock.island.Island;
import org.bukkit.Location;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.event.player.PlayerMoveEvent;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/** Catches players (and their items) before the void kills them. */
public final class VoidListener implements Listener {

    private final OneBlockPlugin plugin;
    private final Set<UUID> rescuing = new HashSet<>();

    public VoidListener(OneBlockPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler(ignoreCancelled = true)
    public void onMove(PlayerMoveEvent event) {
        Location to = event.getTo();
        double threshold = plugin.getConfigManager().getConfig().getDouble("void.rescue-y", -60.0D);
        if (to.getY() > threshold) {
            return;
        }
        Player player = event.getPlayer();
        Island island = plugin.getIslandManager().getIslandAt(to);
        if (island == null || !rescuing.add(player.getUniqueId())) {
            return;
        }

        plugin.getParticleEngine().voidFade(player.getLocation());
        String sound = plugin.getConfigManager().getConfig()
                .getString("void.sound", "entity.enderman.teleport");
        player.playSound(player.getLocation(), sound, 1.0F, 1.0F);

        Location target = BlockListener.safeSpot(island);
        player.setFallDistance(0.0F);
        player.setVelocity(player.getVelocity().zero());
        player.teleportAsync(target).whenComplete((success, error) -> plugin.sync(() -> {
            // The flag is always cleared, even if the teleport failed, so a player is never
            // left unrescuable after a hiccup.
            rescuing.remove(player.getUniqueId());
            if (error != null || !Boolean.TRUE.equals(success)) {
                return;
            }
            player.setFallDistance(0.0F);
            plugin.getParticleEngine().voidFade(target);
            player.playSound(target, sound, 1.0F, 1.2F);
            plugin.getMessages().send(player, "void.rescued");
        }));
    }

    /** No void damage inside a OneBlock world - the move handler already rescued the player. */
    @EventHandler(ignoreCancelled = true)
    public void onDamage(EntityDamageEvent event) {
        if (event.getCause() != EntityDamageEvent.DamageCause.VOID) {
            return;
        }
        if (!(event.getEntity() instanceof Player player)) {
            return;
        }
        if (plugin.getIslandManager().getIslandAt(player.getLocation()) != null) {
            event.setCancelled(true);
        }
    }
}
