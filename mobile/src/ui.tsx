import React from "react";
import {
  Pressable,
  StyleSheet,
  Text as NativeText,
  TextInput,
  View,
  type TextProps,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "./state";
import { translate } from "./translations";
export const C = {
  bg: "#F6F4FC",
  ink: "#302549",
  muted: "#6E647E",
  purple: "#6341C8",
  pale: "#EAE2FB",
  line: "#E7E0EF",
  orange: "#CB4B24",
  green: "#287451",
};
export const icons = {
  ticket: require("../assets/figma/e00ac.svg"),
  results: require("../assets/figma/81f74.svg"),
  history: require("../assets/figma/history.svg"),
  scan: require("../assets/figma/77414.svg"),
  vault: require("../assets/figma/e538c.svg"),
  spark: require("../assets/figma/89cd1.svg"),
  grid: require("../assets/figma/04628.svg"),
  arrow: require("../assets/figma/4bf5f.svg"),
  calendar: require("../assets/figma/ac3cd.svg"),
  bell: require("../assets/figma/804bd.svg"),
  chart: require("../assets/figma/544b1.svg"),
  shop: require("../assets/figma/60339.svg"),
  shield: require("../assets/figma/5ae2d.svg"),
  home: require("../assets/figma/eb9d4.svg"),
  homeOff: require("../assets/figma/d5983.svg"),
  ticketOff: require("../assets/figma/728aa.svg"),
  ticketOn: require("../assets/figma/ef1c1.svg"),
  picksOff: require("../assets/figma/19913.svg"),
  picksOn: require("../assets/figma/cec54.svg"),
  moreOff: require("../assets/figma/5a551.svg"),
  moreOn: require("../assets/figma/98916.svg"),
  plus: require("../assets/figma/bda68.svg"),
  refresh: require("../assets/figma/37001.svg"),
  filter: require("../assets/figma/e4527.svg"),
  heart: require("../assets/figma/82150.svg"),
  down: require("../assets/figma/234b8.svg"),
  keyboard: require("../assets/figma/8d521.svg"),
  info: require("../assets/figma/ae16a.svg"),
  file: require("../assets/figma/fcee8.svg"),
  globe: require("../assets/figma/ec67c.svg"),
  type: require("../assets/figma/6be5e.svg"),
  help: require("../assets/figma/0179b.svg"),
};
export type IconName = keyof typeof icons;
export function Icon({
  name,
  size = 22,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Image
      source={icons[name]}
      tintColor={color}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  );
}
export function T({
  style,
  weight = "regular",
  ...props
}: TextProps & { weight?: "regular" | "medium" | "semi" | "bold" | "extra" }) {
  const { preferences } = useApp();
  const family =
    preferences.language === "ml"
      ? "Malayalam"
      : (
          {
            regular: "Inter",
            medium: "InterMedium",
            semi: "InterSemi",
            bold: "InterBold",
            extra: "InterExtra",
          } as const
        )[weight];
  const flat = StyleSheet.flatten([s.text, style]);
  const children = React.Children.map(props.children, (child) =>
    typeof child === "string" ? translate(child, preferences.language) : child,
  );
  return (
    <NativeText
      {...props}
      children={children}
      style={[
        s.text,
        { fontFamily: family },
        style,
        preferences.large && {
          fontSize: (flat?.fontSize ?? 14) * 1.18,
          lineHeight: (flat?.lineHeight ?? 21) * 1.18,
        },
      ]}
    />
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Button({
  label,
  onPress,
  secondary = false,
  icon,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: IconName;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        { opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        s.buttonWrap,
      ]}
    >
      <LinearGradient
        colors={secondary ? ["#FFFFFF", "#EEE7FA"] : ["#EC8253", "#CB4B24"]}
        style={s.button}
      >
        {icon && <Icon name={icon} color={secondary ? C.purple : undefined} />}
        <T
          weight="bold"
          style={{ color: secondary ? C.purple : "white", fontSize: 16 }}
        >
          {label}
        </T>
      </LinearGradient>
    </Pressable>
  );
}
export function Field({
  label,
  ...props
}: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 8, flex: 1 }}>
      {label && <T weight="semi">{label}</T>}
      <TextInput
        {...props}
        accessibilityLabel={label ?? props.placeholder}
        placeholderTextColor="#978AA8"
        style={[s.input, props.style]}
      />
    </View>
  );
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <View style={s.tabs}>
      {items.map((item) => (
        <Pressable
          key={item}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === item }}
          onPress={() => onChange(item)}
          style={[s.tab, value === item && { backgroundColor: C.purple }]}
        >
          <T
            weight="semi"
            style={{ fontSize: 13, color: value === item ? "white" : C.muted }}
          >
            {item}
          </T>
        </Pressable>
      ))}
    </View>
  );
}
export function Heading({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.between}>
      <T weight="bold" style={s.h2}>
        {title}
      </T>
      {action && (
        <Pressable accessibilityRole="button" onPress={onPress}>
          <T weight="semi" style={{ color: C.purple }}>
            {action}
          </T>
        </Pressable>
      )}
    </View>
  );
}
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <View style={[s.row, { alignItems: "flex-start", paddingVertical: 8 }]}>
      <Icon name="shield" size={18} />
      <T style={{ flex: 1, fontSize: 12, color: C.muted, lineHeight: 19 }}>
        {children}
      </T>
    </View>
  );
}
export function Banner({
  kind = "home",
  title,
  eyebrow,
  body,
  action,
  onPress,
}: {
  kind?: "home" | "vault" | "picks";
  title: string;
  eyebrow?: string;
  body?: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={[s.banner, { minHeight: action ? 220 : 172 }]}>
      <Image
        source={
          kind === "vault"
            ? require("../assets/figma/44509.jpg")
            : kind === "picks"
              ? require("../assets/figma/c1c08.jpg")
              : require("../assets/figma/f0651.jpg")
        }
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top"
      />
      <View style={{ width: "51%", gap: 7 }}>
        {eyebrow && (
          <T weight="semi" style={{ fontSize: 10, letterSpacing: 1 }}>
            {eyebrow}
          </T>
        )}
        <T weight="extra" style={{ fontSize: 26, lineHeight: 30 }}>
          {title}
        </T>
        {body && (
          <T style={{ color: C.muted, fontSize: 14, lineHeight: 20 }}>{body}</T>
        )}
      </View>
      {action && (
        <View style={{ marginTop: 12 }}>
          <Button label={action} onPress={onPress!} icon="scan" />
        </View>
      )}
    </View>
  );
}
export const s = StyleSheet.create({
  text: { color: C.ink, fontSize: 14, lineHeight: 21 },
  card: {
    backgroundColor: "white",
    borderRadius: 22,
    padding: 18,
    gap: 14,
    boxShadow: "0px 4px 14px rgba(99,67,132,0.08)",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  h2: { fontSize: 20, lineHeight: 28 },
  title: { fontSize: 26, lineHeight: 35 },
  muted: { color: C.muted, fontSize: 13 },
  input: {
    backgroundColor: "#F7F4FC",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 15,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "InterSemi",
    fontSize: 17,
    color: C.ink,
  },
  buttonWrap: {
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0px 3px 8px rgba(99,67,132,0.10)",
  },
  button: {
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  tabs: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  tab: {
    minHeight: 38,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  banner: {
    borderRadius: 26,
    overflow: "hidden",
    padding: 20,
    gap: 6,
    backgroundColor: "#E3DBF9",
    boxShadow: "0px 8px 20px rgba(73,48,120,0.10)",
  },
  badge: {
    backgroundColor: "#FCE4D9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontSize: 10, color: "#A23D1B" },
  inset: { backgroundColor: "#F2EDFA", borderRadius: 14, padding: 12, gap: 3 },
  line: { height: 1, backgroundColor: C.line },
  digits: {
    fontSize: 24,
    lineHeight: 33,
    color: C.purple,
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  empty: { padding: 22, alignItems: "center", gap: 10 },
  link: { color: C.purple, fontFamily: "InterSemi" },
  stack: { gap: 16 },
  metric: {
    flex: 1,
    padding: 12,
    borderRadius: 17,
    backgroundColor: "#F2EDFA",
  },
  label: { fontSize: 10, color: C.muted, letterSpacing: 1 },
  nav: {
    flexDirection: "row",
    marginHorizontal: 16,
    padding: 6,
    backgroundColor: "white",
    borderRadius: 26,
    boxShadow: "0px 8px 24px rgba(99,67,132,0.12)",
  },
  navItem: {
    flex: 1,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
});
