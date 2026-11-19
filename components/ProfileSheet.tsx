import React, { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { GeneralButton } from "@/components/GeneralButton";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useMadMinute } from "@/contexts/MadMinuteContext/MadMinuteContext";
import {
    avatarInfo, AvatarId, AVATARS, MAX_PROFILES, Profile, profileLabel, randomTitle, Title,
} from "@/storage/profiles";

// The sheet shows the list of players, or the form for adding or editing one. A new player's word is picked when the
// form opens, so it is not random on every render.
type Panel = { kind: "list" } | { kind: "add"; title: Title } | { kind: "edit"; id: string };

interface ProfileSheetProps {
    visible: boolean;
    onClose: () => void;
}

// Who is playing: switch between the people who share this device, add someone, change a player's animal or word, or
// delete a player.
export function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
    const { profiles, activeProfile, addProfile, switchProfile, changeProfile, removeProfile } = useMadMinute();
    const surface = useThemeColor({}, "surface");
    const border = useThemeColor({}, "border");
    const muted = useThemeColor({}, "muted");
    const tint = useThemeColor({}, "tint");
    const background = useThemeColor({}, "background");
    const [view, setView] = useState<Panel>({ kind: "list" });

    // Closing always goes back to the list, so the sheet opens on it next time.
    const close = () => {
        setView({ kind: "list" });
        onClose();
    };

    const toList = () => setView({ kind: "list" });
    const editing = view.kind === "edit" ? profiles.find(p => p.id === view.id) : undefined;
    const taken = (except?: Profile) => new Set(profiles.filter(p => p !== except).map(p => p.avatar));

    const choose = (profile: Profile) => {
        switchProfile(profile.id);
        close();
    };

    const confirmDelete = (profile: Profile) => {
        const name = profileLabel(profile);
        Alert.alert(
            `Delete ${name}?`,
            `${name}'s settings, history and progress will be deleted from this device. This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        removeProfile(profile.id);
                        toList();
                    },
                },
            ]
        );
    };

    let body: React.ReactNode;
    let title = "Who is playing?";

    if (view.kind === "add") {
        title = "Add a player";
        const used = taken();
        body = (
            <PlayerForm
                key="add"
                initialAvatar={AVATARS.find(a => !used.has(a.id))!.id}
                initialTitle={view.title}
                taken={used}
                submitLabel={(name) => `Add ${name}`}
                onSubmit={(avatar, word) => {
                    addProfile(avatar, word);
                    close();
                }}
                onBack={toList}
            />
        );
    } else if (view.kind === "edit" && editing) {
        title = profileLabel(editing);
        body = (
            <PlayerForm
                key={editing.id}
                initialAvatar={editing.avatar}
                initialTitle={editing.title}
                taken={taken(editing)}
                submitLabel={() => "Save"}
                onSubmit={(avatar, word) => {
                    changeProfile(editing.id, avatar, word);
                    toList();
                }}
                onBack={toList}
                onDelete={profiles.length > 1 ? () => confirmDelete(editing) : undefined}
                deleteLabel={`Delete ${profileLabel(editing)}`}
            />
        );
    } else {
        body = (
            <>
                <ThemedText style={{ color: muted }}>Each player keeps their own settings, history and progress.</ThemedText>
                {profiles.map((profile) => {
                    const active = profile.id === activeProfile.id;
                    const name = profileLabel(profile);
                    return (
                        <View key={profile.id} style={[styles.row, { backgroundColor: surface, borderColor: active ? tint : border }]}>
                            <TouchableOpacity
                                style={styles.rowMain}
                                onPress={() => choose(profile)}
                                accessibilityRole="button"
                                accessibilityLabel={active ? `${name}, playing now` : `Play as ${name}`}
                                accessibilityState={{ selected: active }}
                            >
                                <Text style={styles.rowEmoji}>{avatarInfo(profile.avatar).emoji}</Text>
                                <View style={styles.rowName}>
                                    <ThemedText type="defaultSemiBold">{name}</ThemedText>
                                    {active && <ThemedText style={{ color: tint }}>Playing now</ThemedText>}
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => setView({ kind: "edit", id: profile.id })}
                                accessibilityRole="button"
                                accessibilityLabel={`Edit ${name}`}
                            >
                                <ThemedText style={{ color: tint }}>Edit</ThemedText>
                            </TouchableOpacity>
                        </View>
                    );
                })}
                {profiles.length < MAX_PROFILES && (
                    <GeneralButton title="Add a player" fontSize={16} onPress={() => setView({ kind: "add", title: randomTitle() })} />
                )}
                <GeneralButton title="Close" variant="secondary" fontSize={16} onPress={close} />
            </>
        );
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
            <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" accessibilityLabel="Close" />
            <View style={[styles.sheet, { backgroundColor: background }]}>
                <ScrollView contentContainerStyle={styles.content}>
                    <ThemedText type="subtitle" accessibilityRole="header">{title}</ThemedText>
                    {body}
                </ScrollView>
            </View>
        </Modal>
    );
}

interface PlayerFormProps {
    initialAvatar: AvatarId;
    initialTitle: Title;
    // Animals another player already has.
    taken: Set<AvatarId>;
    submitLabel: (name: string) => string;
    onSubmit: (avatar: AvatarId, title: Title) => void;
    onBack: () => void;
    onDelete?: () => void;
    deleteLabel?: string;
}

// Pick an animal and shuffle the word; the name they make is shown above the buttons.
function PlayerForm({ initialAvatar, initialTitle, taken, submitLabel, onSubmit, onBack, onDelete, deleteLabel }: PlayerFormProps) {
    const surface = useThemeColor({}, "surface");
    const border = useThemeColor({}, "border");
    const muted = useThemeColor({}, "muted");
    const tint = useThemeColor({}, "tint");
    const [avatar, setAvatar] = useState(initialAvatar);
    const [word, setWord] = useState(initialTitle);
    const name = profileLabel({ avatar, title: word });

    return (
        <>
            <ThemedText style={{ color: muted }}>Pick an animal, then shuffle the word until you like the name.</ThemedText>
            <View style={styles.grid}>
                {AVATARS.map(({ id, label, emoji }) => {
                    const used = taken.has(id);
                    const selected = id === avatar;
                    return (
                        <TouchableOpacity
                            key={id}
                            style={[
                                styles.avatarButton,
                                { backgroundColor: surface, borderColor: selected ? tint : border },
                                selected && styles.avatarSelected,
                                used && styles.taken,
                            ]}
                            onPress={() => setAvatar(id)}
                            disabled={used}
                            accessibilityRole="button"
                            accessibilityLabel={label}
                            accessibilityHint={used ? "Already used by another player" : undefined}
                            accessibilityState={{ disabled: used, selected }}
                        >
                            <Text style={styles.avatarEmoji}>{emoji}</Text>
                            <ThemedText style={styles.avatarLabel}>{label}</ThemedText>
                        </TouchableOpacity>
                    );
                })}
            </View>
            <View style={[styles.preview, { backgroundColor: surface, borderColor: border }]}>
                <Text style={styles.rowEmoji}>{avatarInfo(avatar).emoji}</Text>
                <ThemedText type="defaultSemiBold" accessibilityLiveRegion="polite" style={styles.rowName}>{name}</ThemedText>
            </View>
            <GeneralButton title="Shuffle word" variant="secondary" fontSize={16} onPress={() => setWord(randomTitle(word))} />
            <GeneralButton title={submitLabel(name)} fontSize={16} onPress={() => onSubmit(avatar, word)} />
            {onDelete && <GeneralButton title={deleteLabel ?? "Delete"} variant="secondary" fontSize={16} onPress={onDelete} />}
            <GeneralButton title="Back" variant="secondary" fontSize={16} onPress={onBack} />
        </>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    sheet: {
        maxHeight: "85%",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    content: { padding: 20, gap: 12 },
    row: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderRadius: 14,
    },
    rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, minHeight: 56 },
    rowEmoji: { fontSize: 28 },
    rowName: { flex: 1, flexShrink: 1 },
    editButton: { paddingHorizontal: 16, minHeight: 56, justifyContent: "center" },
    preview: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderWidth: 1,
        borderRadius: 14,
        minHeight: 56,
    },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    avatarButton: {
        width: "22%",
        flexGrow: 1,
        minWidth: 72,
        alignItems: "center",
        paddingVertical: 12,
        borderWidth: 1.5,
        borderRadius: 14,
    },
    avatarSelected: { borderWidth: 3 },
    taken: { opacity: 0.35 },
    avatarEmoji: { fontSize: 32 },
    avatarLabel: { fontSize: 14, lineHeight: 18 },
});
