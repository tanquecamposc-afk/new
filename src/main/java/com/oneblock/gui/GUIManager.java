package com.oneblock.gui;

import com.oneblock.OneBlockPlugin;
import com.oneblock.config.Messages;
import com.oneblock.cosmetics.BlockSkin;
import com.oneblock.island.Island;
import com.oneblock.phase.Phase;
import com.oneblock.storage.Database;
import com.oneblock.util.Items;
import com.oneblock.util.Text;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;

import java.util.ArrayList;
import java.util.List;

/** Builds every menu of the plugin. All inventories are 54 slots and read-only for the player. */
public final class GUIManager {

    private static final int SIZE = 54;

    private final OneBlockPlugin plugin;

    public GUIManager(OneBlockPlugin plugin) {
        this.plugin = plugin;
    }

    private Inventory create(GUIHolder holder, String titleKey) {
        Inventory inventory = Bukkit.createInventory(holder, SIZE,
                Text.of(plugin.getConfigManager().getMessages().getString(titleKey, "OneBlock")));
        holder.setInventory(inventory);
        fillBorder(inventory);
        return inventory;
    }

    private void fillBorder(Inventory inventory) {
        ItemStack filler = Items.build(Material.BLACK_STAINED_GLASS_PANE, " ", List.of());
        for (int slot = 0; slot < SIZE; slot++) {
            boolean edge = slot < 9 || slot >= SIZE - 9 || slot % 9 == 0 || slot % 9 == 8;
            if (edge) {
                inventory.setItem(slot, filler);
            }
        }
    }

    private void backButton(GUIHolder holder, Inventory inventory, int slot) {
        inventory.setItem(slot, Items.build(Material.ARROW,
                plugin.getConfigManager().getMessages().getString("gui.back", "<red>Volver"), List.of()));
        holder.bind(slot, (player, click) -> openMain(player));
    }

    /** Main hub: phases, cosmetics, stats and island settings. */
    public void openMain(Player player) {
        GUIHolder holder = new GUIHolder(GUIHolder.Menu.MAIN);
        Inventory inventory = create(holder, "gui.main.title");
        Island island = plugin.getIslandManager().getIslandOf(player.getUniqueId());
        Phase phase = island == null ? null : plugin.getPhaseManager().byIndex(island.getPhaseIndex());

        inventory.setItem(20, Items.build(Material.FILLED_MAP,
                "<gradient:#00e0ff:#0066ff><bold>Navegador de Fases</bold></gradient>",
                List.of("<gray>Recorre las 10 fases y sus requisitos.</gray>",
                        "<white>Fase actual: <aqua>" + (phase == null ? "-" : Text.plain(phase.getDisplayName())))));
        holder.bind(20, (clicker, click) -> openPhases(clicker));

        inventory.setItem(22, Items.build(Material.AMETHYST_CLUSTER,
                "<gradient:#ff00cc:#ff8800><bold>Cosmeticos del Bloque</bold></gradient>",
                List.of("<gray>Pedestales, auras y sonidos.</gray>",
                        "<gray>Pruebalos y equipalos al instante.</gray>")));
        holder.bind(22, (clicker, click) -> openCosmetics(clicker));

        inventory.setItem(24, Items.build(Material.PLAYER_HEAD,
                "<gradient:#ffd700:#fff6a9><bold>Estadisticas y Top 10</bold></gradient>",
                List.of("<gray>Tu progreso y la clasificacion global.</gray>")));
        holder.bind(24, (clicker, click) -> openStats(clicker));

        inventory.setItem(31, Items.build(Material.COMPARATOR,
                "<gradient:#9effa0:#2fbf71><bold>Ajustes de Isla</bold></gradient>",
                List.of("<gray>Holograma, miembros y transferencia.</gray>")));
        holder.bind(31, (clicker, click) -> openSettings(clicker));

        player.openInventory(inventory);
    }

