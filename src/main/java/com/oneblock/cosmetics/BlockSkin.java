package com.oneblock.cosmetics;

import org.bukkit.Material;

import java.util.List;

/** A cosmetic that can be equipped on the OneBlock of an island. */
public final class BlockSkin {

    /** The three cosmetic slots an island has. */
    public enum Type {
        PEDESTAL,
        HALO,
        SOUND
    }

    /** Shape drawn by {@link ParticleHaloTask} for {@link Type#HALO} cosmetics. */
    public enum Shape {
        RING,
        SPIRAL,
        HEART,
        STORM,
        VORTEX
    }

    private final String id;
    private final Type type;
    private final String displayName;
    private final List<String> lore;
    private final Material icon;
    private final String permission;
    private final int requiredPhase;

    // Pedestal
    private final Material pedestalMaterial;
    private final float pedestalScale;
    private final int pedestalCount;

    // Halo
    private final Shape shape;
    private final List<String> particles;
    private final int particleCount;
    private final double radius;
    private final int red;
    private final int green;
    private final int blue;

    // Sound
    private final String sound;
    private final float pitch;
    private final float volume;

    @SuppressWarnings("checkstyle:ParameterNumber")
    public BlockSkin(String id, Type type, String displayName, List<String> lore, Material icon,
                     String permission, int requiredPhase, Material pedestalMaterial, float pedestalScale,
                     int pedestalCount, Shape shape, List<String> particles, int particleCount, double radius,
                     int red, int green, int blue, String sound, float pitch, float volume) {
        this.id = id;
        this.type = type;
        this.displayName = displayName;
        this.lore = lore;
        this.icon = icon;
        this.permission = permission;
        this.requiredPhase = requiredPhase;
        this.pedestalMaterial = pedestalMaterial;
        this.pedestalScale = pedestalScale;
        this.pedestalCount = pedestalCount;
        this.shape = shape;
        this.particles = particles;
        this.particleCount = particleCount;
        this.radius = radius;
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.sound = sound;
        this.pitch = pitch;
        this.volume = volume;
    }

    public String getId() {
        return id;
    }

    public Type getType() {
        return type;
    }

    public String getDisplayName() {
        return displayName;
    }

    public List<String> getLore() {
        return lore;
    }

    public Material getIcon() {
        return icon;
    }

    public String getPermission() {
        return permission;
    }

    /** Phase index the island must have reached, or 0 when the cosmetic has no progression gate. */
    public int getRequiredPhase() {
        return requiredPhase;
    }

    public Material getPedestalMaterial() {
        return pedestalMaterial;
    }

    public float getPedestalScale() {
        return pedestalScale;
    }

    public int getPedestalCount() {
        return pedestalCount;
    }

    public Shape getShape() {
        return shape;
    }

    public List<String> getParticles() {
        return particles;
    }

    public int getParticleCount() {
        return particleCount;
    }

    public double getRadius() {
        return radius;
    }

    public int getRed() {
        return red;
    }

    public int getGreen() {
        return green;
    }

    public int getBlue() {
        return blue;
    }

    public String getSound() {
        return sound;
    }

    public float getPitch() {
        return pitch;
    }

    public float getVolume() {
        return volume;
    }
}
