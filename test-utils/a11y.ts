import { Pressable, Switch, Text, TouchableOpacity } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';

// Test guard: every control on a screen must have a name a screen reader can say, and a role.
// Use expectControlsNamed(tree.root) in a screen's test; it fails with the list of offenders.

const CONTROLS = [TouchableOpacity, Pressable, Switch];

const textOf = (node: ReactTestInstance | string): string =>
    typeof node === 'string' ? node : node.children.map(textOf).join('');

function nameOf(node: ReactTestInstance): string {
    const label = node.props.accessibilityLabel ?? node.props['aria-label'];
    if (typeof label === 'string' && label.trim() !== '') return label.trim();
    return node.findAllByType(Text).map(textOf).join(' ').trim();
}

/** Describes each control that has no name, or (apart from switches, which are one by nature) no role. */
export function controlProblems(root: ReactTestInstance): string[] {
    const problems: string[] = [];
    for (const type of CONTROLS) {
        for (const node of root.findAllByType(type as never)) {
            const name = nameOf(node);
            const kind = (type as { displayName?: string; name?: string }).displayName ?? (type as { name?: string }).name ?? 'control';
            if (name === '') problems.push(`${kind} has no accessible name`);
            else if (type !== Switch && !node.props.accessibilityRole && !node.props.role) {
                problems.push(`${kind} "${name}" has no accessibilityRole`);
            }
        }
    }
    return problems;
}

export function expectControlsNamed(root: ReactTestInstance): void {
    expect(controlProblems(root)).toEqual([]);
}
