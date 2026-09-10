package com.oneblock;

import com.oneblock.command.OneBlockCommand;
import com.oneblock.config.ConfigManager;
import com.oneblock.config.Messages;
import com.oneblock.cosmetics.ParticleHaloTask;
import com.oneblock.cosmetics.SkinManager;
import com.oneblock.display.HUDManager;
import com.oneblock.display.HologramManager;
import com.oneblock.display.LeaderboardManager;
import com.oneblock.display.ParticleEngine;
import com.oneblock.gui.GUIListener;
import com.oneblock.gui.GUIManager;
import com.oneblock.hook.PlaceholderHook;
import com.oneblock.island.Island;
import com.oneblock.island.IslandManager;
import com.oneblock.listener.BlockListener;
import com.oneblock.listener.PlayerListener;
import com.oneblock.listener.VoidListener;
import com.oneblock.phase.PhaseManager;
import com.oneblock.storage.Database;
import com.oneblock.storage.SQLiteStorage;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.command.PluginCommand;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;

/** Entry point: wires every manager together and owns the plugin lifecycle. */
public final class OneBlockPlugin extends JavaPlugin {

    private ConfigManager configManager;
    private Messages messages;
    private Database storage;
    private PhaseManager phaseManager;
    private IslandManager islandManager;
    private SkinManager skinManager;
    private HologramManager hologramManager;
    private HUDManager hudManager;
    private LeaderboardManager leaderboardManager;
    private GUIManager guiManager;
    private ParticleEngine particleEngine;

    private final Set<String> specialBlocks = ConcurrentHashMap.newKeySet();
    private BukkitTask haloTask;
    private BukkitTask leaderboardTask;
    private boolean placeholderHooked;

    @Override
    public void onEnable() {
        this.configManager = new ConfigManager(this);
        configManager.load();
        this.messages = new Messages(this);

        this.phaseManager = new PhaseManager(this);
        phaseManager.load();

        this.storage = new SQLiteStorage(this);
        try {
            storage.connect();
        } catch (Exception ex) {
            getLogger().log(Level.SEVERE, "Could not open the database - disabling OneBlock.", ex);
            getServer().getPluginManager().disablePlugin(this);
            return;
        }

        this.islandManager = new IslandManager(this);
        islandManager.prepareWorld();

        this.skinManager = new SkinManager(this);
        skinManager.load();
        skinManager.cleanupOrphans(islandManager.getWorld());

        this.hologramManager = new HologramManager(this);
        hologramManager.cleanupOrphans(islandManager.getWorld());

        this.hudManager = new HUDManager(this);
        this.leaderboardManager = new LeaderboardManager(this);
        leaderboardManager.load();
        this.guiManager = new GUIManager(this);
        this.particleEngine = new ParticleEngine(this);

        loadIslands();
        registerListeners();
        registerCommand();
        startTasks();
        hookPlaceholderApi();

        getLogger().info("OneBlock enabled: " + phaseManager.size() + " phases ready.");
    }

    @Override
    public void onDisable() {
        if (haloTask != null) {
            haloTask.cancel();
        }
        if (leaderboardTask != null) {
            leaderboardTask.cancel();
        }
        if (hudManager != null) {
            hudManager.hideAll();
        }
        if (hologramManager != null) {
            hologramManager.removeAll();
        }
        if (skinManager != null) {
            skinManager.despawnAll();
        }
        if (leaderboardManager != null) {
            leaderboardManager.despawn();
            leaderboardManager.save();
        }
        if (islandManager != null) {
            islandManager.saveAll();
        }
        if (storage != null) {
            storage.close();
        }
    }

    private void loadIslands() {
        async(() -> {
            List<Island> loaded = storage.loadIslands();
            sync(() -> {
                for (Island island : loaded) {
                    islandManager.cache(island);
                    hologramManager.refresh(island);
                    skinManager.apply(island);
                }
                getLogger().info("Loaded " + loaded.size() + " islands.");
                leaderboardManager.refresh();
            });
        });
    }

