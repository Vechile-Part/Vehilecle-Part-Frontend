"use client";
import "../../../styles/pages/PartRequestPage.css";
import { useState } from "react";


function PartRequestPage() {

    const [partName, setPartName] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = async () => {

        if (!partName.trim()) {
            alert("Please enter a part name.");
            return;
        }

        const token = localStorage.getItem("authToken");
        const customerId = localStorage.getItem("customerId");

        if (!token || !customerId) {
            alert("You must be logged in.");
            return;
        }

        const body = {
            partName: partName.trim(),
            description: description.trim() || null,
        };

        try {

            const response = await fetch(
                `http://localhost:5020/api/customers/${customerId}/part-requests`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                }
            );

            if (response.ok) {
                alert("Part request submitted!");
                setPartName("");
                setDescription("");
            } else {
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    alert(data.message || "Request failed.");
                } catch {
                    alert("Request failed. Please try again.");
                }
            }

        } catch (error) {
            console.error(error);
            alert("Could not connect to server.");
        }
    };

    return (
        <div className="part-request-page">

            <div className="part-request-left">
                <p className="part-request-label">SPECIAL PROCUREMENT</p>
                <h1 className="part-request-heading">
                    Can't find what you're looking for?
                </h1>
                <p className="part-request-desc">
                    Our global logistics network specializes in sourcing rare,
                    out-of-stock, and custom automotive components. Submit a
                    request and our procurement team will find your part
                    within 24-48 hours.
                </p>

                <div className="part-request-features">
                    <div className="part-feature-card">
                        <p className="part-feature-title">Express Sourcing</p>
                        <p className="part-feature-text">
                            Rapid identification through our verified supplier tier.
                        </p>
                    </div>
                    <div className="part-feature-card">
                        <p className="part-feature-title">Quality Assured</p>
                        <p className="part-feature-text">
                            Every sourced part undergoes a 12-point inspection.
                        </p>
                    </div>
                </div>
            </div>

            <div className="part-request-right">
                <h2 className="part-form-title">Part Request Form</h2>

                <p className="part-form-section-label">PART INFORMATION</p>

                <input
                    className="part-input"
                    placeholder="Part Name or SKU (if known)"
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                />

                <textarea
                    className="part-textarea"
                    placeholder="Description: Describe the part, its function, or any specific markings..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />

                <p className="part-note">
                     Requests are usually processed within 2 hours.
                </p>

                <button className="part-submit-btn" onClick={handleSubmit}>
                    Submit Request
                </button>
            </div>

        </div>
    );
}

export default PartRequestPage;