    /** Visual path through every configured phase. */
    public void openPhases(Player player) {
        GUIHolder holder = new GUIHolder(GUIHolder.Menu.PHASES);
        Inventory inventory = create(holder, "gui.phases.title");
        Island island = plugin.getIslandManager().getIslandOf(player.getUniqueId());
        int blocks = island == null ? 0 : island.getBlocksBroken();
        int currentIndex = plugin.getPhaseManager().indexFor(blocks);

        List<Phase> phases = plugin.getPhaseManager().getPhases();
        int[] path = {10, 11, 12, 13, 14, 15, 16, 28, 29, 30, 31, 32, 33, 34};
        for (int i = 0; i < phases.size() && i < path.length; i++) {
            Phase phase = phases.get(i);
            boolean reached = i <= currentIndex;
            List<String> lore = new ArrayList<>();
            lore.add("<gray>Requiere: <white>" + phase.getRequiredBlocks() + " bloques</white>");
            lore.add(reached ? "<green>Fase desbloqueada</green>" : "<red>Bloqueada</red>");
            if (i == currentIndex) {
                lore.add("<yellow>Estas aqui.</yellow>");
                lore.add("<gray>Faltan <white>"
                        + plugin.getPhaseManager().blocksUntilNext(blocks) + "</white> para la siguiente.</gray>");
            }
            lore.add("<dark_gray>Bloques: " + phase.getBlockWeights().size()
                    + " | Mobs: " + phase.getMobWeights().size() + "</dark_gray>");
            inventory.setItem(path[i], Items.build(
                    reached ? phase.getIcon() : Material.GRAY_STAINED_GLASS_PANE,
                    phase.getColorTag() + phase.getDisplayName(), lore));
        }
        backButton(holder, inventory, 49);
        player.openInventory(inventory);
    }

    /** Cosmetics shop: pedestals on row 2, halos on row 3, sounds on row 4. */
    public void openCosmetics(Player player) {
        GUIHolder holder = new GUIHolder(GUIHolder.Menu.COSMETICS);
        Inventory inventory = create(holder, "gui.cosmetics.title");
        Island island = plugin.getIslandManager().getIslandOf(player.getUniqueId());

        row(holder, inventory, player, island, BlockSkin.Type.PEDESTAL, 10);
        row(holder, inventory, player, island, BlockSkin.Type.HALO, 19);
        row(holder, inventory, player, island, BlockSkin.Type.SOUND, 28);

        inventory.setItem(48, Items.build(Material.BARRIER, "<red>Quitar pedestal</red>", List.of()));
        holder.bind(48, (clicker, click) -> {
            if (island != null) {
                plugin.getSkinManager().unequip(island, BlockSkin.Type.PEDESTAL);
                openCosmetics(clicker);
            }
        });
        inventory.setItem(50, Items.build(Material.BARRIER, "<red>Quitar aura</red>", List.of()));
        holder.bind(50, (clicker, click) -> {
            if (island != null) {
                plugin.getSkinManager().unequip(island, BlockSkin.Type.HALO);
                openCosmetics(clicker);
            }
        });
        backButton(holder, inventory, 49);
        player.openInventory(inventory);
    }

    private void row(GUIHolder holder, Inventory inventory, Player player, Island island,
                     BlockSkin.Type type, int startSlot) {
        List<BlockSkin> options = plugin.getSkinManager().byType(type);
        for (int i = 0; i < options.size() && i < 7; i++) {
            BlockSkin skin = options.get(i);
            boolean unlocked = plugin.getSkinManager().isUnlocked(player, island, skin);
            boolean equipped = island != null && equippedId(island, type).equalsIgnoreCase(skin.getId());

            List<String> lore = new ArrayList<>(skin.getLore());
            lore.add("<dark_gray>-------------------</dark_gray>");
            lore.add("<gray>Click derecho para probarlo.</gray>");
            if (equipped) {
                lore.add("<green>Equipado</green>");
            } else if (unlocked) {
                lore.add("<yellow>Click izquierdo para equipar</yellow>");
            } else if (skin.getRequiredPhase() > 0) {
                lore.add("<red>Se desbloquea en la fase " + (skin.getRequiredPhase() + 1) + "</red>");
            } else {
                lore.add("<red>Necesitas el permiso " + skin.getPermission() + "</red>");
            }

            int slot = startSlot + i;
            inventory.setItem(slot, Items.build(
                    unlocked ? skin.getIcon() : Material.GRAY_DYE, skin.getDisplayName(), lore));
            holder.bind(slot, (clicker, click) -> {
                if (click.isRightClick()) {
                    clicker.closeInventory();
                    plugin.getSkinManager().preview(clicker, skin);
                    return;
                }
                if (island == null) {
                    plugin.getMessages().send(clicker, "island.none");
                    return;
                }
                if (!plugin.getSkinManager().equip(clicker, island, skin)) {
                    plugin.getMessages().send(clicker, "cosmetic.locked");
                    return;
                }
                plugin.getMessages().send(clicker, "cosmetic.equipped",
                        Messages.of("cosmetic", Text.plain(skin.getDisplayName())));
                openCosmetics(clicker);
            });
        }
    }

    private String equippedId(Island island, BlockSkin.Type type) {
        return switch (type) {
            case PEDESTAL -> island.getPedestalSkin();
            case HALO -> island.getHalo();
            case SOUND -> island.getBreakSound();
        };
    }

