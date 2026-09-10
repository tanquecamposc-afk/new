package com.oneblock.util;

import org.bukkit.Color;
import org.bukkit.Location;
import org.bukkit.Particle;
import org.bukkit.World;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Version-tolerant particle lookup. Particle constants have been renamed several times between
 * 1.20.4 and later releases (REDSTONE -&gt; DUST, ...), so every name coming from a config file is
 * resolved reflectively against a list of candidates instead of being hard-coded.
 */
public final class Particles {

    private static final Map<String, Particle> CACHE = new HashMap<>();

    private Particles() {
    }

    /** @return the first particle that exists on the running server, or {@code null} if none match. */
    public static Particle resolve(String... candidates) {
        for (String candidate : candidates) {
            if (candidate == null || candidate.isEmpty()) {
                continue;
            }
            String key = candidate.toUpperCase(Locale.ROOT);
            Particle cached = CACHE.get(key);
            if (cached != null) {
                return cached;
            }
            try {
                Particle particle = Particle.valueOf(key);
                CACHE.put(key, particle);
                return particle;
            } catch (IllegalArgumentException ignored) {
                // try the next candidate
            }
        }
        return null;
    }

    /** Coloured dust, using whichever dust particle this server version exposes. */
    public static void dust(World world, Location location, Color color, float size, int count) {
        Particle particle = resolve("DUST", "REDSTONE");
        if (particle == null) {
            return;
        }
        world.spawnParticle(particle, location, count, 0.0D, 0.0D, 0.0D, 0.0D,
                new Particle.DustOptions(color, size));
    }

    public static void spawn(World world, String name, Location location, int count,
                             double spreadX, double spreadY, double spreadZ, double extra) {
        Particle particle = resolve(name);
        if (particle == null) {
            return;
        }
        world.spawnParticle(particle, location, count, spreadX, spreadY, spreadZ, extra);
    }
}
