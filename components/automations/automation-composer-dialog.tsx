"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DEFAULT_TIME_OF_DAY_MINUTES,
    formatTimeOfDayMinutes,
    getTimeOfDayOption,
    getTimeOfDayOptionByLabel,
    getTimeOfDayOptions,
    parseTimeOfDayMinutes,
    roundTimeOfDayMinutes,
    type TimeOfDayOption,
} from "@/lib/common/time";
import {
    Combobox,
    ComboboxCollection,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxPopup,
    ComboboxTrigger,
    ComboboxValue,
} from "@/components/ui/combobox";
import {
    Dialog,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    createAutomation,
    resumeAutomation,
    updateAutomation,
} from "@/lib/intelligence/automations/actions";
import AppIconSmall from "@/public/cache-icon-small.png";
import { useStableCallback } from "@base-ui/utils/useStableCallback";
import { parseDate } from "chrono-node";
import { useLocale } from "gt-next";
import {
    CalendarDays,
    ChevronDown,
    ChevronRight,
    Clock,
    FolderOpen,
    Lightbulb,
    Pencil,
    Plus,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as React from "react";

const ALL_LIBRARY_COLLECTION_ID = "all_library";
const AUTOMATION_OPTION_TRIGGER_CLASS_NAME =
    "max-w-full min-w-0 justify-start gap-0 overflow-hidden";
const DEFAULT_WEEK_DAY = 1;
const DEFAULT_MONTH_DAY = 1;
const DEFAULT_WEEK_DAY_OPTION: WeekDayOption = {
    label: "Monday",
    value: DEFAULT_WEEK_DAY,
};
const DEFAULT_MONTH_DAY_OPTION: MonthDayOption = {
    label: "1st",
    value: DEFAULT_MONTH_DAY,
};
const WEEK_DAYS: WeekDayOption[] = [
    { label: "Sunday", value: 0 },
    DEFAULT_WEEK_DAY_OPTION,
    { label: "Tuesday", value: 2 },
    { label: "Wednesday", value: 3 },
    { label: "Thursday", value: 4 },
    { label: "Friday", value: 5 },
    { label: "Saturday", value: 6 },
];
const CADENCE_OPTIONS: CadenceOption[] = [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
];
const MONTH_DAY_OPTIONS: MonthDayOption[] = Array.from(
    { length: 31 },
    (_, index) => {
        const value = index + 1;
        if (value === DEFAULT_MONTH_DAY_OPTION.value) {
            return DEFAULT_MONTH_DAY_OPTION;
        }
        return {
            label: getMonthDayLabel(value),
            value,
        };
    }
);
const DEFAULT_CADENCE_OPTION: CadenceOption = {
    label: "Weekly",
    value: "weekly",
};
const ALL_LIBRARY_OPTION: AutomationCollectionOption = {
    id: ALL_LIBRARY_COLLECTION_ID,
    name: "All library",
};

type AutomationCadence = "daily" | "weekly" | "monthly";
type AutomationPayloadScope = "all_library_items" | "collection";
type AutomationStatus = "active" | "paused";

interface CadenceOption {
    label: string;
    value: AutomationCadence;
}

interface WeekDayOption {
    label: string;
    value: number;
}

interface MonthDayOption {
    label: string;
    value: number;
}

export interface AutomationCollectionOption {
    id: string;
    name: string;
}

export interface AutomationComposerAutomation {
    cadence: AutomationCadence;
    collectionId?: string;
    id: string;
    monthDay?: number;
    payloadScope: AutomationPayloadScope;
    prompt: string;
    status: AutomationStatus;
    timeOfDayMinutes: number;
    timezone: string;
    title: string;
    weekDay?: number;
}

interface AutomationFormState {
    cadence: CadenceOption;
    collection: AutomationCollectionOption;
    errorMessage: string | null;
    monthDay: number;
    prompt: string;
    timeValue: string;
    title: string;
    weekDay: number;
}

export function AutomationComposerDialog({
    automation,
    children,
    collections,
    trigger,
}: AutomationComposerDialogProps) {
    const router = useRouter();
    const locale = useLocale();
    const titleId = React.useId();
    const promptId = React.useId();
    const collectionId = React.useId();
    const cadenceId = React.useId();
    const timeId = React.useId();
    const weekDayId = React.useId();
    const monthDayId = React.useId();
    const [isOpen, setIsOpen] = React.useState(false);
    const [isPending, startTransition] = React.useTransition();
    const [formState, setFormState] = React.useState<AutomationFormState>(() =>
        getInitialFormState(automation, collections)
    );
    const isEditing = automation !== undefined;
    const shouldResumeAfterSave = automation?.status === "paused";
    const triggerLabel = getTriggerLabel(automation);
    const submitLabel = getSubmitLabel({
        isEditing,
        shouldResumeAfterSave,
    });
    const timeOptions = getTimeOfDayOptions(locale);

    const handleOpenChange = useStableCallback((nextOpen: boolean) => {
        if (nextOpen) {
            setFormState(getInitialFormState(automation, collections));
        }
        setIsOpen(nextOpen);
    });

    const updateFormState = useStableCallback(
        (nextState: Partial<AutomationFormState>) => {
            setFormState((currentState) => ({
                ...currentState,
                ...nextState,
                errorMessage: null,
            }));
        }
    );

    const handleSubmit = useStableCallback(
        (event: React.ChangeEvent<HTMLFormElement>) => {
            event.preventDefault();
            startTransition(async () => {
                const isAllLibraryPayload =
                    formState.collection.id === ALL_LIBRARY_COLLECTION_ID;

                const payloadScope: AutomationPayloadScope = isAllLibraryPayload
                    ? "all_library_items"
                    : "collection";

                const timezone =
                    automation?.timezone ??
                    Intl.DateTimeFormat().resolvedOptions().timeZone;

                const input = {
                    collectionId: isAllLibraryPayload
                        ? null
                        : formState.collection.id,
                    payloadScope,
                    prompt: formState.prompt,
                    schedule: {
                        cadence: formState.cadence.value,
                        monthDay:
                            formState.cadence.value === "monthly"
                                ? formState.monthDay
                                : null,
                        timeOfDayMinutes: parseTimeOfDayMinutes(
                            formState.timeValue
                        ),
                        timezone,
                        weekDay:
                            formState.cadence.value === "weekly"
                                ? formState.weekDay
                                : null,
                    },
                    title: formState.title,
                };

                const result = isEditing
                    ? await updateAutomation({
                          automation: input,
                          automationId: automation.id,
                      })
                    : await createAutomation(input);

                if (result.status !== "SUCCESS") {
                    setFormState((currentState) => ({
                        ...currentState,
                        errorMessage: result.message,
                    }));
                    return;
                }

                if (isEditing && shouldResumeAfterSave) {
                    const resumeResult = await resumeAutomation({
                        automationId: automation.id,
                        schedule: input.schedule,
                    });

                    if (resumeResult.status !== "SUCCESS") {
                        setFormState((currentState) => ({
                            ...currentState,
                            errorMessage: resumeResult.message,
                        }));

                        return;
                    }
                }

                setIsOpen(false);
                setFormState(getInitialFormState(undefined, collections));
                router.refresh();
            });
        }
    );

    return (
        <Dialog onOpenChange={handleOpenChange} open={isOpen}>
            <DialogTrigger render={trigger ?? <Button size="sm" />}>
                {children ?? (
                    <>
                        {isEditing ? (
                            <Pencil
                                aria-hidden
                                className="size-4"
                                focusable="false"
                            />
                        ) : (
                            <Plus
                                aria-hidden
                                className="size-4"
                                focusable="false"
                            />
                        )}
                        {triggerLabel}
                    </>
                )}
            </DialogTrigger>
            <DialogPopup>
                <form className="contents" onSubmit={handleSubmit}>
                    <DialogHeader>
                        <div className="flex items-center gap-1">
                            <Badge size="lg" variant="outline">
                                <Image
                                    alt=""
                                    height={12}
                                    src={AppIconSmall}
                                    width={12}
                                />
                                Cache
                            </Badge>
                            <ChevronRight className="inline-block size-3.5 shrink-0" />
                            <DialogTitle className="font-medium text-sm">
                                {isEditing ? "Edit" : "New"} automation
                            </DialogTitle>
                        </div>
                    </DialogHeader>
                    <DialogPanel className="space-y-2">
                        <div>
                            <label
                                className="sr-only font-medium text-sm"
                                htmlFor={titleId}
                            >
                                Title
                            </label>
                            <Input
                                autoFocus
                                className="-mx-[calc(--spacing(3)-1px)] font-semibold text-xl"
                                id={titleId}
                                isUnstyled
                                onChange={(event) =>
                                    updateFormState({
                                        title: event.currentTarget.value,
                                    })
                                }
                                placeholder="Weekly research digest"
                                required
                                size="lg"
                                type="text"
                                value={formState.title}
                            />
                        </div>
                        <div>
                            <label
                                className="sr-only font-medium text-sm"
                                htmlFor={promptId}
                            >
                                Instructions
                            </label>
                            <Textarea
                                className="-mx-[calc(--spacing(3)-1px)] *:resize-none"
                                id={promptId}
                                isUnstyled
                                onChange={(event) =>
                                    updateFormState({
                                        prompt: event.currentTarget.value,
                                    })
                                }
                                placeholder="Summarize the most useful saved items and call out patterns worth revisiting."
                                required
                                rows={6}
                                size="lg"
                                value={formState.prompt}
                            />
                        </div>
                        <div className="grid gap-2">
                            <span
                                className="sr-only font-medium text-sm"
                                id={collectionId}
                            >
                                Collection
                            </span>
                            <AutomationCollectionCombobox
                                labelId={collectionId}
                                onValueChange={(collection) =>
                                    updateFormState({ collection })
                                }
                                options={[ALL_LIBRARY_OPTION, ...collections]}
                                value={formState.collection}
                            />
                        </div>
                        <div className="grid gap-2">
                            <span
                                className="sr-only font-medium text-sm"
                                id={cadenceId}
                            >
                                Cadence
                            </span>
                            <AutomationCadenceCombobox
                                labelId={cadenceId}
                                onValueChange={(cadence) =>
                                    updateFormState({ cadence })
                                }
                                value={formState.cadence}
                            />
                        </div>
                        <div className="grid gap-2">
                            <span
                                className="sr-only font-medium text-sm"
                                id={timeId}
                            >
                                Local time
                            </span>
                            <AutomationTimeCombobox
                                labelId={timeId}
                                onValueChange={(timeValue) =>
                                    updateFormState({ timeValue })
                                }
                                options={timeOptions}
                                value={getTimeOfDayOption(
                                    timeOptions,
                                    formState.timeValue
                                )}
                            />
                        </div>
                        {formState.cadence.value === "weekly" ? (
                            <div className="grid gap-2">
                                <span
                                    className="sr-only font-medium text-sm"
                                    id={weekDayId}
                                >
                                    Weekday
                                </span>
                                <AutomationWeekDayCombobox
                                    labelId={weekDayId}
                                    onValueChange={(weekDay) =>
                                        updateFormState({ weekDay })
                                    }
                                    value={getWeekDayOption(formState.weekDay)}
                                />
                            </div>
                        ) : null}
                        {formState.cadence.value === "monthly" ? (
                            <div>
                                <span
                                    className="sr-only font-medium text-sm"
                                    id={monthDayId}
                                >
                                    Month day
                                </span>
                                <AutomationMonthDayCombobox
                                    labelId={monthDayId}
                                    onValueChange={(monthDay) =>
                                        updateFormState({ monthDay })
                                    }
                                    value={getMonthDayOption(
                                        formState.monthDay
                                    )}
                                />
                            </div>
                        ) : null}
                        {formState.errorMessage ? (
                            <p className="text-destructive text-sm leading-6">
                                {formState.errorMessage}
                            </p>
                        ) : null}
                        <Alert>
                            <Lightbulb />
                            <AlertDescription>
                                Automations help you streamline repetitive tasks
                                and processes. Set them up to save time and
                                ensure things run smoothly.
                            </AlertDescription>
                        </Alert>
                    </DialogPanel>
                    <DialogFooter>
                        <Button loading={isPending} size="sm" type="submit">
                            {submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogPopup>
        </Dialog>
    );
}

interface AutomationComposerDialogProps {
    automation?: AutomationComposerAutomation;
    children?: React.ReactNode;
    collections: AutomationCollectionOption[];
    trigger?: React.ReactElement;
}

function AutomationCollectionCombobox({
    labelId,
    onValueChange,
    options,
    value,
}: AutomationCollectionComboboxProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Combobox<AutomationCollectionOption>
            autoHighlight
            items={options}
            itemToStringLabel={(option) => option.name}
            itemToStringValue={(option) => option.id}
            onOpenChange={setIsOpen}
            onValueChange={(nextCollection) => {
                if (!nextCollection) {
                    return;
                }
                onValueChange(nextCollection);
                setIsOpen(false);
            }}
            open={isOpen}
            value={value}
        >
            <ComboboxTrigger
                render={
                    <Button
                        aria-labelledby={labelId}
                        className={AUTOMATION_OPTION_TRIGGER_CLASS_NAME}
                        size="xs"
                        variant="ghost"
                    />
                }
            >
                <FolderOpen
                    aria-hidden
                    className="size-3.5 text-muted-foreground"
                    focusable="false"
                />
                <span className="mx-0.5 min-w-0 truncate">
                    <ComboboxValue />
                </span>
                <ChevronDown
                    aria-hidden
                    className="size-3.5"
                    focusable="false"
                />
            </ComboboxTrigger>
            <ComboboxPopup>
                <ComboboxInput
                    aria-label="Search collections"
                    placeholder="Select collection..."
                />
                <ComboboxEmpty>No matching collections</ComboboxEmpty>
                <ComboboxList>
                    <ComboboxCollection>
                        {(collectionOption: AutomationCollectionOption) => (
                            <ComboboxItem
                                key={collectionOption.id}
                                showIndicatorLast
                                value={collectionOption}
                            >
                                {collectionOption.name}
                            </ComboboxItem>
                        )}
                    </ComboboxCollection>
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}

interface AutomationCollectionComboboxProps {
    labelId: string;
    onValueChange: (value: AutomationCollectionOption) => void;
    options: AutomationCollectionOption[];
    value: AutomationCollectionOption;
}

function AutomationCadenceCombobox({
    labelId,
    onValueChange,
    value,
}: AutomationCadenceComboboxProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Combobox<CadenceOption>
            autoHighlight
            items={CADENCE_OPTIONS}
            itemToStringLabel={(option) => option.label}
            itemToStringValue={(option) => option.value}
            onOpenChange={setIsOpen}
            onValueChange={(nextCadence) => {
                if (!nextCadence) {
                    return;
                }
                onValueChange(nextCadence);
                setIsOpen(false);
            }}
            open={isOpen}
            value={value}
        >
            <ComboboxTrigger
                render={
                    <Button
                        aria-labelledby={labelId}
                        className={AUTOMATION_OPTION_TRIGGER_CLASS_NAME}
                        size="xs"
                        variant="ghost"
                    />
                }
            >
                <CalendarDays
                    aria-hidden
                    className="size-3.5 text-muted-foreground"
                    focusable="false"
                />
                <span className="mx-0.5 min-w-0 truncate">
                    <ComboboxValue />
                </span>
                <ChevronDown
                    aria-hidden
                    className="size-3.5"
                    focusable="false"
                />
            </ComboboxTrigger>
            <ComboboxPopup>
                <ComboboxInput
                    aria-label="Search cadences"
                    placeholder="Select cadence..."
                />
                <ComboboxEmpty>No matching cadences</ComboboxEmpty>
                <ComboboxList>
                    <ComboboxCollection>
                        {(cadenceOption: CadenceOption) => (
                            <ComboboxItem
                                key={cadenceOption.value}
                                showIndicatorLast
                                value={cadenceOption}
                            >
                                <CalendarDays
                                    aria-hidden
                                    className="size-4 text-muted-foreground"
                                    focusable="false"
                                />
                                {cadenceOption.label}
                            </ComboboxItem>
                        )}
                    </ComboboxCollection>
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}

interface AutomationCadenceComboboxProps {
    labelId: string;
    onValueChange: (value: CadenceOption) => void;
    value: CadenceOption;
}

function AutomationTimeCombobox({
    labelId,
    onValueChange,
    options,
    value,
}: AutomationTimeComboboxProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(value.label);

    React.useEffect(() => {
        setInputValue(value.label);
    }, [value.label]);

    const handleSelectFromList = useStableCallback(
        (nextTime: TimeOfDayOption) => {
            onValueChange(nextTime.value);
            setInputValue(nextTime.label);
            setIsOpen(false);
        }
    );

    const handleFreeformEnter = useStableCallback(() => {
        const exactOption = getTimeOfDayOptionByLabel(options, inputValue);
        if (exactOption) {
            onValueChange(exactOption.value);
            setInputValue(exactOption.label);
            setIsOpen(false);
            return;
        }

        const parsedDate = parseDate(inputValue);
        if (!parsedDate) {
            setInputValue(value.label);
            return;
        }

        const roundedValue = formatTimeOfDayMinutes(
            roundTimeOfDayMinutes(
                parsedDate.getHours() * 60 + parsedDate.getMinutes()
            )
        );
        const roundedOption = getTimeOfDayOption(options, roundedValue);
        onValueChange(roundedOption.value);
        setInputValue(roundedOption.label);
        setIsOpen(false);
    });

    return (
        <Combobox<TimeOfDayOption>
            autoHighlight
            inputValue={inputValue}
            items={options}
            itemToStringLabel={(option) => option.label}
            itemToStringValue={(option) => option.value}
            onInputValueChange={(nextInputValue) => {
                setInputValue(nextInputValue);
            }}
            onOpenChange={setIsOpen}
            onValueChange={(nextTime) => {
                if (!nextTime) {
                    return;
                }
                handleSelectFromList(nextTime);
            }}
            open={isOpen}
            value={value}
        >
            <ComboboxTrigger
                render={
                    <Button
                        aria-labelledby={labelId}
                        className={AUTOMATION_OPTION_TRIGGER_CLASS_NAME}
                        size="xs"
                        variant="ghost"
                    />
                }
            >
                <Clock
                    aria-hidden
                    className="size-3.5 text-muted-foreground"
                    focusable="false"
                />
                <span className="mx-0.5 min-w-0 truncate tabular-nums">
                    <ComboboxValue />
                </span>
                <ChevronDown
                    aria-hidden
                    className="size-3.5"
                    focusable="false"
                />
            </ComboboxTrigger>
            <ComboboxPopup>
                <ComboboxInput
                    aria-label="Search times"
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            handleFreeformEnter();
                        }
                    }}
                    placeholder="Select time..."
                />
                <ComboboxEmpty>No matching times</ComboboxEmpty>
                <ComboboxList>
                    <ComboboxCollection>
                        {(timeOption: TimeOfDayOption) => (
                            <ComboboxItem
                                className="tabular-nums"
                                key={timeOption.value}
                                showIndicatorLast
                                value={timeOption}
                            >
                                {timeOption.label}
                            </ComboboxItem>
                        )}
                    </ComboboxCollection>
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}