    /** Personal statistics on the left, live Top 10 on the right. */
    public void openStats(Player player) {
        GUIHolder holder = new GUIHolder(GUIHolder.Menu.STATS);
        Inventory inventory = create(holder, "gui.stats.title");
        Island island = plugin.getIslandManager().getIslandOf(player.getUniqueId());

        if (island != null) {
            Phase phase = plugin.getPhaseManager().byIndex(island.getPhaseIndex());
            Phase next = plugin.getPhaseManager().next(island.getPhaseIndex());
            inventory.setItem(20, Items.head(player, "<aqua>" + player.getName(), List.of(
                    "<gray>Bloques picados: <white>" + island.getBlocksBroken(),
                    "<gray>Fase: <white>" + (phase == null ? "-" : Text.plain(phase.getDisplayName())),
                    "<gray>Siguiente: <white>" + (next == null ? "MAX" : Text.plain(next.getDisplayName())),
                    "<gray>Faltan: <white>"
                            + plugin.getPhaseManager().blocksUntilNext(island.getBlocksBroken()),
                    "<gray>Miembros: <white>" + island.getMembers().size())));
        } else {
            inventory.setItem(20, Items.build(Material.BARRIER, "<red>Sin isla</red>",
                    List.of("<gray>Usa /ob create para empezar.</gray>")));
        }

        List<Database.LeaderboardEntry> top = plugin.getLeaderboardManager().getTop();
        int[] slots = {13, 14, 15, 16, 22, 23, 24, 25, 32, 33};
        for (int i = 0; i < top.size() && i < slots.length; i++) {
            Database.LeaderboardEntry entry = top.get(i);
            inventory.setItem(slots[i], Items.head(Bukkit.getOfflinePlayer(entry.uuid()),
                    "<yellow>#" + (i + 1) + " <white>" + entry.name(),
                    List.of("<gray>Bloques: <aqua>" + entry.blocks())));
        }
        if (top.isEmpty()) {
            inventory.setItem(22, Items.build(Material.PAPER, "<gray>Ranking vacio</gray>",
                    List.of("<dark_gray>Se recalcula cada minuto.</dark_gray>")));
        }
        backButton(holder, inventory, 49);
        player.openInventory(inventory);
    }

    /** Island settings: hologram toggle and member management shortcuts. */
    public void openSettings(Player player) {
        GUIHolder holder = new GUIHolder(GUIHolder.Menu.SETTINGS);
        Inventory inventory = create(holder, "gui.settings.title");
        Island island = plugin.getIslandManager().getIslandOf(player.getUniqueId());
        if (island == null) {
            inventory.setItem(22, Items.build(Material.BARRIER, "<red>Sin isla</red>",
                    List.of("<gray>Usa /ob create para empezar.</gray>")));
            backButton(holder, inventory, 49);
            player.openInventory(inventory);
            return;
        }

        inventory.setItem(20, Items.build(
                island.isHologramVisible() ? Material.GLOWSTONE : Material.GLASS,
                "<aqua>Holograma del bloque</aqua>",
                List.of(island.isHologramVisible() ? "<green>Visible</green>" : "<red>Oculto</red>",
                        "<gray>Click para cambiar.</gray>")));
        holder.bind(20, (clicker, click) -> {
            island.setHologramVisible(!island.isHologramVisible());
            plugin.getHologramManager().refresh(island);
            plugin.getStorage().saveIsland(island);
            openSettings(clicker);
        });

        inventory.setItem(22, Items.build(Material.PLAYER_HEAD, "<yellow>Miembros de la isla</yellow>",
                List.of("<gray>Actuales: <white>" + island.getMembers().size(),
                        "<gray>Invita con <white>/ob invite &lt;jugador&gt;",
                        "<gray>Expulsa con <white>/ob kick &lt;jugador&gt;")));

        inventory.setItem(24, Items.build(Material.WRITABLE_BOOK, "<gold>Transferir isla</gold>",
                List.of("<gray>Usa <white>/ob transfer &lt;jugador&gt;",
                        "<red>Perderas la propiedad.</red>")));

        inventory.setItem(30, Items.build(Material.ENDER_PEARL, "<light_purple>Ir a mi isla</light_purple>",
                List.of("<gray>Teletransporte inmediato.</gray>")));
        holder.bind(30, (clicker, click) -> {
            clicker.closeInventory();
            plugin.getIslandManager().teleport(clicker, island);
        });

        backButton(holder, inventory, 49);
        player.openInventory(inventory);
    }
}