    private void registerListeners() {
        getServer().getPluginManager().registerEvents(new BlockListener(this), this);
        getServer().getPluginManager().registerEvents(new PlayerListener(this), this);
        getServer().getPluginManager().registerEvents(new VoidListener(this), this);
        getServer().getPluginManager().registerEvents(new GUIListener(), this);
    }

    private void registerCommand() {
        PluginCommand command = getCommand("oneblock");
        if (command == null) {
            getLogger().severe("The command 'oneblock' is missing from plugin.yml.");
            return;
        }
        OneBlockCommand executor = new OneBlockCommand(this);
        command.setExecutor(executor);
        command.setTabCompleter(executor);
    }

    private void startTasks() {
        long haloPeriod = Math.max(1L, getConfig().getLong("cosmetics.halo-period-ticks", 3L));
        haloTask = new ParticleHaloTask(this).runTaskTimer(this, 40L, haloPeriod);

        long leaderboardPeriod = Math.max(20L, getConfig().getLong("leaderboard.refresh-seconds", 60L) * 20L);
        leaderboardTask = getServer().getScheduler().runTaskTimer(this,
                () -> leaderboardManager.refresh(), leaderboardPeriod, leaderboardPeriod);
    }

    private void hookPlaceholderApi() {
        if (Bukkit.getPluginManager().getPlugin("PlaceholderAPI") == null) {
            return;
        }
        try {
            new PlaceholderHook(this).register();
            placeholderHooked = true;
            getLogger().info("PlaceholderAPI expansion registered.");
        } catch (LinkageError error) {
            getLogger().warning("PlaceholderAPI is present but incompatible: " + error.getMessage());
        }
    }

    /** Reloads every configuration file and repaints the visuals. */
    public void reloadEverything() {
        configManager.load();
        phaseManager.load();
        skinManager.load();
        for (Island island : islandManager.getIslands()) {
            hologramManager.refresh(island);
            skinManager.apply(island);
        }
        leaderboardManager.refresh();
    }

    /** Runs {@code runnable} off the main thread. */
    public void async(Runnable runnable) {
        if (!isEnabled()) {
            runnable.run();
            return;
        }
        getServer().getScheduler().runTaskAsynchronously(this, runnable);
    }

    /** Runs {@code runnable} on the main thread on the next tick. */
    public void sync(Runnable runnable) {
        if (!isEnabled()) {
            return;
        }
        getServer().getScheduler().runTask(this, runnable);
    }

    public void markSpecialBlock(Location location) {
        specialBlocks.add(keyOf(location));
    }

    public boolean isSpecialBlock(Location location) {
        return specialBlocks.contains(keyOf(location));
    }

    public void clearSpecialBlock(Location location) {
        specialBlocks.remove(keyOf(location));
    }

    private String keyOf(Location location) {
        return (location.getWorld() == null ? "?" : location.getWorld().getName())
                + ":" + location.getBlockX() + ":" + location.getBlockY() + ":" + location.getBlockZ();
    }

    public ConfigManager getConfigManager() {
        return configManager;
    }

    public Messages getMessages() {
        return messages;
    }

    public Database getStorage() {
        return storage;
    }

    public PhaseManager getPhaseManager() {
        return phaseManager;
    }

    public IslandManager getIslandManager() {
        return islandManager;
    }

    public SkinManager getSkinManager() {
        return skinManager;
    }

    public HologramManager getHologramManager() {
        return hologramManager;
    }

    public HUDManager getHudManager() {
        return hudManager;
    }

    public LeaderboardManager getLeaderboardManager() {
        return leaderboardManager;
    }

    public GUIManager getGuiManager() {
        return guiManager;
    }

    public ParticleEngine getParticleEngine() {
        return particleEngine;
    }

    public boolean isPlaceholderHooked() {
        return placeholderHooked;
    }
}
