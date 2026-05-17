"use client";
import "../../../styles/pages/AppointmentPage.css";
import { useState } from "react";

function AppointmentPage() {

    const [selectedService, setSelectedService] =
        useState("Oil Change");

    const [selectedDate, setSelectedDate] =
        useState(7);

    const [selectedTime, setSelectedTime] =
        useState("11:00 AM");

    const services = [
        "Oil Change",
        "Brake Check",
        "Tire Rotation",
        "Full Diagnostics",
    ];

    const days = [
        1,2,3,4,5,6,7,8,
        9,10,11,12,13,14,15,16
    ];

    const slots = [
        "08:00 AM",
        "09:30 AM",
        "11:00 AM",
        "01:00 PM",
        "02:30 PM",
        "04:00 PM",
        "07:00 PM",
    ];

    const handleBooking = async () => {

        const token = localStorage.getItem("authToken");
        const customerId = localStorage.getItem("customerId");

        if (!token || !customerId) {
            alert("You must be logged in to book an appointment.");
            return;
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed

        // Build the date using actual year + current month + selected day
        const appointmentDate = new Date(year, month, selectedDate);

        // If the selected day has already passed this month, move to next month
        if (appointmentDate < new Date()) {
            appointmentDate.setMonth(appointmentDate.getMonth() + 1);
        }

        const [timePart, meridiem] = selectedTime.split(" ");
        const [hoursText, minutesText] = timePart.split(":");
        let hours = Number(hoursText);
        const minutes = Number(minutesText);
        if (meridiem === "PM" && hours !== 12) hours += 12;
        if (meridiem === "AM" && hours === 12) hours = 0;

        appointmentDate.setHours(hours, minutes, 0, 0);

        const bookingData = {
            serviceType: selectedService,
            appointmentDate: appointmentDate.toISOString(), // sends full ISO string like 2025-06-07T09:30:00.000Z
            notes: null,
        };

        try {
            const response = await fetch(
                `http://localhost:5020/api/customers/${customerId}/appointments`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify(bookingData),
                }
            );

            if (response.ok) {
                alert("Booking Confirmed!");
            } else {
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    alert(data.message || "Booking failed.");
                } catch {
                    alert("Booking failed. Please try again.");
                }
            }

        } catch (error) {
            console.error(error);
            alert("Could not connect to server.");
        }
    };
    return (
        <div className="appointment-page">

            <h1 className="title">
                Schedule Your Service
            </h1>

            <p className="subtitle">
                Manage your vehicle maintenance
                with our simplified booking portal.
            </p>

            <div className="main-layout">

                {/* LEFT PANEL */}
                <div className="left-panel">

                    {/* Vehicle Selection */}
                    <div className="card">
                        <h2>Vehicle Selection</h2>

                        <select className="vehicle-select">
                            <option>
                                2022 Porsche 911 Carrera
                            </option>
                        </select>

                        <div className="vehicle-info">
                            <p className="vehicle-title">
                                Current Selection
                            </p>

                            <p className="vehicle-subtitle">
                                Last service: 4 months ago
                            </p>
                        </div>
                    </div>

                    {/* Services */}
                    <div className="card">

                        <h2>Service Type</h2>

                        <div className="service-list">

                            {services.map((service) => (

                                <button
                                    key={service}
                                    className={
                                        selectedService === service
                                            ? "service-btn active"
                                            : "service-btn"
                                    }
                                    onClick={() =>
                                        setSelectedService(service)
                                    }
                                >
                                    {service}
                                </button>

                            ))}

                        </div>

                    </div>

                </div>

                {/* RIGHT PANEL */}
                <div className="right-panel">

                    <h2>Select Date & Time</h2>

                    {/* Calendar */}
                    <div className="calendar-grid">

                        {days.map((day) => (

                            <button
                                key={day}
                                className={
                                    selectedDate === day
                                        ? "date-btn active-date"
                                        : "date-btn"
                                }
                                onClick={() =>
                                    setSelectedDate(day)
                                }
                            >
                                {day}
                            </button>

                        ))}

                    </div>

                    {/* Time Slots */}
                    <div className="slots-section">

                        <h3>Available Slots</h3>

                        <div className="slots-grid">

                            {slots.map((slot) => (

                                <button
                                    key={slot}
                                    className={
                                        selectedTime === slot
                                            ? "slot-btn active-slot"
                                            : "slot-btn"
                                    }
                                    onClick={() =>
                                        setSelectedTime(slot)
                                    }
                                >
                                    {slot}
                                </button>

                            ))}

                        </div>

                    </div>

                    {/* Buttons */}
                    <div className="button-group">

                        <button className="cancel-btn">
                            Cancel
                        </button>

                        <button
                            className="confirm-btn"
                            onClick={handleBooking}
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