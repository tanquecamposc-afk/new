package com.oneblock.gui;

import com.oneblock.OneBlockPlugin;
import com.oneblock.config.Messages;
import com.oneblock.cosmetics.BlockSkin;
import com.oneblock.island.Island;
import com.oneblock.phase.Phase;
import com.oneblock.storage.Database;
import com.oneblock.util.Bars;
import com.oneblock.util.Items;
import com.oneblock.util.Text;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds every menu of the plugin. All menus share the same 54-slot skeleton: a themed frame, a
 * profile header on top and a tab bar at the bottom, so navigation never dead-ends on a back arrow.
 */
public final class GUIManager {

    private static final int SIZE = 54;
    private static final int HEADER_SLOT = 4;
    private static final String SEPARATOR = "<dark_gray>▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪</dark_gray>";

    /** Serpentine path used by the phase browser: left to right, then back right to left. */
    private static final int[] PHASE_PATH = {10, 11, 12, 13, 14, 15, 16, 34, 33, 32, 31, 30, 29, 28};

    private final OneBlockPlugin plugin;

    public GUIManager(OneBlockPlugin plugin) {
        this.plugin = plugin;
    }

    // ------------------------------------------------------------------ skeleton

    private Inventory create(GUIHolder holder, String titleKey, Player player, Material pane) {
        Inventory inventory = Bukkit.createInventory(holder, SIZE,
                Text.of(plugin.getConfigManager().getMessages().getString(titleKey, "OneBlock")));
        holder.setInventory(inventory);
        frame(holder, inventory, player, pane);
        return inventory;
    }

    private void frame(GUIHolder holder, Inventory inventory, Player player, Material pane) {
        ItemStack filler = Items.build(pane, " ", List.of());
        for (int slot = 0; slot < SIZE; slot++) {
            boolean edge = slot < 9 || slot >= SIZE - 9 || slot % 9 == 0 || slot % 9 == 8;
            if (edge) {
                inventory.setItem(slot, filler);
            }
        }
        inventory.setItem(HEADER_SLOT, header(player));
        tabs(holder, inventory);
    }

    /** Profile card: who you are, where you are and how far along the current phase you are. */
    private ItemStack header(Player player) {
        Island island = plugin.getIslandManager().getIslandOf(player.getUniqueId());
        if (island == null) {
            return Items.head(player, "<gradient:#ff0055:#ff5500><bold>" + player.getName() + "</bold></gradient>",
                    List.of(SEPARATOR, "<gray>Todavia no tienes isla.</gray>",
                            "<yellow>Usa <white>/ob create</white> para empezar.</yellow>"));
        }
        Phase phase = plugin.getPhaseManager().byIndex(island.getPhaseIndex());
        Phase next = plugin.getPhaseManager().next(island.getPhaseIndex());
        double ratio = plugin.getPhaseManager().progress(island.getBlocksBroken());
        return Items.head(player, "<gradient:#ff0055:#ff5500><bold>" + player.getName() + "</bold></gradient>",
                List.of(SEPARATOR,
                        "<gray>Fase</gray> <white>" + (phase == null ? "-" : phase.getColorTag()
                                + Text.plain(phase.getDisplayName())),
                        "<gray>Bloques</gray> <white>" + island.getBlocksBroken(),
                        "",
                        Bars.phaseProgress(ratio, 20) + " <yellow>" + (int) Math.round(ratio * 100) + "%</yellow>",
                        "<gray>Siguiente: <white>" + (next == null ? "MAX" : Text.plain(next.getDisplayName()))
                                + "</white> <dark_gray>(" + plugin.getPhaseManager()
                                .blocksUntilNext(island.getBlocksBroken()) + " bloques)</dark_gray>",
                        SEPARATOR));
    }

    /** Bottom tab bar. The tab of the menu you are looking at glows. */
    private void tabs(GUIHolder holder, Inventory inventory) {
        tab(holder, inventory, 47, Material.FILLED_MAP, "<aqua><bold>Fases</bold></aqua>",
                "Recorre las 10 fases", GUIHolder.Menu.PHASES, this::openPhases);
        tab(holder, inventory, 49, Material.AMETHYST_CLUSTER,
                "<light_purple><bold>Cosmeticos</bold></light_purple>",
                "Pedestales, auras y sonidos", GUIHolder.Menu.COSMETICS, this::openCosmetics);
        tab(holder, inventory, 51, Material.GOLDEN_HELMET, "<gold><bold>Top 10</bold></gold>",
                "Podio y estadisticas", GUIHolder.Menu.STATS, this::openStats);
        tab(holder, inventory, 53, Material.COMPARATOR, "<green><bold>Ajustes</bold></green>",
                "Holograma, miembros, isla", GUIHolder.Menu.SETTINGS, this::openSettings);

        inventory.setItem(45, Items.build(Material.BARRIER, "<red><bold>Cerrar</bold></red>",
                List.of("<gray>Cierra el menu.</gray>")));
        holder.bind(45, (player, click) -> {
            player.closeInventory();
            sound(player, "ui.button.click", 1.2F);
        });
    }

