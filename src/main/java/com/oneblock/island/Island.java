package com.oneblock.island;

import org.bukkit.Location;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

/** Runtime state of a single OneBlock island. Mutations happen on the main thread only. */
public final class Island {

    private final UUID owner;
    private final Set<UUID> members = new LinkedHashSet<>();
    private final Location center;

    private String ownerName;
    private int blocksBroken;
    private int phaseIndex;
    private String pedestalSkin = "none";
    private String halo = "none";
    private String breakSound = "default";
    private boolean hologramVisible = true;
    private boolean dirty;

    public Island(UUID owner, String ownerName, Location center) {
        this.owner = owner;
        this.ownerName = ownerName;
        this.center = center;
    }

    public UUID getOwner() {
        return owner;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public void setOwnerName(String ownerName) {
        this.ownerName = ownerName;
    }

    public Set<UUID> getMembers() {
        return members;
    }

    public boolean isTrusted(UUID uuid) {
        return owner.equals(uuid) || members.contains(uuid);
    }

    /** Location of the OneBlock itself. */
    public Location getCenter() {
        return center.clone();
    }

    /** Location a player is teleported to when joining or when falling into the void. */
    public Location getSpawn() {
        Location spawn = center.clone().add(0.5D, 1.0D, 0.5D);
        spawn.setYaw(90.0F);
        return spawn;
    }

    public int getBlocksBroken() {
        return blocksBroken;
    }

    public void setBlocksBroken(int blocksBroken) {
        this.blocksBroken = blocksBroken;
        this.dirty = true;
    }

    public int incrementBlocks() {
        this.dirty = true;
        return ++blocksBroken;
    }

    public int getPhaseIndex() {
        return phaseIndex;
    }

    public void setPhaseIndex(int phaseIndex) {
        this.phaseIndex = phaseIndex;
        this.dirty = true;
    }

    public String getPedestalSkin() {
        return pedestalSkin;
    }

    public void setPedestalSkin(String pedestalSkin) {
        this.pedestalSkin = pedestalSkin;
        this.dirty = true;
    }

    public String getHalo() {
        return halo;
    }

    public void setHalo(String halo) {
        this.halo = halo;
        this.dirty = true;
    }

    public String getBreakSound() {
        return breakSound;
    }

    public void setBreakSound(String breakSound) {
        this.breakSound = breakSound;
        this.dirty = true;
    }

    public boolean isHologramVisible() {
        return hologramVisible;
    }

    public void setHologramVisible(boolean hologramVisible) {
        this.hologramVisible = hologramVisible;
        this.dirty = true;
    }

    public boolean isDirty() {
        return dirty;
    }

    public void clearDirty() {
        this.dirty = false;
    }

    public void markDirty() {
        this.dirty = true;
    }
}
