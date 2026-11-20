import React, { useState } from 'react';
import {
  Modal as RNModal,
  Pressable,
  ScrollView,
  View,
  Image,
  type ViewProps,
  type ImageProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { spacingPx } from '@saplings/ui-core';
import { useAppTheme } from '../core/theme.js';
import { Box, Typography, Stack, Card } from './primitives.js';
import { Button } from './feedback.js';
export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  dismissOnBackdrop?: boolean;
}
export function Modal({ visible, onClose, title, children, dismissOnBackdrop = true }: ModalProps) {
  const { theme } = useAppTheme();
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Modal backdrop"
        onPress={() => dismissOnBackdrop && onClose()}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 24,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
          style={{
            backgroundColor: theme.colors.background.paper,
            borderRadius: theme.shape.borderRadius,
            width: '100%',
            maxWidth: 600,
            maxHeight: '90%',
            padding: 20,
          }}
        >
          <Stack direction="row" justify="space-between" align="center">
            <Typography variant="h6">{title ?? 'Dialog'}</Typography>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              onPress={onClose}
              style={{ padding: 10 }}
            >
              <Typography>✕</Typography>
            </Pressable>
          </Stack>
          <ScrollView style={{ marginTop: 12 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
export interface DrawerProps extends ModalProps {
  side?: 'bottom' | 'left' | 'right';
}
export function Drawer({ side = 'bottom', visible, onClose, title, children }: DrawerProps) {
  const { theme } = useAppTheme();
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityLabel="Close drawer"
        style={{
          flex: 1,
          justifyContent: side === 'bottom' ? 'flex-end' : 'center',
          alignItems: side === 'left' ? 'flex-start' : side === 'right' ? 'flex-end' : 'stretch',
          backgroundColor: 'rgba(0,0,0,0.45)',
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
          style={{
            backgroundColor: theme.colors.background.paper,
            padding: 20,
            ...(side === 'bottom'
              ? { maxHeight: '80%', borderTopLeftRadius: 16, borderTopRightRadius: 16 }
              : { height: '100%', width: '85%', maxWidth: 400 }),
          }}
        >
          <Stack direction="row" align="center" justify="space-between">
            <Typography variant="h6">{title ?? 'Menu'}</Typography>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close drawer"
              onPress={onClose}
              style={{ padding: 8 }}
            >
              <Typography>✕</Typography>
            </Pressable>
          </Stack>
          <ScrollView>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
export interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}
export function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
  const { theme } = useAppTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={{ borderBottomWidth: 1, borderColor: theme.colors.neutral[200] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{ paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between' }}
      >
        <Typography variant="subtitle1">{title}</Typography>
        <Typography>{open ? '−' : '+'}</Typography>
      </Pressable>
      {open ? <Box padding={2}>{children}</Box> : null}
    </View>
  );
}
export interface TabItem<T extends string> {
  label: string;
  value: T;
  disabled?: boolean;
}
export interface TabsProps<T extends string> {
  tabs: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
}
export function Tabs<T extends string>({ tabs, value, onChange }: TabsProps<T>) {
  const { theme } = useAppTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: theme.colors.neutral[300] }}
    >
      {tabs.map((item) => (
        <Pressable
          key={item.value}
          accessibilityRole="tab"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: value === item.value, disabled: item.disabled }}
          disabled={item.disabled}
          onPress={() => onChange(item.value)}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: value === item.value ? 2 : 0,
            borderBottomColor: theme.colors.primary[500],
          }}
        >
          <Typography variant="subtitle2">{item.label}</Typography>
        </Pressable>
      ))}
    </View>
  );
}
export interface AvatarProps extends Omit<ImageProps, 'source'> {
  source?: ImageProps['source'];
  initials?: string;
  size?: number;
}
export function Avatar({ source, initials = '?', size = 40, style, ...rest }: AvatarProps) {
  const { theme } = useAppTheme();
  const view: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.colors.primary[100],
  };
  return (
    <View style={view}>
      {source ? (
        <Image {...rest} source={source} style={[{ width: size, height: size }, style]} />
      ) : (
        <Typography style={{ color: theme.colors.primary[700] }}>
          {initials.slice(0, 2).toUpperCase()}
        </Typography>
      )}
    </View>
  );
}
export interface ListItem<T> {
  key: string;
  title: string;
  subtitle?: string;
  value: T;
}
export interface ListProps<T> {
  items: readonly ListItem<T>[];
  onPress?: (value: T) => void;
  emptyText?: string;
}
export function List<T>({ items, onPress, emptyText = 'No items' }: ListProps<T>) {
  const { theme } = useAppTheme();
  if (!items.length) return <Typography color="muted">{emptyText}</Typography>;
  return (
    <View>
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole={onPress ? 'button' : 'text'}
          onPress={() => onPress?.(item.value)}
          disabled={!onPress}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 8,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.neutral[200],
          }}
        >
          <Typography variant="subtitle1">{item.title}</Typography>
          {item.subtitle ? (
            <Typography variant="body2" color="muted">
              {item.subtitle}
            </Typography>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
export interface NavbarProps {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}
export function Navbar({ title, left, right }: NavbarProps) {
  return (
    <Card>
      <Stack direction="row" align="center" justify="space-between">
        <View>{left}</View>
        <Typography variant="h6">{title}</Typography>
        <View>{right}</View>
      </Stack>
    </Card>
  );
}
export interface DataColumn<T> {
  key: string;
  heading: string;
  value: (row: T) => string;
}
export interface TableProps<T> {
  columns: readonly DataColumn<T>[];
  rows: readonly T[];
  keyFor: (row: T) => string;
  emptyText?: string;
}
/** Bounded small data tables; large datasets should use a virtualized FlatList in the app. */
export function Table<T>({ columns, rows, keyFor, emptyText = 'No rows' }: TableProps<T>) {
  return (
    <ScrollView horizontal accessibilityLabel="Data table">
      <View style={{ minWidth: columns.length * 120 }}>
        <Stack direction="row" gap={2} padding={1}>
          {columns.map((c) => (
            <View key={c.key} style={{ flex: 1, minWidth: 100 }}>
              <Typography variant="subtitle2">{c.heading}</Typography>
            </View>
          ))}
        </Stack>
        {rows.length ? (
          rows.map((row) => (
            <Stack key={keyFor(row)} direction="row" gap={2} padding={1}>
              {columns.map((c) => (
                <View key={c.key} style={{ flex: 1, minWidth: 100 }}>
                  <Typography variant="body2">{c.value(row)}</Typography>
                </View>
              ))}
            </Stack>
          ))
        ) : (
          <Typography color="muted">{emptyText}</Typography>
        )}
      </View>
    </ScrollView>
  );
}
