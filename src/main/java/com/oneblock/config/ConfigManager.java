package com.oneblock.config;

import com.oneblock.OneBlockPlugin;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.configuration.file.YamlConfiguration;

import java.io.File;

/** Loads and reloads config.yml, phases.yml, skins.yml and messages.yml. */
public final class ConfigManager {

    private final OneBlockPlugin plugin;

    private FileConfiguration config;
    private FileConfiguration phases;
    private FileConfiguration skins;
    private FileConfiguration messages;

    public ConfigManager(OneBlockPlugin plugin) {
        this.plugin = plugin;
    }

    public void load() {
        plugin.saveDefaultConfig();
        plugin.reloadConfig();
        this.config = plugin.getConfig();
        this.phases = read("phases.yml");
        this.skins = read("skins.yml");
        this.messages = read("messages.yml");
    }

    private FileConfiguration read(String name) {
        File file = new File(plugin.getDataFolder(), name);
        if (!file.exists()) {
            plugin.saveResource(name, false);
        }
        return YamlConfiguration.loadConfiguration(file);
    }

    public FileConfiguration getConfig() {
        return config;
    }

    public FileConfiguration getPhases() {
        return phases;
    }

    public FileConfiguration getSkins() {
        return skins;
    }

    public FileConfiguration getMessages() {
        return messages;
    }
}
