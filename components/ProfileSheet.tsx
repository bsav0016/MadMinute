import React, { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { GeneralButton } from "@/components/GeneralButton";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useMadMinute } from "@/contexts/MadMinuteContext/MadMinuteContext";
import { avatarInfo, AvatarId, AVATARS, freeAvatars, MAX_PROFILES, Profile, profileLabel } from "@/storage/profiles";

type Panel = { kind: "list" } | { kind: "add" } | { kind: "edit"; id: string };

interface ProfileSheetProps {
    visible: boolean;
    onClose: () => void;
}

// Who is playing: switch between the people who share this device, add someone, change an avatar or delete a profile.
export function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
    const { profiles, activeProfile, addProfile, switchProfile, changeProfileAvatar, removeProfile } = useMadMinute();
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

    const free = freeAvatars({ active: activeProfile.id, profiles });
    const editing = view.kind === "edit" ? profiles.find(p => p.id === view.id) : undefined;

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
                        setView({ kind: "list" });
                    },
                },
            ]
        );
    };

    const avatarGrid = (onPick: (avatar: AvatarId) => void, current?: AvatarId) => (
        <View style={styles.grid}>
            {AVATARS.map(({ id, label, emoji }) => {
                const taken = !free.includes(id) && id !== current;
                const selected = id === current;
                return (
                    <TouchableOpacity
                        key={id}
                        style={[
                            styles.avatarButton,
                            { backgroundColor: surface, borderColor: selected ? tint : border },
                            selected && styles.avatarSelected,
                            taken && styles.taken,
                        ]}
                        onPress={() => onPick(id)}
                        disabled={taken || selected}
                        accessibilityRole="button"
                        accessibilityLabel={label}
                        accessibilityHint={taken ? "Already used by another player" : undefined}
                        accessibilityState={{ disabled: taken, selected }}
                    >
                        <Text style={styles.avatarEmoji}>
                            {emoji}
                        </Text>
                        <ThemedText style={styles.avatarLabel}>{label}</ThemedText>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    let body: React.ReactNode;
    let title = "Who is playing?";

    if (view.kind === "add") {
        title = "Add a player";
        body = (
            <>
                <ThemedText style={{ color: muted }}>Pick an animal for the new player.</ThemedText>
                {avatarGrid((avatar) => {
                    addProfile(avatar);
                    close();
                })}
                <GeneralButton title="Back" variant="secondary" fontSize={16} onPress={() => setView({ kind: "list" })} />
            </>
        );
    } else if (view.kind === "edit" && editing) {
        title = `${profileLabel(editing)}`;
        body = (
            <>
                <ThemedText style={{ color: muted }}>Change the animal for this player.</ThemedText>
                {avatarGrid((avatar) => {
                    changeProfileAvatar(editing.id, avatar);
                    setView({ kind: "list" });
                }, editing.avatar)}
                {profiles.length > 1 && (
                    <GeneralButton title={`Delete ${profileLabel(editing)}`} variant="secondary" fontSize={16} onPress={() => confirmDelete(editing)} />
                )}
                <GeneralButton title="Back" variant="secondary" fontSize={16} onPress={() => setView({ kind: "list" })} />
            </>
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
                                <Text style={styles.rowEmoji}>
                                    {avatarInfo(profile.avatar).emoji}
                                </Text>
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
                    <GeneralButton title="Add a player" fontSize={16} onPress={() => setView({ kind: "add" })} />
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

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    sheet: {
        maxHeight: "80%",
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
