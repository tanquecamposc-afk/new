package com.oneblock.display;

import com.oneblock.OneBlockPlugin;
import com.oneblock.phase.Phase;
import com.oneblock.util.Particles;
import org.bukkit.Color;
import org.bukkit.Location;
import org.bukkit.World;
import org.bukkit.scheduler.BukkitRunnable;

/** One-shot visual effects: break bursts, phase-change light pillars and void fades. */
public final class ParticleEngine {

    private final OneBlockPlugin plugin;

    public ParticleEngine(OneBlockPlugin plugin) {
        this.plugin = plugin;
    }

    /** Directional burst aimed away from the player who mined the block. */
    public void breakBurst(Location block, Location source, Phase phase) {
        World world = block.getWorld();
        if (world == null) {
            return;
        }
        Location center = block.clone().add(0.5D, 0.5D, 0.5D);
        Particles.spawn(world, "CRIT", center, 18, 0.25D, 0.25D, 0.25D, 0.15D);
        Particles.spawn(world, "END_ROD", center, 6, 0.1D, 0.1D, 0.1D, 0.05D);

        if (source == null || source.getWorld() == null || !source.getWorld().equals(world)) {
            return;
        }
        org.bukkit.util.Vector direction = center.toVector().subtract(source.toVector()).normalize().multiply(0.35D);
        for (int i = 1; i <= 6; i++) {
            Location at = center.clone().add(direction.clone().multiply(i));
            Particles.dust(world, at, phaseColor(phase), 1.1F, 2);
        }
    }

    /** Spiralling pillar of light played when an island reaches a new phase. */
    public void phasePillar(Location block, Phase phase) {
        World world = block.getWorld();
        if (world == null) {
            return;
        }
        Location base = block.clone().add(0.5D, 1.0D, 0.5D);
        Color color = phaseColor(phase);
        new BukkitRunnable() {
            private double height;

            @Override
            public void run() {
                if (height > 14.0D) {
                    cancel();
                    return;
                }
                for (int arm = 0; arm < 3; arm++) {
                    double angle = height * 0.9D + arm * (2.0D * Math.PI / 3.0D);
                    Location at = base.clone().add(Math.cos(angle) * 1.4D, height, Math.sin(angle) * 1.4D);
                    Particles.dust(world, at, color, 1.4F, 2);
                    Particles.spawn(world, "END_ROD", at, 1, 0.0D, 0.0D, 0.0D, 0.0D);
                }
                height += 0.45D;
            }
        }.runTaskTimer(plugin, 0L, 1L);
    }

    /** Fade played on a player who fell into the void before the rescue teleport. */
    public void voidFade(Location location) {
        World world = location.getWorld();
        if (world == null) {
            return;
        }
        Particles.spawn(world, "PORTAL", location, 60, 0.6D, 1.0D, 0.6D, 0.6D);
        Particles.spawn(world, "REVERSE_PORTAL", location, 20, 0.4D, 0.8D, 0.4D, 0.2D);
    }

    /** Sparkle ring highlighting a special (bonus) block. */
    public void specialBlock(Location block) {
        World world = block.getWorld();
        if (world == null) {
            return;
        }
        Location center = block.clone().add(0.5D, 0.5D, 0.5D);
        Particles.spawn(world, "END_ROD", center, 12, 0.4D, 0.4D, 0.4D, 0.02D);
        Particles.dust(world, center, Color.fromRGB(255, 215, 0), 1.6F, 8);
    }

    private Color phaseColor(Phase phase) {
        if (phase == null) {
            return Color.fromRGB(255, 255, 255);
        }
        int hash = phase.getId().hashCode();
        return Color.fromRGB(
                120 + Math.abs(hash % 136),
                120 + Math.abs((hash >> 8) % 136),
                120 + Math.abs((hash >> 16) % 136));
    }
}
