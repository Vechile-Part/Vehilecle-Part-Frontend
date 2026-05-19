"use client";

import "../../../styles/pages/AppointmentPage.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, extractApiError, parseJsonSafe, readCustomerIdFromSession } from "@/lib/http";
import {
    getNepalDateParts,
    getNepalWeekday,
    isNepalDateBefore,
    nepalLocalSlotToUtc,
} from "@/lib/nepalTime";

type VehicleItem = {
    id: string;
    vehicleNumber: string;
    make: string;
    model: string;
    year: number;
};

type CustomerAppointment = {
    id: string;
    appointmentDate: string;
    serviceType: string;
    status: string;
    vehicleId: string;
};

const formatVehicleLabel = (vehicle: VehicleItem) =>
    `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.vehicleNumber}`;

const formatRelativeService = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
    if (days < 0) return null;
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
    const years = Math.floor(months / 12);
    return years === 1 ? "1 year ago" : `${years} years ago`;
};

const lastServiceForVehicle = (vehicleId: string, appointments: CustomerAppointment[]) => {
    const completed = appointments
        .filter(
            (a) =>
                a.vehicleId === vehicleId &&
                a.status.toLowerCase() === "completed" &&
                a.appointmentDate,
        )
        .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
    if (completed.length === 0) return null;
    return formatRelativeService(completed[0].appointmentDate);
};

const DEFAULT_SERVICES = ["Oil Change", "Brake Check", "Tire Rotation", "Full Diagnostics"];

