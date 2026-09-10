package com.oneblock.config;

import com.oneblock.OneBlockPlugin;
import com.oneblock.util.Text;
import net.kyori.adventure.audience.Audience;
import net.kyori.adventure.text.Component;

import java.util.HashMap;
import java.util.Map;

/** Central message lookup: every player-facing string lives in messages.yml. */
public final class Messages {

    private final OneBlockPlugin plugin;

    public Messages(OneBlockPlugin plugin) {
        this.plugin = plugin;
    }

    public String raw(String key) {
        return plugin.getConfigManager().getMessages().getString(key, "<red>Missing message: " + key);
    }

    public Component get(String key) {
        return Text.of(prefixed(raw(key)));
    }

    public Component get(String key, Map<String, String> placeholders) {
        return Text.of(prefixed(raw(key)), placeholders);
    }

    private String prefixed(String message) {
        String prefix = plugin.getConfigManager().getMessages().getString("prefix", "");
        return message.contains("<no-prefix>") ? message.replace("<no-prefix>", "") : prefix + message;
    }

    public void send(Audience audience, String key) {
        audience.sendMessage(get(key));
    }

    public void send(Audience audience, String key, Map<String, String> placeholders) {
        audience.sendMessage(get(key, placeholders));
    }

    /** Convenience builder so call sites stay readable: {@code Messages.of("player", name)}. */
    public static Map<String, String> of(String... pairs) {
        Map<String, String> map = new HashMap<>();
        for (int i = 0; i + 1 < pairs.length; i += 2) {
            map.put(pairs[i], pairs[i + 1]);
        }
        return map;
    }
}