    private void tab(GUIHolder holder, Inventory inventory, int slot, Material icon, String name,
                     String description, GUIHolder.Menu target, java.util.function.Consumer<Player> action) {
        boolean active = holder.getMenu() == target;
        List<String> lore = new ArrayList<>();
        lore.add("<gray>" + description + "</gray>");
        lore.add(active ? "<green>Estas aqui</green>" : "<yellow>Click para abrir</yellow>");
        inventory.setItem(slot, Items.build(icon, name, lore, active));
        if (!active) {
            holder.bind(slot, (player, click) -> {
                sound(player, "ui.button.click", 1.6F);
                action.accept(player);
            });
        }
    }

    private void sound(Player player, String key, float pitch) {
        player.playSound(player.getLocation(), key, 0.5F, pitch);
    }

    // ------------------------------------------------------------------ main

    public void openMain(Player player) {
        GUIHolder holder = new GUIHolder(GUIHolder.Menu.MAIN);
        Inventory inventory = create(holder, "gui.main.title", player, Material.BLACK_STAINED_GLASS_PANE);

        category(holder, inventory, 20, Material.FILLED_MAP,
                "<gradient:#00e0ff:#0066ff><bold>Navegador de Fases</bold></gradient>",
                List.of("<gray>El camino completo de las 10 fases,</gray>",
                        "<gray>con requisitos, botin y mobs.</gray>"),
                this::openPhases);
        category(holder, inventory, 22, Material.AMETHYST_CLUSTER,
                "<gradient:#ff00cc:#ff8800><bold>Cosmeticos del Bloque</bold></gradient>",
                List.of("<gray>Pedestales flotantes, auras de</gray>",
                        "<gray>particulas y sonidos de rotura.</gray>",
                        "<dark_gray>Click derecho en el menu para probar.</dark_gray>"),
                this::openCosmetics);
        category(holder, inventory, 24, Material.GOLDEN_HELMET,
                "<gradient:#ffd700:#fff6a9><bold>Podio y Estadisticas</bold></gradient>",
                List.of("<gray>El Top 10 del servidor en vivo</gray>",
                        "<gray>y tus propios numeros.</gray>"),
                this::openStats);
        category(holder, inventory, 31, Material.COMPARATOR,
                "<gradient:#9effa0:#2fbf71><bold>Ajustes de Isla</bold></gradient>",
                List.of("<gray>Holograma, miembros, transferencia</gray>",
                        "<gray>y viaje rapido a tu bloque.</gray>"),
                this::openSettings);

        // Decorative frame around the four categories.
        ItemStack accent = Items.build(Material.CYAN_STAINED_GLASS_PANE, " ", List.of());
        for (int slot : new int[]{19, 21, 23, 25, 30, 32}) {
            inventory.setItem(slot, accent);
        }
        player.openInventory(inventory);
        sound(player, "block.ender_chest.open", 1.4F);
    }

    private void category(GUIHolder holder, Inventory inventory, int slot, Material icon, String name,
                          List<String> description, java.util.function.Consumer<Player> action) {
        List<String> lore = new ArrayList<>(description);
        lore.add("");
        lore.add("<yellow>➤ Click para abrir</yellow>");
        inventory.setItem(slot, Items.build(icon, name, lore));
        holder.bind(slot, (player, click) -> {
            sound(player, "ui.button.click", 1.6F);
            action.accept(player);
        });
    }

    // ------------------------------------------------------------------ phases

