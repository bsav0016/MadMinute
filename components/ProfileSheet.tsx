import React, { useState } from "react";
import {
    Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { GeneralButton } from "@/components/GeneralButton";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Colors } from "@/constants/Colors";
import { ImportResult, useMadMinute } from "@/contexts/MadMinuteContext/MadMinuteContext";
import { Backup, readBackup } from "@/contexts/MadMinuteContext/backup";
import {
    avatarInfo, AvatarId, AVATARS, MAX_PROFILES, Profile, profileLabel, randomTitle, Title, titlesTaken,
} from "@/storage/profiles";

// The sheet shows the list of players, or the form for adding or editing one. A new player's animal and word are
// picked when the form opens, so they are not random on every render.
type Panel =
    | { kind: "list" }
    | { kind: "add"; avatar: AvatarId; title: Title }
    | { kind: "edit"; id: string }
    | { kind: "restore" };

interface ProfileSheetProps {
    visible: boolean;
    onClose: () => void;
}

// Who is playing: switch between the people who share this device, add someone, change a player's animal or word, or
// delete a player.
export function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
    const {
        profiles, activeProfile, addProfile, switchProfile, changeProfile, removeProfile, exportProgress, importProgress,
    } = useMadMinute();
    const surface = useThemeColor({}, "surface");
    const border = useThemeColor({}, "border");
    const muted = useThemeColor({}, "muted");
    const tint = useThemeColor({}, "tint");
    const background = useThemeColor({}, "background");
    const { height: windowHeight } = useWindowDimensions();
    const [view, setView] = useState<Panel>({ kind: "list" });

    // Closing always goes back to the list, so the sheet opens on it next time.
    const close = () => {
        setView({ kind: "list" });
        onClose();
    };

    const toList = () => setView({ kind: "list" });
    const editing = view.kind === "edit" ? profiles.find(p => p.id === view.id) : undefined;
    const registry = { active: activeProfile.id, profiles };

    // Starts on an animal no one has yet if there is one, with a word that makes a name no one has.
    const openAddForm = () => {
        const avatar = (AVATARS.find(a => !profiles.some(p => p.avatar === a.id)) ?? AVATARS[0]).id;
        setView({ kind: "add", avatar, title: randomTitle(titlesTaken(registry, avatar)) });
    };

    // Shares the active player's progress as text. Closing the share sheet without sending is not an error.
    const backUp = async () => {
        try {
            await Share.share({ message: exportProgress() });
        } catch {
            Alert.alert("Could not share", "Mad Minute could not open the share sheet. Try again.");
        }
    };

    const restore = async (backup: Backup): Promise<ImportResult> => {
        const result = await importProgress(backup);
        if (result.ok) close();
        return result;
    };

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
        body = (
            <PlayerForm
                key="add"
                initialAvatar={view.avatar}
                initialTitle={view.title}
                titlesTaken={(avatar) => titlesTaken(registry, avatar)}
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
                titlesTaken={(avatar) => titlesTaken(registry, avatar, editing.id)}
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
    } else if (view.kind === "restore") {
        title = "Restore progress";
        body = <RestoreForm key="restore" onRestore={restore} onBack={toList} />;
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
                    <GeneralButton title="Add a player" fontSize={16} onPress={() => openAddForm()} />
                )}
                <ThemedText style={{ color: muted }}>
                    Back up {profileLabel(activeProfile)}'s progress to keep it safe or move it to another phone.
                </ThemedText>
                <GeneralButton title="Back up progress" variant="secondary" fontSize={16} onPress={backUp} />
                <GeneralButton title="Restore progress" variant="secondary" fontSize={16} onPress={() => setView({ kind: "restore" })} />
                <GeneralButton title="Close" variant="secondary" fontSize={16} onPress={close} />
            </>
        );
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
            <Pressable style={styles.backdrop} onPress={close} accessibilityRole="button" accessibilityLabel="Close" />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <View style={[styles.sheet, { backgroundColor: background, maxHeight: windowHeight * 0.85 }]}>
                    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                        <ThemedText type="subtitle" accessibilityRole="header">{title}</ThemedText>
                        {body}
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

interface RestoreFormProps {
    onRestore: (backup: Backup) => Promise<ImportResult>;
    onBack: () => void;
}

