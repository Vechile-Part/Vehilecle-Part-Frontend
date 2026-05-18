"use client";

import "../../../styles/pages/AppointmentPage.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, extractApiError, parseJsonSafe, readCustomerIdFromSession } from "@/lib/http";

const SERVICES = ["Oil Change", "Brake Check", "Tire Rotation", "Full Diagnostics"];

const SLOTS = [
    "08:00 AM",
    "09:30 AM",
    "11:00 AM",
    "01:00 PM",
    "02:30 PM",
    "04:00 PM",
    "07:00 PM",
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

function parseSlotToDate(year: number, monthIndex: number, day: number, slot: string): Date {
    const [timePart, meridiem] = slot.split(" ");
    const [hoursText, minutesText] = timePart.split(":");
    let hours = Number(hoursText);
    const minutes = Number(minutesText);
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return new Date(year, monthIndex, day, hours, minutes, 0, 0);
}

function slotMatchesBooked(slotDate: Date, bookedIso: string[]): boolean {
    const slotMs = slotDate.getTime();
    return bookedIso.some((iso) => Math.abs(new Date(iso).getTime() - slotMs) < 60_000);
}

function AppointmentPage() {
    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState(now.getDate());
    const [selectedService, setSelectedService] = useState(SERVICES[0]);
    const [selectedTime, setSelectedTime] = useState(SLOTS[2]);
    const [bookedSlots, setBookedSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);

    const daysInMonth = useMemo(
        () => new Date(viewYear, viewMonth + 1, 0).getDate(),
        [viewYear, viewMonth],
    );

    const firstWeekday = useMemo(
        () => new Date(viewYear, viewMonth, 1).getDay(),
        [viewYear, viewMonth],
    );

    const calendarCells = useMemo(() => {
        const cells: (number | null)[] = [];
        for (let i = 0; i < firstWeekday; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        return cells;
    }, [daysInMonth, firstWeekday]);

    const yearOptions = useMemo(() => {
        const current = new Date().getFullYear();
        return Array.from({ length: 6 }, (_, i) => current - 1 + i);
    }, []);

    const loadBookedSlots = useCallback(async () => {
        setLoadingSlots(true);
        try {
            const response = await apiFetch(
                `/api/customers/appointments/availability?year=${viewYear}&month=${viewMonth + 1}&day=${selectedDay}`,
            );
            const data = await parseJsonSafe(response);
            if (response.ok && Array.isArray(data)) {
                setBookedSlots(data.map(String));
            } else {
                setBookedSlots([]);
            }
        } catch {
            setBookedSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    }, [viewYear, viewMonth, selectedDay]);

    useEffect(() => {
        void loadBookedSlots();
    }, [loadBookedSlots]);

    useEffect(() => {
        if (selectedDay > daysInMonth) setSelectedDay(daysInMonth);
    }, [daysInMonth, selectedDay]);

    const isDayPast = (day: number) => {
        const candidate = new Date(viewYear, viewMonth, day, 23, 59, 59);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return candidate < todayStart;
    };

    const isSlotBooked = (slot: string) =>
        slotMatchesBooked(parseSlotToDate(viewYear, viewMonth, selectedDay, slot), bookedSlots);

    const isSlotPast = (slot: string) => {
        const slotDate = parseSlotToDate(viewYear, viewMonth, selectedDay, slot);
        return slotDate.getTime() < Date.now();
    };

    useEffect(() => {
        if (!isSlotBooked(selectedTime) && !isSlotPast(selectedTime)) return;
        const firstFree = SLOTS.find((s) => !isSlotBooked(s) && !isSlotPast(s));
        if (firstFree) setSelectedTime(firstFree);
    }, [bookedSlots, viewYear, viewMonth, selectedDay, selectedTime]);

    const changeMonth = (delta: number) => {
        const next = new Date(viewYear, viewMonth + delta, 1);
        setViewYear(next.getFullYear());
        setViewMonth(next.getMonth());
    };

    const handleBooking = async () => {
        const customerId = readCustomerIdFromSession();
        if (!customerId) {
            setStatus({ tone: "error", text: "You must be logged in to book an appointment." });
            return;
        }

        if (isSlotBooked(selectedTime) || isSlotPast(selectedTime)) {
            setStatus({ tone: "error", text: "Please choose an available time slot." });
            return;
        }

        setStatus(null);

        const appointmentDate = parseSlotToDate(viewYear, viewMonth, selectedDay, selectedTime);
        const bookingData = {
            serviceType: selectedService,
            appointmentDate: appointmentDate.toISOString(),
            notes: null,
        };

        try {
            const response = await apiFetch(`/api/customers/${customerId}/appointments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bookingData),
            });

            const data = await parseJsonSafe(response);
            if (response.ok) {
                setStatus({ tone: "success", text: "Booking confirmed." });
                await loadBookedSlots();
                return;
            }

            setStatus({ tone: "error", text: extractApiError(data, "Booking failed. Please try again.") });
        } catch (error) {
            console.error(error);
            setStatus({ tone: "error", text: "Could not connect to server." });
        }
    };

    return (
        <div className="appointment-page">
            <h1 className="title">Schedule Your Service</h1>
            <p className="subtitle">
                Manage your vehicle maintenance with our simplified booking portal.
            </p>

            <div className="main-layout">
                <div className="left-panel">
                    <div className="card">
                        <h2>Vehicle Selection</h2>
                        <select className="vehicle-select">
                            <option>2022 Porsche 911 Carrera</option>
                        </select>
                        <div className="vehicle-info">
                            <p className="vehicle-title">Current Selection</p>
                            <p className="vehicle-subtitle">Last service: 4 months ago</p>
                        </div>
                    </div>

                    <div className="card">
                        <h2>Service Type</h2>
                        <div className="service-list">
                            {SERVICES.map((service) => (
                                <button
                                    key={service}
                                    type="button"
                                    className={
                                        selectedService === service ? "service-btn active" : "service-btn"
                                    }
                                    onClick={() => setSelectedService(service)}
                                >
                                    {service}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="right-panel">
                    <h2>Select Date & Time</h2>

                    <div className="calendar-controls">
                        <button type="button" className="calendar-nav-btn" onClick={() => changeMonth(-1)}>
                            ‹
                        </button>
                        <select
                            className="calendar-select"
                            value={viewMonth}
                            onChange={(e) => setViewMonth(Number(e.target.value))}
                        >
                            {MONTH_NAMES.map((name, index) => (
                                <option key={name} value={index}>
                                    {name}
                                </option>
                            ))}
                        </select>
                        <select
                            className="calendar-select"
                            value={viewYear}
                            onChange={(e) => setViewYear(Number(e.target.value))}
                        >
                            {yearOptions.map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                        <button type="button" className="calendar-nav-btn" onClick={() => changeMonth(1)}>
                            ›
                        </button>
                    </div>

                    <div className="calendar-weekdays">
                        {WEEKDAY_LABELS.map((label) => (
                            <span key={label} className="weekday-label">
                                {label}
                            </span>
                        ))}
                    </div>

                    <div className="calendar-grid">
                        {calendarCells.map((day, index) =>
                            day === null ? (
                                <span key={`empty-${index}`} className="calendar-empty" />
                            ) : (
                                <button
                                    key={day}
                                    type="button"
                                    disabled={isDayPast(day)}
                                    className={
                                        selectedDay === day
                                            ? "date-btn active-date"
                                            : isDayPast(day)
                                              ? "date-btn date-btn-past"
                                              : "date-btn"
                                    }
                                    onClick={() => setSelectedDay(day)}
                                >
                                    {day}
                                </button>
                            ),
                        )}
                    </div>

                    <div className="slots-section">
                        <h3>
                            Available Slots
                            {loadingSlots ? " (updating…)" : ""}
                        </h3>
                        <div className="slots-grid">
                            {SLOTS.map((slot) => {
                                const booked = isSlotBooked(slot);
                                const past = isSlotPast(slot);
                                const disabled = booked || past;
                                return (
                                    <button
                                        key={slot}
                                        type="button"
                                        disabled={disabled}
                                        className={
                                            selectedTime === slot && !disabled
                                                ? "slot-btn active-slot"
                                                : disabled
                                                  ? "slot-btn slot-btn-disabled"
                                                  : "slot-btn"
                                        }
                                        onClick={() => !disabled && setSelectedTime(slot)}
                                    >
                                        {slot}
                                        {booked ? " (booked)" : past ? " (past)" : ""}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {status && (
                        <p className={`purchase-invoice-status ${status.tone}`} style={{ marginBottom: "1rem" }}>
                            {status.text}
                        </p>
                    )}

                    <div className="button-group">
                        <button type="button" className="cancel-btn">
                            Cancel
                        </button>
                        <button type="button" className="confirm-btn" onClick={() => void handleBooking()}>
                            Confirm Booking
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AppointmentPage;
