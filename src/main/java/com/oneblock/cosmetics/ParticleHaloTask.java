package com.oneblock.cosmetics;

import com.oneblock.OneBlockPlugin;
import com.oneblock.island.Island;
import com.oneblock.util.Particles;
import org.bukkit.Color;
import org.bukkit.Location;
import org.bukkit.World;
import org.bukkit.entity.Player;
import org.bukkit.scheduler.BukkitRunnable;

import java.util.List;

/**
 * Draws the equipped halo of every island whose OneBlock has a player nearby, and rotates the
 * pedestal ring. Islands without an audience are skipped so the task stays cheap on big servers.
 */
public final class ParticleHaloTask extends BukkitRunnable {

    private final OneBlockPlugin plugin;
    private final double renderDistanceSquared;
    private double tick;
    private int frame;

    public ParticleHaloTask(OneBlockPlugin plugin) {
        this.plugin = plugin;
        double distance = plugin.getConfigManager().getConfig().getDouble("cosmetics.render-distance", 32.0D);
        this.renderDistanceSquared = distance * distance;
    }

    @Override
    public void run() {
        tick += 0.15D;
        if (tick > Math.PI * 200.0D) {
            tick = 0.0D;
        }
        frame++;
        for (Island island : plugin.getIslandManager().getIslands()) {
            if (!hasAudience(island)) {
                continue;
            }
            plugin.getSkinManager().animatePedestals(island, tick);
            // Text is a packet per nearby player, so the hologram animates at half the halo rate.
            if (frame % 2 == 0) {
                plugin.getHologramManager().animate(island, tick);
            }
            BlockSkin halo = plugin.getSkinManager().get(island.getHalo());
            if (halo != null && halo.getType() == BlockSkin.Type.HALO) {
                draw(island, halo);
            }
        }
        animateLeaderboard();
    }

    /** The Top 10 podium only spins while somebody is actually looking at it. */
    private void animateLeaderboard() {
        Location board = plugin.getLeaderboardManager().getLocation();
        if (board == null || board.getWorld() == null) {
            return;
        }
        for (Player player : board.getWorld().getPlayers()) {
            if (player.getLocation().distanceSquared(board) <= renderDistanceSquared) {
                plugin.getLeaderboardManager().animate(tick);
                return;
            }
        }
    }

    private boolean hasAudience(Island island) {
        Location center = island.getCenter();
        World world = center.getWorld();
        if (world == null) {
            return false;
        }
        for (Player player : world.getPlayers()) {
            if (player.getLocation().distanceSquared(center) <= renderDistanceSquared) {
                return true;
            }
        }
        return false;
    }

    private void draw(Island island, BlockSkin halo) {
        Location center = island.getCenter().add(0.5D, 0.5D, 0.5D);
        World world = center.getWorld();
        if (world == null) {
            return;
        }
        switch (halo.getShape()) {
            case RING -> ring(world, center, halo);
            case SPIRAL -> spiral(world, center, halo);
            case HEART -> heart(world, center, halo);
            case STORM -> storm(world, center, halo);
            case VORTEX -> vortex(world, center, halo);
            default -> ring(world, center, halo);
        }
    }

    private void ring(World world, Location center, BlockSkin halo) {
        int points = Math.max(4, halo.getParticleCount() * 6);
        for (int i = 0; i < points; i++) {
            double angle = tick + 2.0D * Math.PI * i / points;
            emit(world, center.clone().add(
                    Math.cos(angle) * halo.getRadius(),
                    0.6D,
                    Math.sin(angle) * halo.getRadius()), halo);
        }
    }

    private void spiral(World world, Location center, BlockSkin halo) {
        int points = Math.max(3, halo.getParticleCount() * 4);
        for (int i = 0; i < points; i++) {
            double progress = (tick * 0.4D + i / (double) points) % 1.0D;
            double angle = progress * Math.PI * 4.0D;
            emit(world, center.clone().add(
                    Math.cos(angle) * halo.getRadius() * (1.0D - progress * 0.5D),
                    progress * 2.2D,
                    Math.sin(angle) * halo.getRadius() * (1.0D - progress * 0.5D)), halo);
        }
    }

    private void heart(World world, Location center, BlockSkin halo) {
        int points = Math.max(6, halo.getParticleCount() * 8);
        for (int i = 0; i < points; i++) {
            double t = 2.0D * Math.PI * i / points;
            double x = 16.0D * Math.pow(Math.sin(t), 3.0D) / 16.0D;
            double y = (13.0D * Math.cos(t) - 5.0D * Math.cos(2.0D * t)
                    - 2.0D * Math.cos(3.0D * t) - Math.cos(4.0D * t)) / 16.0D;
            double angle = tick * 0.5D;
            double rotatedX = x * Math.cos(angle) * halo.getRadius();
            double rotatedZ = x * Math.sin(angle) * halo.getRadius();
            emit(world, center.clone().add(rotatedX, 0.9D + y * halo.getRadius(), rotatedZ), halo);
        }
    }

    private void storm(World world, Location center, BlockSkin halo) {
        int strikes = Math.max(1, halo.getParticleCount());
        for (int i = 0; i < strikes; i++) {
            double angle = plugin.getPhaseManager().getRandom().nextDouble() * Math.PI * 2.0D;
            double radius = halo.getRadius() * plugin.getPhaseManager().getRandom().nextDouble();
            for (double y = 0.0D; y < 2.4D; y += 0.25D) {
                emit(world, center.clone().add(
                        Math.cos(angle + y) * radius,
                        y,
                        Math.sin(angle + y) * radius), halo);
            }
        }
    }

    private void vortex(World world, Location center, BlockSkin halo) {
        int arms = 3;
        int points = Math.max(4, halo.getParticleCount() * 3);
        for (int arm = 0; arm < arms; arm++) {
            for (int i = 0; i < points; i++) {
                double progress = i / (double) points;
                double angle = tick + progress * Math.PI * 3.0D + arm * (2.0D * Math.PI / arms);
                emit(world, center.clone().add(
                        Math.cos(angle) * halo.getRadius() * progress,
                        1.8D - progress * 1.6D,
                        Math.sin(angle) * halo.getRadius() * progress), halo);
            }
        }
    }

    private void emit(World world, Location location, BlockSkin halo) {
        List<String> particles = halo.getParticles();
        if (particles.isEmpty()) {
            Particles.dust(world, location, Color.fromRGB(
                    clamp(halo.getRed()), clamp(halo.getGreen()), clamp(halo.getBlue())), 1.0F, 1);
            return;
        }
        String name = particles.get((int) (tick * 3.0D) % particles.size());
        if (name.equalsIgnoreCase("DUST") || name.equalsIgnoreCase("REDSTONE")) {
            Particles.dust(world, location, Color.fromRGB(
                    clamp(halo.getRed()), clamp(halo.getGreen()), clamp(halo.getBlue())), 1.0F, 1);
            return;
        }
        Particles.spawn(world, name, location, 1, 0.0D, 0.0D, 0.0D, 0.0D);
    }

    private int clamp(int value) {
        return Math.max(0, Math.min(255, value));
    }
}
