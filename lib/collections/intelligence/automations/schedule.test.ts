import { describe, expect, test } from "bun:test";
import {
    computeNextRunAtUtc,
    validateAutomationSchedule,
    type AutomationScheduleInput,
} from "./schedule";

describe("automation schedule calculation", () => {
    test("stores daily local wall-clock schedules as UTC", () => {
        expect(
            computeNextRunAtUtc({
                afterUtc: new Date("2026-05-14T10:00:00.000Z"),
                schedule: schedule({
                    cadence: "daily",
                    timeOfDayMinutes: 9 * 60 + 30,
                    timezone: "Europe/Madrid",
                }),
            }).toISOString()
        ).toBe("2026-05-15T07:30:00.000Z");
    });

    test("anchors weekly schedules to the requested local weekday", () => {
        expect(
            computeNextRunAtUtc({
                afterUtc: new Date("2026-05-14T10:00:00.000Z"),
                schedule: schedule({
                    cadence: "weekly",
                    timeOfDayMinutes: 9 * 60,
                    timezone: "America/New_York",
                    weekDay: 1,
                }),
            }).toISOString()
        ).toBe("2026-05-18T13:00:00.000Z");
    });

    test("falls monthly schedules back to the last valid day", () => {
        expect(
            computeNextRunAtUtc({
                afterUtc: new Date("2025-01-31T12:00:00.000Z"),
                schedule: schedule({
                    cadence: "monthly",
                    monthDay: 31,
                    timeOfDayMinutes: 9 * 60,
                    timezone: "UTC",
                }),
            }).toISOString()
        ).toBe("2025-02-28T09:00:00.000Z");
    });

    test("keeps local time stable across daylight saving transitions", () => {
        expect(
            computeNextRunAtUtc({
                afterUtc: new Date("2026-03-07T15:00:00.000Z"),
                schedule: schedule({
                    cadence: "daily",
                    timeOfDayMinutes: 9 * 60,
                    timezone: "America/New_York",
                }),
            }).toISOString()
        ).toBe("2026-03-08T13:00:00.000Z");
    });

    test("rejects invalid timezone identifiers", () => {
        expect(
            validateAutomationSchedule(
                schedule({
                    cadence: "daily",
                    timezone: "Not/AZone",
                })
            )
        ).toBe(false);
    });
});

function schedule(
    overrides: Partial<AutomationScheduleInput>
): AutomationScheduleInput {
    return {
        cadence: "daily",
        timeOfDayMinutes: 9 * 60,
        timezone: "UTC",
        ...overrides,
    };
}