    public void openPhases(Player player) {
        GUIHolder holder = new GUIHolder(GUIHolder.Menu.PHASES);
        Inventory inventory = create(holder, "gui.phases.title", player, Material.BLUE_STAINED_GLASS_PANE);
        Island island = plugin.getIslandManager().getIslandOf(player.getUniqueId());
        int blocks = island == null ? 0 : island.getBlocksBroken();
        int currentIndex = plugin.getPhaseManager().indexFor(blocks);

        List<Phase> phases = plugin.getPhaseManager().getPhases();
        for (int i = 0; i < phases.size() && i < PHASE_PATH.length; i++) {
            inventory.setItem(PHASE_PATH[i], phaseIcon(phases.get(i), i, currentIndex, blocks, island));
        }
        // Elbow of the path, between the two rows.
        if (phases.size() > 7) {
            inventory.setItem(25, Items.build(Material.LIGHT_BLUE_STAINED_GLASS_PANE,
                    "<aqua>▼ el camino sigue abajo ▼</aqua>", List.of()));
        }
        player.openInventory(inventory);
        sound(player, "item.book.page_turn", 1.2F);
    }

    private ItemStack phaseIcon(Phase phase, int index, int currentIndex, int blocks, Island island) {
        boolean reached = index <= currentIndex;
        boolean current = index == currentIndex;
        List<String> lore = new ArrayList<>();
        lore.add(SEPARATOR);
        lore.add("<gray>Requisito</gray> <white>" + phase.getRequiredBlocks() + " bloques</white>");
        lore.add("<gray>Contenido</gray> <white>" + phase.getBlockWeights().size() + " bloques, "
                + phase.getMobWeights().size() + " mobs</white>");
        if (phase.getBorderSize() > 0.0D) {
            lore.add("<gray>Borde del mundo</gray> <white>" + (int) phase.getBorderSize() + "</white>");
        }
        lore.add("");
        if (current && island != null) {
            double ratio = plugin.getPhaseManager().progress(blocks);
            lore.add(Bars.phaseProgress(ratio, 20) + " <yellow>" + (int) Math.round(ratio * 100) + "%</yellow>");
            lore.add("<yellow>◆ Fase actual</yellow>");
            lore.add("<gray>Faltan <white>" + plugin.getPhaseManager().blocksUntilNext(blocks)
                    + "</white> para la siguiente.</gray>");
        } else if (reached) {
            lore.add("<green>✔ Superada</green>");
        } else {
            lore.add("<red>✖ Bloqueada</red>");
            lore.add("<dark_gray>Te faltan " + Math.max(0, phase.getRequiredBlocks() - blocks)
                    + " bloques.</dark_gray>");
        }
        lore.add(SEPARATOR);

        String name = (reached ? phase.getColorTag() : "<dark_gray>") + "<bold>"
                + Text.plain(phase.getDisplayName()) + "</bold>"
                + " <dark_gray>#" + (index + 1) + "</dark_gray>";
        return Items.build(reached ? phase.getIcon() : Material.GRAY_STAINED_GLASS_PANE, name, lore, current);
    }

    // ------------------------------------------------------------------ cosmetics

    public void openCosmetics(Player player) {
        GUIHolder holder = new GUIHolder(GUIHolder.Menu.COSMETICS);
        Inventory inventory = create(holder, "gui.cosmetics.title", player,
                Material.PURPLE_STAINED_GLASS_PANE);
        Island island = plugin.getIslandManager().getIslandOf(player.getUniqueId());

        row(holder, inventory, player, island, BlockSkin.Type.PEDESTAL, 9,
                Material.AMETHYST_BLOCK, "<gradient:#b06bff:#ff8ae2><bold>Pedestales</bold></gradient>",
                "Bloques flotantes que orbitan tu OneBlock");
        row(holder, inventory, player, island, BlockSkin.Type.HALO, 18,
                Material.BLAZE_POWDER, "<gradient:#ff5f00:#ffcc00><bold>Auras</bold></gradient>",
                "Particulas animadas alrededor del bloque");
        row(holder, inventory, player, island, BlockSkin.Type.SOUND, 27,
                Material.NOTE_BLOCK, "<gradient:#7ee8fa:#ffffff><bold>Sonidos</bold></gradient>",
                "Lo que suena cada vez que picas");

        player.openInventory(inventory);
        sound(player, "block.amethyst_block.chime", 1.4F);
    }