interface AutomationTimeComboboxProps {
    labelId: string;
    onValueChange: (value: string) => void;
    options: TimeOfDayOption[];
    value: TimeOfDayOption;
}

function AutomationWeekDayCombobox({
    labelId,
    onValueChange,
    value,
}: AutomationWeekDayComboboxProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Combobox<WeekDayOption>
            autoHighlight
            items={WEEK_DAYS}
            itemToStringLabel={(option) => option.label}
            itemToStringValue={(option) => String(option.value)}
            onOpenChange={setIsOpen}
            onValueChange={(nextWeekDay) => {
                if (!nextWeekDay) {
                    return;
                }
                onValueChange(nextWeekDay.value);
                setIsOpen(false);
            }}
            open={isOpen}
            value={value}
        >
            <ComboboxTrigger
                render={
                    <Button
                        aria-labelledby={labelId}
                        className={AUTOMATION_OPTION_TRIGGER_CLASS_NAME}
                        size="xs"
                        variant="ghost"
                    />
                }
            >
                <CalendarDays
                    aria-hidden
                    className="size-3.5 text-muted-foreground"
                    focusable="false"
                />
                <span className="mx-0.5 min-w-0 truncate">
                    <ComboboxValue />
                </span>
                <ChevronDown
                    aria-hidden
                    className="size-3.5"
                    focusable="false"
                />
            </ComboboxTrigger>
            <ComboboxPopup>
                <ComboboxInput
                    aria-label="Search weekdays"
                    placeholder="Select weekday..."
                />
                <ComboboxEmpty>No matching weekdays</ComboboxEmpty>
                <ComboboxList>
                    <ComboboxCollection>
                        {(weekDayOption: WeekDayOption) => (
                            <ComboboxItem
                                key={weekDayOption.value}
                                showIndicatorLast
                                value={weekDayOption}
                            >
                                {weekDayOption.label}
                            </ComboboxItem>
                        )}
                    </ComboboxCollection>
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}

