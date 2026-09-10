package com.oneblock.util;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.resolver.Placeholder;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;
import net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Small helper around MiniMessage so the rest of the plugin never touches the serializer directly. */
public final class Text {

    private static final MiniMessage MM = MiniMessage.miniMessage();

    private Text() {
    }

    public static Component of(String raw) {
        return MM.deserialize(raw == null ? "" : raw);
    }

    /** Deserializes {@code raw} replacing every {@code <key>} tag with the literal value of the map entry. */
    public static Component of(String raw, Map<String, String> placeholders) {
        if (raw == null) {
            return Component.empty();
        }
        List<TagResolver> resolvers = new ArrayList<>(placeholders.size());
        for (Map.Entry<String, String> entry : placeholders.entrySet()) {
            resolvers.add(Placeholder.unparsed(entry.getKey(), entry.getValue() == null ? "" : entry.getValue()));
        }
        return MM.deserialize(raw, TagResolver.resolver(resolvers));
    }

    public static List<Component> ofAll(List<String> raw) {
        List<Component> out = new ArrayList<>(raw.size());
        for (String line : raw) {
            out.add(of(line));
        }
        return out;
    }

    public static String plain(Component component) {
        return PlainTextComponentSerializer.plainText().serialize(component);
    }

    public static String plain(String raw) {
        return plain(of(raw));
    }
}
