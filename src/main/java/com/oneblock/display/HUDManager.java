package com.oneblock.display;

import com.oneblock.OneBlockPlugin;
import com.oneblock.config.Messages;
import com.oneblock.island.Island;
import com.oneblock.phase.Phase;
import com.oneblock.util.Text;
import net.kyori.adventure.bossbar.BossBar;
import org.bukkit.entity.Player;

import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Segmented boss bar plus action bar, both driven by island progress. */
public final class HUDManager {

    private final OneBlockPlugin plugin;
    private final Map<UUID, BossBar> bars = new ConcurrentHashMap<>();

    public HUDManager(OneBlockPlugin plugin) {
        this.plugin = plugin;
    }

    /** Shows (or updates) the boss bar of a player standing on {@code island}. */
    public void show(Player player, Island island) {
        if (!plugin.getConfigManager().getConfig().getBoolean("hud.bossbar", true)) {
            return;
        }
        Phase phase = plugin.getPhaseManager().byIndex(island.getPhaseIndex());
        BossBar bar = bars.get(player.getUniqueId());
        float progress = (float) plugin.getPhaseManager().progress(island.getBlocksBroken());
        if (bar == null) {
            bar = BossBar.bossBar(title(island, phase), clamp(progress), color(phase), BossBar.Overlay.NOTCHED_10);
            bars.put(player.getUniqueId(), bar);
            player.showBossBar(bar);
            return;
        }
        bar.name(title(island, phase));
        bar.progress(clamp(progress));
        bar.color(color(phase));
    }

    public void hide(Player player) {
        BossBar bar = bars.remove(player.getUniqueId());
        if (bar != null) {
            player.hideBossBar(bar);
        }
    }

    public void hideAll() {
        for (Player player : plugin.getServer().getOnlinePlayers()) {
            hide(player);
        }
        bars.clear();
    }

    /** Action bar shown when a player mines inside the island. */
    public void actionBar(Player player, Island island) {
        if (!plugin.getConfigManager().getConfig().getBoolean("hud.actionbar", true)) {
            return;
        }
        Phase phase = plugin.getPhaseManager().byIndex(island.getPhaseIndex());
        player.sendActionBar(Text.of(plugin.getConfigManager().getMessages()
                .getString("hud.actionbar", "<gray><blocks> bloques <dark_gray>|</dark_gray> <phase>"),
                placeholders(island, phase)));
    }

    private net.kyori.adventure.text.Component title(Island island, Phase phase) {
        return Text.of(plugin.getConfigManager().getMessages()
                .getString("hud.bossbar", "<phase> <gray>-</gray> <white><progress>%</white>"),
                placeholders(island, phase));
    }

    private Map<String, String> placeholders(Island island, Phase phase) {
        int percent = (int) Math.round(plugin.getPhaseManager().progress(island.getBlocksBroken()) * 100.0D);
        Phase next = plugin.getPhaseManager().next(island.getPhaseIndex());
        return Messages.of(
                "phase", phase == null ? "?" : Text.plain(phase.getDisplayName()),
                "blocks", String.valueOf(island.getBlocksBroken()),
                "progress", String.valueOf(percent),
                "next", next == null ? "MAX" : Text.plain(next.getDisplayName()),
                "remaining", String.valueOf(plugin.getPhaseManager().blocksUntilNext(island.getBlocksBroken())));
    }

    private BossBar.Color color(Phase phase) {
        if (phase == null) {
            return BossBar.Color.BLUE;
        }
        try {
            return BossBar.Color.valueOf(phase.getBossBarColor().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return BossBar.Color.BLUE;
        }
    }

    private float clamp(float value) {
        return Math.max(0.0F, Math.min(1.0F, value));
    }
}