interface AutomationWeekDayComboboxProps {
    labelId: string;
    onValueChange: (value: number) => void;
    value: WeekDayOption;
}

function AutomationMonthDayCombobox({
    labelId,
    onValueChange,
    value,
}: AutomationMonthDayComboboxProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <Combobox<MonthDayOption>
            autoHighlight
            items={MONTH_DAY_OPTIONS}
            itemToStringLabel={(option) => option.label}
            itemToStringValue={(option) => String(option.value)}
            onOpenChange={setIsOpen}
            onValueChange={(nextMonthDay) => {
                if (!nextMonthDay) {
                    return;
                }
                onValueChange(nextMonthDay.value);
                setIsOpen(false);
            }}
            open={isOpen}
            value={value}
        >
            <ComboboxTrigger
                render={
                    <Button
                        aria-labelledby={labelId}
                        className={AUTOMATION_OPTION_TRIGGER_CLASS_NAME}
                        size="xs"
                        variant="ghost"
                    />
                }
            >
                <CalendarDays
                    aria-hidden
                    className="size-3.5 text-muted-foreground"
                    focusable="false"
                />
                <span className="mx-0.5 min-w-0 truncate">
                    <ComboboxValue />
                </span>
                <ChevronDown
                    aria-hidden
                    className="size-3.5"
                    focusable="false"
                />
            </ComboboxTrigger>
            <ComboboxPopup>
                <ComboboxInput
                    aria-label="Search month days"
                    placeholder="Select day..."
                />
                <ComboboxEmpty>No matching days</ComboboxEmpty>
                <ComboboxList>
                    <ComboboxCollection>
                        {(monthDayOption: MonthDayOption) => (
                            <ComboboxItem
                                key={monthDayOption.value}
                                showIndicatorLast
                                value={monthDayOption}
                            >
                                {monthDayOption.label}
                            </ComboboxItem>
                        )}
                    </ComboboxCollection>
                </ComboboxList>
            </ComboboxPopup>
        </Combobox>
    );
}