    private void row(GUIHolder holder, Inventory inventory, Player player, Island island,
                     BlockSkin.Type type, int labelSlot, Material labelIcon, String labelName,
                     String labelDescription) {
        inventory.setItem(labelSlot, Items.build(labelIcon, labelName,
                List.of("<gray>" + labelDescription + "</gray>",
                        "<dark_gray>Equipado: " + equippedId(island, type) + "</dark_gray>")));

        List<BlockSkin> options = plugin.getSkinManager().byType(type);
        for (int i = 0; i < options.size() && i < 7; i++) {
            BlockSkin skin = options.get(i);
            boolean unlocked = plugin.getSkinManager().isUnlocked(player, island, skin);
            boolean equipped = island != null && equippedId(island, type).equalsIgnoreCase(skin.getId());
            int slot = labelSlot + 1 + i;
            inventory.setItem(slot, cosmeticIcon(skin, unlocked, equipped));
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
                    sound(clicker, "block.note_block.bass", 0.8F);
                    plugin.getMessages().send(clicker, "cosmetic.locked");
                    return;
                }
                sound(clicker, "entity.player.levelup", 1.8F);
                plugin.getMessages().send(clicker, "cosmetic.equipped",
                        Messages.of("cosmetic", Text.plain(skin.getDisplayName())));
                openCosmetics(clicker);
            });
        }

        // Right edge of the row clears the category.
        int clearSlot = labelSlot + 8;
        inventory.setItem(clearSlot, Items.build(Material.STRUCTURE_VOID, "<red>Quitar</red>",
                List.of("<gray>Deja esta categoria vacia.</gray>")));
        holder.bind(clearSlot, (clicker, click) -> {
            if (island != null) {
                plugin.getSkinManager().unequip(island, type);
                sound(clicker, "ui.button.click", 0.9F);
                openCosmetics(clicker);
            }
        });
    }

    private ItemStack cosmeticIcon(BlockSkin skin, boolean unlocked, boolean equipped) {
        List<String> lore = new ArrayList<>();
        lore.add(SEPARATOR);
        lore.addAll(skin.getLore());
        lore.add("");
        if (skin.getType() == BlockSkin.Type.HALO) {
            lore.add("<dark_gray>Forma: " + skin.getShape() + " · radio " + skin.getRadius() + "</dark_gray>");
        } else if (skin.getType() == BlockSkin.Type.PEDESTAL) {
            lore.add("<dark_gray>Piezas: " + skin.getPedestalCount() + "</dark_gray>");
        } else {
            lore.add("<dark_gray>Sonido: " + skin.getSound() + "</dark_gray>");
        }
        lore.add("");
        if (equipped) {
            lore.add("<green>✔ Equipado</green>");
        } else if (unlocked) {
            lore.add("<yellow>➤ Click izquierdo para equipar</yellow>");
        } else if (skin.getRequiredPhase() > 0) {
            lore.add("<red>✖ Llega a la fase " + (skin.getRequiredPhase() + 1) + "</red>");
        } else {
            lore.add("<red>✖ Requiere <white>" + skin.getPermission() + "</white></red>");
        }
        lore.add("<gray>Click derecho para probarlo</gray>");
        lore.add(SEPARATOR);
        return Items.build(unlocked ? skin.getIcon() : Material.GRAY_DYE,
                (unlocked ? "" : "<dark_gray>") + skin.getDisplayName(), lore, equipped);
    }

    private String equippedId(Island island, BlockSkin.Type type) {
        if (island == null) {
            return "none";
        }
        return switch (type) {
            case PEDESTAL -> island.getPedestalSkin();
            case HALO -> island.getHalo();
            case SOUND -> island.getBreakSound();
        };
    }

    // ------------------------------------------------------------------ stats

    /** Top 3 on a real podium, positions 4 to 10 lined up underneath. */
    public void openStats(Player player) {
        GUIHolder holder = new GUIHolder(GUIHolder.Menu.STATS);
        Inventory inventory = create(holder, "gui.stats.title", player, Material.ORANGE_STAINED_GLASS_PANE);

        List<Database.LeaderboardEntry> top = plugin.getLeaderboardManager().getTop();
        podium(inventory, top, 1, 13, 22, Material.GOLD_BLOCK, "<gold>");
        podium(inventory, top, 2, 20, 29, Material.IRON_BLOCK, "<gray>");
        podium(inventory, top, 3, 24, 33, Material.COPPER_BLOCK, "<color:#cd7f32>");

        int[] rest = {37, 38, 39, 40, 41, 42, 43};
        for (int i = 3; i < top.size() && i - 3 < rest.length; i++) {
            Database.LeaderboardEntry entry = top.get(i);
            inventory.setItem(rest[i - 3], Items.head(Bukkit.getOfflinePlayer(entry.uuid()),
                    "<white>#" + (i + 1) + " " + entry.name(),
                    List.of("<gray>Bloques</gray> <aqua>" + entry.blocks())));
        }
        if (top.isEmpty()) {
            inventory.setItem(22, Items.build(Material.PAPER, "<gray>El ranking esta vacio</gray>",
                    List.of("<dark_gray>Se recalcula cada minuto.</dark_gray>")));
        }
        player.openInventory(inventory);
        sound(player, "ui.toast.challenge_complete", 1.6F);
    }

    private void podium(Inventory inventory, List<Database.LeaderboardEntry> top, int position,
                        int headSlot, int baseSlot, Material base, String color) {
        inventory.setItem(baseSlot, Items.build(base, color + "<bold>" + position + "º</bold>", List.of()));
        if (top.size() < position) {
            inventory.setItem(headSlot, Items.build(Material.SKELETON_SKULL,
                    "<dark_gray>Puesto libre</dark_gray>", List.of("<gray>Podria ser tuyo.</gray>")));
            return;
        }
        Database.LeaderboardEntry entry = top.get(position - 1);
        ItemStack head = Items.head(Bukkit.getOfflinePlayer(entry.uuid()),
                color + "<bold>#" + position + " " + entry.name() + "</bold>",
                List.of(SEPARATOR,
                        "<gray>Bloques picados</gray> <aqua>" + entry.blocks(),
                        SEPARATOR));
        inventory.setItem(headSlot, position == 1 ? Items.glow(head) : head);
    }

    // ------------------------------------------------------------------ settings

    public void openSettings(Player player) {
        GUIHolder holder = new GUIHolder(GUIHolder.Menu.SETTINGS);
        Inventory inventory = create(holder, "gui.settings.title", player, Material.GREEN_STAINED_GLASS_PANE);
        Island island = plugin.getIslandManager().getIslandOf(player.getUniqueId());
        if (island == null) {
            inventory.setItem(22, Items.build(Material.BARRIER, "<red><bold>Sin isla</bold></red>",
                    List.of("<gray>Usa <white>/ob create</white> para empezar.</gray>")));
            player.openInventory(inventory);
            return;
        }

        boolean visible = island.isHologramVisible();
        inventory.setItem(20, Items.build(visible ? Material.GLOWSTONE : Material.GLASS,
                "<aqua><bold>Holograma del bloque</bold></aqua>",
                List.of(SEPARATOR,
                        visible ? "<green>✔ Visible</green>" : "<red>✖ Oculto</red>",
                        "<gray>Muestra fase, progreso y bloques.</gray>",
                        "<yellow>➤ Click para cambiar</yellow>",
                        SEPARATOR), visible));
        holder.bind(20, (clicker, click) -> {
            island.setHologramVisible(!island.isHologramVisible());
            plugin.getHologramManager().refresh(island);
            plugin.getStorage().saveIsland(island);
            sound(clicker, "ui.button.click", 1.4F);
            openSettings(clicker);
        });

        inventory.setItem(22, Items.build(Material.PLAYER_HEAD, "<yellow><bold>Miembros</bold></yellow>",
                List.of(SEPARATOR,
                        "<gray>Actuales</gray> <white>" + island.getMembers().size(),
                        "<gray>Invitar</gray> <white>/ob invite &lt;jugador&gt;",
                        "<gray>Expulsar</gray> <white>/ob kick &lt;jugador&gt;",
                        SEPARATOR)));

        inventory.setItem(24, Items.build(Material.WRITABLE_BOOK, "<gold><bold>Transferir isla</bold></gold>",
                List.of(SEPARATOR,
                        "<gray>Comando</gray> <white>/ob transfer &lt;jugador&gt;",
                        "<red>Pierdes la propiedad de la isla.</red>",
                        SEPARATOR)));

        inventory.setItem(30, Items.build(Material.ENDER_PEARL,
                "<light_purple><bold>Ir a mi isla</bold></light_purple>",
                List.of("<gray>Teletransporte inmediato.</gray>", "<yellow>➤ Click</yellow>")));
        holder.bind(30, (clicker, click) -> {
            clicker.closeInventory();
            plugin.getIslandManager().teleport(clicker, island);
        });

        inventory.setItem(32, Items.build(Material.NETHER_STAR, "<white><bold>Resumen</bold></white>",
                List.of(SEPARATOR,
                        "<gray>Pedestal</gray> <white>" + island.getPedestalSkin(),
                        "<gray>Aura</gray> <white>" + island.getHalo(),
                        "<gray>Sonido</gray> <white>" + island.getBreakSound(),
                        SEPARATOR)));

        player.openInventory(inventory);
        sound(player, "block.note_block.harp", 1.2F);
    }
}
