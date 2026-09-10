package com.oneblock.hook;

import com.oneblock.OneBlockPlugin;
import com.oneblock.island.Island;
import com.oneblock.phase.Phase;
import com.oneblock.storage.Database;
import com.oneblock.util.Text;
import me.clip.placeholderapi.expansion.PlaceholderExpansion;
import org.bukkit.OfflinePlayer;
import org.jetbrains.annotations.NotNull;

import java.util.Locale;

/** PlaceholderAPI expansion exposing island progress and the Top 10. */
public final class PlaceholderHook extends PlaceholderExpansion {

    private final OneBlockPlugin plugin;

    public PlaceholderHook(OneBlockPlugin plugin) {
        this.plugin = plugin;
    }

    @NotNull
    @Override
    public String getIdentifier() {
        return "oneblock";
    }

    @NotNull
    @Override
    public String getAuthor() {
        return String.join(", ", plugin.getDescription().getAuthors());
    }

    @NotNull
    @Override
    public String getVersion() {
        return plugin.getDescription().getVersion();
    }

    @Override
    public boolean persist() {
        return true;
    }

    @Override
    public String onRequest(OfflinePlayer player, @NotNull String params) {
        String key = params.toLowerCase(Locale.ROOT);
        if (key.startsWith("top_")) {
            return topPlaceholder(key);
        }
        if (player == null) {
            return "";
        }
        Island island = plugin.getIslandManager().getIslandOf(player.getUniqueId());
        if (island == null) {
            return switch (key) {
                case "count", "next_phase" -> "0";
                default -> "-";
            };
        }
        Phase phase = plugin.getPhaseManager().byIndex(island.getPhaseIndex());
        Phase next = plugin.getPhaseManager().next(island.getPhaseIndex());
        return switch (key) {
            case "phase" -> phase == null ? "-" : Text.plain(phase.getDisplayName());
            case "phase_id" -> phase == null ? "-" : phase.getId();
            case "count", "blocks" -> String.valueOf(island.getBlocksBroken());
            case "next_phase" -> String.valueOf(plugin.getPhaseManager().blocksUntilNext(island.getBlocksBroken()));
            case "next_phase_name" -> next == null ? "MAX" : Text.plain(next.getDisplayName());
            case "progress" -> String.valueOf(
                    (int) Math.round(plugin.getPhaseManager().progress(island.getBlocksBroken()) * 100.0D));
            case "members" -> String.valueOf(island.getMembers().size());
            case "halo" -> island.getHalo();
            case "pedestal" -> island.getPedestalSkin();
            default -> null;
        };
    }

    /** Handles {@code %oneblock_top_<n>_name%} and {@code %oneblock_top_<n>_blocks%}. */
    private String topPlaceholder(String key) {
        String[] parts = key.split("_");
        if (parts.length < 3) {
            return null;
        }
        int position;
        try {
            position = Integer.parseInt(parts[1]);
        } catch (NumberFormatException ex) {
            return null;
        }
        Database.LeaderboardEntry entry = plugin.getLeaderboardManager().get(position);
        return switch (parts[2]) {
            case "name" -> entry == null ? "-" : entry.name();
            case "blocks" -> entry == null ? "0" : String.valueOf(entry.blocks());
            case "uuid" -> entry == null ? "" : entry.uuid().toString();
            default -> null;
        };
    }
}