interface AutomationMonthDayComboboxProps {
    labelId: string;
    onValueChange: (value: number) => void;
    value: MonthDayOption;
}

function getInitialFormState(
    automation: AutomationComposerAutomation | undefined,
    collections: AutomationCollectionOption[]
): AutomationFormState {
    return {
        cadence: getCadenceOption(automation?.cadence),
        collection: getCollectionOption(collections, automation),
        errorMessage: null,
        monthDay: automation?.monthDay ?? DEFAULT_MONTH_DAY,
        prompt: automation?.prompt ?? "",
        timeValue: formatTimeOfDayMinutes(
            automation?.timeOfDayMinutes ?? DEFAULT_TIME_OF_DAY_MINUTES
        ),
        title: automation?.title ?? "",
        weekDay: automation?.weekDay ?? DEFAULT_WEEK_DAY,
    };
}

function getTriggerLabel(
    automation: AutomationComposerAutomation | undefined
): string {
    if (!automation) {
        return "Create automation";
    }
    if (automation.status === "active") {
        return "Edit";
    }
    return "Enable";
}

function getSubmitLabel(args: {
    isEditing: boolean;
    shouldResumeAfterSave: boolean;
}): string {
    if (!args.isEditing) {
        return "Create automation";
    }
    if (args.shouldResumeAfterSave) {
        return "Enable automation";
    }
    return "Save automation";
}

function getCollectionOption(
    collections: AutomationCollectionOption[],
    automation: AutomationComposerAutomation | undefined
) {
    if (automation?.payloadScope !== "collection") {
        return ALL_LIBRARY_OPTION;
    }

    return (
        collections.find(
            (collection) => collection.id === automation.collectionId
        ) ?? ALL_LIBRARY_OPTION
    );
}

function getCadenceOption(cadence: AutomationCadence | undefined) {
    return (
        CADENCE_OPTIONS.find((option) => option.value === cadence) ??
        DEFAULT_CADENCE_OPTION
    );
}

function getWeekDayOption(weekDay: number) {
    return (
        WEEK_DAYS.find((option) => option.value === weekDay) ??
        DEFAULT_WEEK_DAY_OPTION
    );
}

function getMonthDayOption(monthDay: number) {
    return (
        MONTH_DAY_OPTIONS.find((option) => option.value === monthDay) ??
        DEFAULT_MONTH_DAY_OPTION
    );
}

function getMonthDayLabel(monthDay: number): string {
    const suffix =
        monthDay >= 11 && monthDay <= 13
            ? "th"
            : (["th", "st", "nd", "rd"][monthDay % 10] ?? "th");
    return `${monthDay}${suffix}`;
}