// Paste a backup and add it as a new player. Nothing existing is replaced.
function RestoreForm({ onRestore, onBack }: RestoreFormProps) {
    const surface = useThemeColor({}, "surface");
    const border = useThemeColor({}, "border");
    const muted = useThemeColor({}, "muted");
    const text = useThemeColor({}, "text");
    const [pasted, setPasted] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        const read = readBackup(pasted);
        if (!read.ok) {
            setError(read.reason);
            return;
        }
        setBusy(true);
        const result = await onRestore(read.backup);
        setBusy(false);
        if (!result.ok) setError(result.reason);
    };

    return (
        <>
            <ThemedText style={{ color: muted }}>
                Paste a Mad Minute backup below. It is added as a new player, so no one's progress is replaced.
            </ThemedText>
            <TextInput
                style={[styles.pasteBox, { backgroundColor: surface, borderColor: border, color: text }]}
                value={pasted}
                onChangeText={(value) => { setPasted(value); setError(null); }}
                multiline
                numberOfLines={5}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                placeholder="Paste the backup here"
                placeholderTextColor={muted}
                accessibilityLabel="Backup text"
            />
            {error && <ThemedText accessibilityRole="alert" style={styles.error}>{error}</ThemedText>}
            <GeneralButton title="Restore" fontSize={16} onPress={submit} disabled={pasted.trim() === "" || busy} />
            <GeneralButton title="Back" variant="secondary" fontSize={16} onPress={onBack} />
        </>
    );
}

interface PlayerFormProps {
    initialAvatar: AvatarId;
    initialTitle: Title;
    // The words other players already have with an animal; that name is not available.
    titlesTaken: (avatar: AvatarId) => Title[];
    submitLabel: (name: string) => string;
    onSubmit: (avatar: AvatarId, title: Title) => void;
    onBack: () => void;
    onDelete?: () => void;
    deleteLabel?: string;
}

// Pick an animal and shuffle the word; the name they make is shown above the buttons.
function PlayerForm({ initialAvatar, initialTitle, titlesTaken, submitLabel, onSubmit, onBack, onDelete, deleteLabel }: PlayerFormProps) {
    const surface = useThemeColor({}, "surface");
    const border = useThemeColor({}, "border");
    const muted = useThemeColor({}, "muted");
    const tint = useThemeColor({}, "tint");
    const [avatar, setAvatar] = useState(initialAvatar);
    const [word, setWord] = useState(initialTitle);
    const name = profileLabel({ avatar, title: word });

    // Choosing an animal that already has this word gives the new player a different word, so the name is always free.
    const pickAvatar = (id: AvatarId) => {
        setAvatar(id);
        const taken = titlesTaken(id);
        if (taken.includes(word)) setWord(randomTitle(taken));
    };

    return (
        <>
            <ThemedText style={{ color: muted }}>Pick an animal, then shuffle the word until you like the name. Two players can pick the same animal if their words differ.</ThemedText>
            <View style={styles.grid}>
                {AVATARS.map(({ id, label, emoji }) => {
                    const selected = id === avatar;
                    return (
                        <TouchableOpacity
                            key={id}
                            style={[
                                styles.avatarButton,
                                { backgroundColor: surface, borderColor: selected ? tint : border },
                                selected && styles.avatarSelected,
                            ]}
                            onPress={() => pickAvatar(id)}
                            accessibilityRole="button"
                            accessibilityLabel={label}
                            accessibilityState={{ selected }}
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
            <GeneralButton title="Shuffle word" variant="secondary" fontSize={16} onPress={() => setWord(randomTitle([word, ...titlesTaken(avatar)]))} />
            <GeneralButton title={submitLabel(name)} fontSize={16} onPress={() => onSubmit(avatar, word)} />
            {onDelete && <GeneralButton title={deleteLabel ?? "Delete"} variant="secondary" fontSize={16} onPress={onDelete} />}
            <GeneralButton title="Back" variant="secondary" fontSize={16} onPress={onBack} />
        </>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    sheet: {
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
    pasteBox: {
        minHeight: 120,
        maxHeight: 200,
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        fontSize: 16,
        textAlignVertical: "top",
    },
    error: { color: Colors.results.incorrectStrong },
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
    avatarEmoji: { fontSize: 32 },
    avatarLabel: { fontSize: 14, lineHeight: 18 },
});
