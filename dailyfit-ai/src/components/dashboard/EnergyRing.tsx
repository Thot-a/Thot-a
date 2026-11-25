import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { AppText, Card } from "@/components/ui";
import { colors, radius, spacing } from "@/constants/theme";

interface Macro {
  label: string;
  eaten: number;
  planned: number;
  color: string;
}

/**
 * Logged energy vs today's plan. Deliberately neutral wording/colours:
 * going past the plan is shown as a full ring, never in red or as "over".
 */
export function EnergyRing({
  eatenKcal,
  plannedKcal,
  macros,
  footer,
}: {
  eatenKcal: number;
  plannedKcal: number | null;
  macros: Macro[];
  footer?: string;
}) {
  const size = 128;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = plannedKcal ? Math.min(1, eatenKcal / plannedKcal) : 0;
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View
          style={{ width: size, height: size }}
          accessibilityLabel={`บันทึกแล้วประมาณ ${Math.round(eatenKcal)} กิโลแคลอรี่`}
        >
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="rgba(255,255,255,0.16)"
              strokeWidth={stroke}
              fill="none"
            />
            {pct > 0 ? (
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={colors.accent}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${c * pct} ${c}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            ) : null}
          </Svg>
          <View style={styles.center}>
            <AppText variant="title" color={colors.white}>
              {Math.round(eatenKcal).toLocaleString("th-TH")}
            </AppText>
            <AppText variant="caption" color={colors.sageLight}>
              {plannedKcal
                ? `จาก ~${Math.round(plannedKcal).toLocaleString("th-TH")} kcal`
                : "kcal บันทึกแล้ว"}
            </AppText>
          </View>
        </View>
        <View style={styles.macros}>
          {macros.map((m) => (
            <View key={m.label} style={styles.macro}>
              <View style={styles.macroHead}>
                <AppText variant="caption" color={colors.sageLight}>
                  {m.label}
                </AppText>
                <AppText variant="caption" color={colors.white}>
                  {Math.round(m.eaten)}
                  {m.planned ? `/${Math.round(m.planned)}` : ""} g
                </AppText>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      backgroundColor: m.color,
                      width: `${m.planned ? Math.min(100, (m.eaten / m.planned) * 100) : 0}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
      {footer ? (
        <AppText variant="caption" color={colors.sageLight}>
          {footer}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.forest,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  macros: { flex: 1, gap: spacing.sm },
  macro: { gap: 4 },
  macroHead: { flexDirection: "row", justifyContent: "space-between" },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radius.pill },
});
