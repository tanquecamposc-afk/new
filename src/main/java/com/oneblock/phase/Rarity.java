package com.oneblock.phase;

/** Chest rarities, the way the original OneBlock map grades its bonus chests. */
public enum Rarity {

    COMMON("<gray>", "<gray>Cofre comun</gray>"),
    UNCOMMON("<green>", "<green>Cofre poco comun</green>"),
    RARE("<aqua>", "<aqua>Cofre raro</aqua>"),
    EPIC("<light_purple>", "<light_purple>Cofre epico</light_purple>");

    private final String color;
    private final String label;

    Rarity(String color, String label) {
        this.color = color;
        this.label = label;
    }

    public String getColor() {
        return color;
    }

    public String getLabel() {
        return label;
    }
}