const DEFAULT_SLOTS = [
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

function slotMatchesBooked(slotUtc: Date | null, bookedIso: string[]): boolean {
    if (!slotUtc) return false;
    const slotMs = slotUtc.getTime();
    return bookedIso.some((iso) => Math.abs(new Date(iso).getTime() - slotMs) < 60_000);
}

function AppointmentPage() {
    const router = useRouter();
    const nepalToday = getNepalDateParts();
    const [services, setServices] = useState<string[]>(DEFAULT_SERVICES);
    const [slots, setSlots] = useState<string[]>(DEFAULT_SLOTS);
    const [viewYear, setViewYear] = useState(nepalToday.year);
    const [viewMonth, setViewMonth] = useState(nepalToday.month - 1);
    const [selectedDay, setSelectedDay] = useState(nepalToday.day);
    const [selectedService, setSelectedService] = useState(DEFAULT_SERVICES[0]);
    const [selectedTime, setSelectedTime] = useState(DEFAULT_SLOTS[2]);
    const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState("");
    const [pastAppointments, setPastAppointments] = useState<CustomerAppointment[]>([]);
    const [loadingVehicles, setLoadingVehicles] = useState(true);
    const [bookedSlots, setBookedSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);

    const selectedVehicle = useMemo(
        () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
        [vehicles, selectedVehicleId],
    );

    const lastServiceLabel = useMemo(() => {
        if (!selectedVehicleId) return null;
        return lastServiceForVehicle(selectedVehicleId, pastAppointments);
    }, [selectedVehicleId, pastAppointments]);

    const daysInMonth = useMemo(
        () => new Date(viewYear, viewMonth + 1, 0).getDate(),
        [viewYear, viewMonth],
    );

    const firstWeekday = useMemo(
        () => getNepalWeekday(viewYear, viewMonth + 1, 1),
        [viewYear, viewMonth],
    );

    const calendarCells = useMemo(() => {
        const cells: (number | null)[] = [];
        for (let i = 0; i < firstWeekday; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        return cells;
    }, [daysInMonth, firstWeekday]);

    const yearOptions = useMemo(() => {
        const current = getNepalDateParts().year;
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
        const loadOptions = async () => {
            try {
                const res = await apiFetch("/api/customers/appointment-options");
                const data = await parseJsonSafe(res);
                if (res.ok && data && typeof data === "object" && !Array.isArray(data)) {
                    const record = data as Record<string, unknown>;
                    const serviceList = record.services ?? record.Services;
                    const slotList = record.timeSlots ?? record.TimeSlots;
                    if (Array.isArray(serviceList) && serviceList.length > 0) {
                        const parsed = serviceList.map(String);
                        setServices(parsed);
                        setSelectedService((current) =>
                            parsed.includes(current) ? current : parsed[0],
                        );
                    }
                    if (Array.isArray(slotList) && slotList.length > 0) {
                        const parsed = slotList.map(String);
                        setSlots(parsed);
                        setSelectedTime((current) => (parsed.includes(current) ? current : parsed[0]));
                    }
                }
            } catch {
                /* defaults remain */
            }
        };
        void loadOptions();
    }, []);

    useEffect(() => {
        const customerId = readCustomerIdFromSession();
        if (!customerId) {
            setLoadingVehicles(false);
            return;
        }

        const loadAccountData = async () => {
            setLoadingVehicles(true);
            try {
                const [vehiclesRes, appointmentsRes] = await Promise.all([
                    apiFetch(`/api/customers/${customerId}/vehicles`),
                    apiFetch(`/api/customers/${customerId}/appointments`),
                ]);

                if (vehiclesRes.ok) {
                    const vehiclesData = await parseJsonSafe(vehiclesRes);
                    if (Array.isArray(vehiclesData)) {
                        const parsed = vehiclesData
                            .map((item) => {
                                const record = item as Record<string, unknown>;
                                const id = String(record.id ?? record.Id ?? "");
                                if (!id) return null;
                                return {
                                    id,
                                    vehicleNumber: String(record.vehicleNumber ?? record.VehicleNumber ?? ""),
                                    make: String(record.make ?? record.Make ?? ""),
                                    model: String(record.model ?? record.Model ?? ""),
                                    year: Number(record.year ?? record.Year ?? 0),
                                };
                            })
                            .filter((v): v is VehicleItem => v !== null);
                        setVehicles(parsed);
                        setSelectedVehicleId((current) =>
                            current && parsed.some((v) => v.id === current) ? current : parsed[0]?.id ?? "",
                        );
                    }
                }

                if (appointmentsRes.ok) {
                    const appointmentsData = await parseJsonSafe(appointmentsRes);
                    if (Array.isArray(appointmentsData)) {
                        setPastAppointments(
                            appointmentsData.map((item) => {
                                const record = item as Record<string, unknown>;
                                return {
                                    id: String(record.id ?? record.Id ?? ""),
                                    appointmentDate: String(
                                        record.appointmentDate ?? record.AppointmentDate ?? "",
                                    ),
                                    serviceType: String(record.serviceType ?? record.ServiceType ?? ""),
                                    status: String(record.status ?? record.Status ?? ""),
                                    vehicleId: String(record.vehicleId ?? record.VehicleId ?? ""),
                                };
                            }),
                        );
                    }
                }
            } catch {
                setVehicles([]);
            } finally {
                setLoadingVehicles(false);
            }
        };

        void loadAccountData();
    }, []);

    useEffect(() => {
        if (selectedDay > daysInMonth) setSelectedDay(daysInMonth);
    }, [daysInMonth, selectedDay]);

    const isDayPast = (day: number) =>
        isNepalDateBefore(viewYear, viewMonth + 1, day, getNepalDateParts());

    const isSlotBooked = (slot: string) =>
        slotMatchesBooked(nepalLocalSlotToUtc(viewYear, viewMonth + 1, selectedDay, slot), bookedSlots);

    const isSlotPast = (slot: string) => {
        const slotUtc = nepalLocalSlotToUtc(viewYear, viewMonth + 1, selectedDay, slot);
        return !slotUtc || slotUtc.getTime() < Date.now();
    };

    useEffect(() => {
        if (!isSlotBooked(selectedTime) && !isSlotPast(selectedTime)) return;
        const firstFree = slots.find((s) => !isSlotBooked(s) && !isSlotPast(s));
        if (firstFree) setSelectedTime(firstFree);
    }, [bookedSlots, viewYear, viewMonth, selectedDay, selectedTime, slots]);

    const handleCancel = () => {
        setStatus(null);
        router.push("/customer/dashboard");
    };

    const changeMonth = (delta: number) => {
        let month = viewMonth + delta;
        let year = viewYear;
        while (month < 0) {
            month += 12;
            year -= 1;
        }
        while (month > 11) {
            month -= 12;
            year += 1;
        }
        setViewYear(year);
        setViewMonth(month);
    };

    const handleBooking = async () => {
        const customerId = readCustomerIdFromSession();
        if (!customerId) {
            setStatus({ tone: "error", text: "You must be logged in to book an appointment." });
            return;
        }

        if (!selectedVehicleId) {
            setStatus({
                tone: "error",
                text: "Add a vehicle on your profile before booking an appointment.",
            });
            return;
        }

        if (isSlotBooked(selectedTime) || isSlotPast(selectedTime)) {
            setStatus({ tone: "error", text: "Please choose an available time slot." });
            return;
        }

        setStatus(null);

        const appointmentUtc = nepalLocalSlotToUtc(viewYear, viewMonth + 1, selectedDay, selectedTime);
        if (!appointmentUtc) {
            setStatus({ tone: "error", text: "Invalid time slot selected." });
            return;
        }

        const bookingData = {
            serviceType: selectedService,
            appointmentDate: appointmentUtc.toISOString(),
            notes: null,
            vehicleId: selectedVehicleId,
        };

        try {
            const response = await apiFetch(`/api/customers/${customerId}/appointments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bookingData),
            });

            const data = await parseJsonSafe(response);
            if (response.ok) {
                setStatus({
                    tone: "success",
                    text: "Appointment requested. Staff will confirm your booking.",
                });
                await loadBookedSlots();
                const refreshAppointments = await apiFetch(`/api/customers/${customerId}/appointments`);
                const refreshData = await parseJsonSafe(refreshAppointments);
                if (refreshAppointments.ok && Array.isArray(refreshData)) {
                    setPastAppointments(
                        refreshData.map((item) => {
                            const record = item as Record<string, unknown>;
                            return {
                                id: String(record.id ?? record.Id ?? ""),
                                appointmentDate: String(
                                    record.appointmentDate ?? record.AppointmentDate ?? "",
                                ),
                                serviceType: String(record.serviceType ?? record.ServiceType ?? ""),
                                status: String(record.status ?? record.Status ?? ""),
                                vehicleId: String(record.vehicleId ?? record.VehicleId ?? ""),
                            };
                        }),
                    );
                }
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
                        {loadingVehicles ? (
                            <p className="vehicle-subtitle" style={{ marginTop: "1rem" }}>
                                Loading your vehicles…
                            </p>
                        ) : vehicles.length === 0 ? (
                            <div className="vehicle-info vehicle-info-empty">
                                <p className="vehicle-title">No vehicles registered</p>
                                <p className="vehicle-subtitle">
                                    Add a vehicle on your{" "}
                                    <Link href="/customer/profile" className="vehicle-profile-link">
                                        profile
                                    </Link>{" "}
                                    before booking.
                                </p>
                            </div>
                        ) : (
                            <>
                                <select
                                    className="vehicle-select"
                                    value={selectedVehicleId}
                                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                                    aria-label="Select vehicle for this appointment"
                                >
                                    {vehicles.map((vehicle) => (
                                        <option key={vehicle.id} value={vehicle.id}>
                                            {formatVehicleLabel(vehicle)}
                                        </option>
                                    ))}
                                </select>
                                {selectedVehicle ? (
                                    <div className="vehicle-info">
                                        <p className="vehicle-title">{selectedVehicle.vehicleNumber}</p>
                                        <p className="vehicle-subtitle">
                                            {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                                        </p>
                                        <p className="vehicle-subtitle">
                                            Last completed visit:{" "}
                                            {lastServiceLabel ?? "No completed service on record for this vehicle"}
                                        </p>
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>

                    <div className="card">
                        <h2>Service Type</h2>
                        <div className="service-list">
                            {services.map((service) => (
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
                            {slots.map((slot) => {
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
                        <button type="button" className="cancel-btn" onClick={handleCancel}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="confirm-btn"
                            disabled={loadingVehicles || !selectedVehicleId}
                            onClick={() => void handleBooking()}
                        >
                            Confirm Booking
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AppointmentPage;
