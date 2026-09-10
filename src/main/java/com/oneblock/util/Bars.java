package com.oneblock.util;

import java.util.Locale;

/** Unicode progress bars, written as MiniMessage so callers can drop them straight into a template. */
public final class Bars {

    private static final char FILLED = '▰';
    private static final char EMPTY = '▱';

    private Bars() {
    }

    public static String progress(double ratio, int length, String filledColor, String emptyColor) {
        int filled = (int) Math.round(Math.max(0.0D, Math.min(1.0D, ratio)) * length);
        return filledColor + String.valueOf(FILLED).repeat(filled) + "</color>"
                + emptyColor + String.valueOf(EMPTY).repeat(length - filled) + "</color>";
    }

    /** Bar in the colour of the phase, used by the hologram and the menus. */
    public static String phaseProgress(double ratio, int length) {
        return progress(ratio, length, "<color:#4dff9f>", "<color:#3a3a3a>");
    }

    /** Value cycling between 0 and 1, for animated MiniMessage gradients. */
    public static String shift(double tick) {
        double value = (tick % (2.0D * Math.PI)) / (2.0D * Math.PI);
        return String.format(Locale.ROOT, "%.2f", value);
    }
}
