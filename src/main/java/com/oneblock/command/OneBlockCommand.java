package com.oneblock.command;

import com.oneblock.OneBlockPlugin;
import com.oneblock.config.Messages;
import com.oneblock.island.Island;
import com.oneblock.util.Text;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;
import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** {@code /oneblock} and all of its sub commands. */
public final class OneBlockCommand implements CommandExecutor, TabCompleter {

    private final OneBlockPlugin plugin;

    public OneBlockCommand(OneBlockPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(@NotNull CommandSender sender, @NotNull Command command,
                             @NotNull String label, String[] args) {
        if (args.length == 0) {
            help(sender);
            return true;
        }
        String sub = args[0].toLowerCase(Locale.ROOT);
        switch (sub) {
            case "gui", "menu" -> requirePlayer(sender, player -> plugin.getGuiManager().openMain(player));
            case "create", "crear" -> requirePlayer(sender, this::create);
            case "home", "go", "ir" -> requirePlayer(sender, this::home);
            case "top" -> top(sender);
            case "invite" -> requirePlayer(sender, player -> invite(player, args));
            case "kick" -> requirePlayer(sender, player -> kick(player, args));
            case "transfer" -> requirePlayer(sender, player -> transfer(player, args));
            case "settop" -> settop(sender);
            case "reload" -> reload(sender);
            default -> help(sender);
        }
        return true;
    }

    private interface PlayerAction {
        void run(Player player);
    }

    private void requirePlayer(CommandSender sender, PlayerAction action) {
        if (sender instanceof Player player) {
            action.run(player);
            return;
        }
        plugin.getMessages().send(sender, "command.players-only");
    }

    private void create(Player player) {
        if (plugin.getIslandManager().getIslandOf(player.getUniqueId()) != null) {
            plugin.getMessages().send(player, "island.already-exists");
            return;
        }
        Island island = plugin.getIslandManager().create(player);
        if (island == null) {
            plugin.getMessages().send(player, "island.create-failed");
            return;
        }
        plugin.getMessages().send(player, "island.created");
        plugin.getIslandManager().teleport(player, island);
    }

    private void home(Player player) {
        Island island = plugin.getIslandManager().getIslandOf(player.getUniqueId());
        if (island == null) {
            plugin.getMessages().send(player, "island.none");
            return;
        }
        plugin.getIslandManager().teleport(player, island);
        plugin.getMessages().send(player, "island.teleported");
    }

    private void top(CommandSender sender) {
        List<com.oneblock.storage.Database.LeaderboardEntry> top = plugin.getLeaderboardManager().getTop();
        if (top.isEmpty()) {
            plugin.getMessages().send(sender, "leaderboard.empty-command");
            return;
        }
        sender.sendMessage(Text.of(String.join("<newline>",
                plugin.getConfigManager().getMessages().getStringList("leaderboard.header"))));
        String format = plugin.getConfigManager().getMessages().getString("leaderboard.line",
                "<gray><position>. <white><player></white> - <aqua><blocks></aqua>");
        for (int i = 0; i < top.size(); i++) {
            var entry = top.get(i);
            sender.sendMessage(Text.of(format
                    .replace("<medal>", "")
                    .replace("<color>", "<gray>")
                    .replace("<position>", String.valueOf(i + 1))
                    .replace("<player>", entry.name() == null ? "?" : entry.name())
                    .replace("<blocks>", String.valueOf(entry.blocks()))));
        }
    }

    private void invite(Player player, String[] args) {
        Island island = requireOwnIsland(player);
        if (island == null || args.length < 2) {
            if (island != null) {
                plugin.getMessages().send(player, "command.usage-invite");
            }
            return;
        }
        Player target = Bukkit.getPlayerExact(args[1]);
        if (target == null) {
            plugin.getMessages().send(player, "command.player-offline");
            return;
        }
        plugin.getIslandManager().addMember(island, target.getUniqueId());
        plugin.getMessages().send(player, "island.member-added", Messages.of("player", target.getName()));
        plugin.getMessages().send(target, "island.member-joined", Messages.of("player", player.getName()));
    }

    private void kick(Player player, String[] args) {
        Island island = requireOwnIsland(player);
        if (island == null || args.length < 2) {
            if (island != null) {
                plugin.getMessages().send(player, "command.usage-kick");
            }
            return;
        }
        OfflinePlayer target = Bukkit.getOfflinePlayer(args[1]);
        plugin.getIslandManager().removeMember(island, target.getUniqueId());
        plugin.getMessages().send(player, "island.member-removed",
                Messages.of("player", target.getName() == null ? args[1] : target.getName()));
    }

    private void transfer(Player player, String[] args) {
        Island island = requireOwnIsland(player);
        if (island == null || args.length < 2) {
            if (island != null) {
                plugin.getMessages().send(player, "command.usage-transfer");
            }
            return;
        }
        Player target = Bukkit.getPlayerExact(args[1]);
        if (target == null) {
            plugin.getMessages().send(player, "command.player-offline");
            return;
        }
        plugin.getIslandManager().transfer(island, target.getUniqueId(), target.getName());
        plugin.getMessages().send(player, "island.transferred", Messages.of("player", target.getName()));
        plugin.getMessages().send(target, "island.received", Messages.of("player", player.getName()));
    }

    private Island requireOwnIsland(Player player) {
        Island island = plugin.getIslandManager().getIsland(player.getUniqueId());
        if (island == null) {
            plugin.getMessages().send(player, "island.not-owner");
        }
        return island;
    }

    private void settop(CommandSender sender) {
        if (!sender.hasPermission("oneblock.admin")) {
            plugin.getMessages().send(sender, "command.no-permission");
            return;
        }
        requirePlayer(sender, player -> {
            plugin.getLeaderboardManager().setLocation(player.getLocation());
            plugin.getMessages().send(player, "leaderboard.placed");
        });
    }

    private void reload(CommandSender sender) {
        if (!sender.hasPermission("oneblock.admin")) {
            plugin.getMessages().send(sender, "command.no-permission");
            return;
        }
        plugin.reloadEverything();
        plugin.getMessages().send(sender, "command.reloaded");
    }

    private void help(CommandSender sender) {
        for (String line : plugin.getConfigManager().getMessages().getStringList("command.help")) {
            sender.sendMessage(Text.of(line));
        }
    }

    @Override
    public List<String> onTabComplete(@NotNull CommandSender sender, @NotNull Command command,
                                      @NotNull String alias, String[] args) {
        List<String> out = new ArrayList<>();
        if (args.length == 1) {
            for (String option : List.of("gui", "menu", "create", "home", "top",
                    "invite", "kick", "transfer", "settop", "reload")) {
                if (option.startsWith(args[0].toLowerCase(Locale.ROOT))) {
                    out.add(option);
                }
            }
            return out;
        }
        if (args.length == 2 && List.of("invite", "kick", "transfer").contains(args[0].toLowerCase(Locale.ROOT))) {
            for (Player online : Bukkit.getOnlinePlayers()) {
                if (online.getName().toLowerCase(Locale.ROOT).startsWith(args[1].toLowerCase(Locale.ROOT))) {
                    out.add(online.getName());
                }
            }
        }
        return out;
    }
}
