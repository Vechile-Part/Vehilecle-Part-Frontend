'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CustomerDashboard() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'vehicles' | 'ai' | 'appointments' | 'requests' | 'reviews'>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [vehicleForm, setVehicleForm] = useState({ vehicleNumber: '', make: '', model: '', year: new Date().getFullYear() });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setCustomerId(id);
    } else {
      // Fallback for demo: load any customer if none specified
      fetch('http://localhost:5019/api/reports/customers/top-spenders')
        .then(r => r.json())
        .then(data => data[0] && setCustomerId(data[0].customerId))
        .catch(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    if (!customerId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const profileRes = await fetch(`http://localhost:5019/api/customers/${customerId}/profile`);
        if (profileRes.ok) setProfile(await profileRes.json());
        
        const vehiclesRes = await fetch(`http://localhost:5019/api/customers/${customerId}/vehicles`);
        if (vehiclesRes.ok) setVehicles(await vehiclesRes.json());
      } catch (e) {
        console.error('Failed to fetch data', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [customerId]);

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`http://localhost:5019/api/customers/${customerId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      alert('Profile updated successfully!');
    } catch (e) {
      console.error('Update failed', e);
    }
  };

  const saveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    const url = editingVehicle 
      ? `http://localhost:5019/api/customers/${customerId}/vehicles/${editingVehicle.id}`
      : `http://localhost:5019/api/customers/${customerId}/vehicles`;
    
    try {
      const res = await fetch(url, {
        method: editingVehicle ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingVehicle ? { ...vehicleForm, id: editingVehicle.id, customerId } : { ...vehicleForm, customerId })
      });
      if (res.ok) {
        alert(editingVehicle ? 'Vehicle updated!' : 'Vehicle registered!');
        setIsVehicleModalOpen(false);
        setEditingVehicle(null);
        // Refresh list
        const vRes = await fetch(`http://localhost:5019/api/customers/${customerId}/vehicles`);
        if (vRes.ok) setVehicles(await vRes.json());
      }
    } catch (e) {
      console.error('Save failed', e);
    }
  };

  if (loading && !customerId) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Loading your portal...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Vehicle Modal */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold mb-2">{editingVehicle ? 'Edit Vehicle' : 'Register Vehicle'}</h3>
            <p className="text-slate-500 mb-6">Enter your vehicle details below.</p>
            <form onSubmit={saveVehicle} className="space-y-4">
              <input className="input" placeholder="Vehicle Number (e.g. BA 1 PA 1234)" value={vehicleForm.vehicleNumber} onChange={e => setVehicleForm({...vehicleForm, vehicleNumber: e.target.value})} required />
              <input className="input" placeholder="Make (e.g. Toyota)" value={vehicleForm.make} onChange={e => setVehicleForm({...vehicleForm, make: e.target.value})} required />
              <input className="input" placeholder="Model (e.g. Corolla)" value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} required />
              <input className="input" type="number" placeholder="Year" value={vehicleForm.year} onChange={e => setVehicleForm({...vehicleForm, year: parseInt(e.target.value)})} required />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => {setIsVehicleModalOpen(false); setEditingVehicle(null);}} className="btn bg-slate-100 text-slate-600 flex-1 hover:bg-slate-200">Cancel</button>
                <button type="submit" className="btn btn-primary flex-1">Save Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="container h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-primary tracking-tight">VechilePart</Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-slate-500 font-medium">Welcome back, {profile?.fullName?.split(' ')[0] || 'Customer'}</span>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold shadow-sm">
              {profile?.fullName?.[0] || 'C'}
            </div>
          </div>
        </div>
      </nav>

      <main className="container py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-8 md:gap-12">
          {/* Sidebar */}
          <aside className="lg:w-72 shrink-0">
            <div className="flex flex-col gap-1 p-2 bg-white rounded-2xl shadow-sm border border-slate-100">
              {[
                { id: 'profile', label: 'My Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                { id: 'vehicles', label: 'My Vehicles', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z' },
                { id: 'ai', label: 'AI Diagnostics', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                { id: 'appointments', label: 'Appointments', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                { id: 'requests', label: 'Part Requests', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
                { id: 'reviews', label: 'Submit Review', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl font-semibold transition-all duration-200 ${activeTab === tab.id ? 'bg-primary text-white shadow-md' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'}`}
                >
                  <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* AI Banner */}
            <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-xl shadow-indigo-200 overflow-hidden relative">
              <div className="relative z-10">
                <div className="bg-white/20 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="font-bold text-lg mb-1">AI Diagnostics</h4>
                <p className="text-white/80 text-sm leading-relaxed mb-4">Our AI is analyzing your vehicle health in real-time.</p>
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-2/3"></div>
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-[0px]">
            {activeTab === 'profile' && (
              <div className="card max-w-2xl border-none shadow-xl shadow-slate-200/40 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-800">Account Profile</h2>
                    <p className="text-slate-500">Manage your personal information and preferences.</p>
                  </div>
                </div>
                <form onSubmit={updateProfile} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                      <input 
                        className="input bg-slate-50/50" 
                        value={profile?.fullName || ''} 
                        onChange={e => setProfile({...profile, fullName: e.target.value})}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email (Account ID)</label>
                      <input 
                        disabled 
                        className="input bg-slate-100 cursor-not-allowed opacity-75" 
                        value={profile?.email || ''} 
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                      <input 
                        className="input bg-slate-50/50" 
                        value={profile?.phone || ''} 
                        onChange={e => setProfile({...profile, phone: e.target.value})}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                  <div className="pt-6 border-t border-slate-100">
                    <button type="submit" className="btn btn-primary px-10 py-3.5 shadow-lg shadow-primary/20">
                      Update Profile
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {activeTab === 'vehicles' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-800">My Vehicles</h2>
                    <p className="text-slate-500">Monitor and manage your registered vehicles.</p>
                  </div>
                  <button onClick={() => {setVehicleForm({vehicleNumber: '', make: '', model: '', year: 2024}); setIsVehicleModalOpen(true);}} className="btn btn-primary gap-2 shadow-lg shadow-primary/10">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Register New
                  </button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {vehicles.length > 0 ? vehicles.map((v, i) => (
                    <div key={i} className="card border-none shadow-lg hover:shadow-2xl transition-all duration-300 group relative overflow-hidden bg-white">
                      <div className="absolute top-0 right-0 p-4">
                        <button onClick={() => {setEditingVehicle(v); setVehicleForm(v); setIsVehicleModalOpen(true);}} className="p-2 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-primary/5 text-primary rounded-2xl flex items-center justify-center shadow-inner">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-800">{v.make} {v.model}</h3>
                          <p className="text-xs font-mono font-bold text-primary uppercase bg-primary/5 px-2 py-0.5 rounded inline-block">{v.vehicleNumber}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Model Year</p>
                          <p className="font-bold text-slate-700">{v.year}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Status</p>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                            <p className="font-bold text-green-600">Excellent</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-24 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-slate-600">No vehicles tracked</h3>
                      <p className="text-slate-400 max-w-xs mx-auto mt-2">Add your first vehicle to start receiving AI-powered predictive maintenance alerts.</p>
                      <button onClick={() => setIsVehicleModalOpen(true)} className="btn btn-primary mt-8 px-8">Add My Vehicle</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-800">AI Predictive Maintenance</h2>
                  <p className="text-slate-500">Intelligent analysis of your vehicle's condition and usage patterns.</p>
                </div>
                {vehicles.length === 0 ? (
                  <div className="card text-center py-16">
                    <p className="text-slate-400">Please register a vehicle to enable AI diagnostics.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {[
                      { part: "Brake Pads", risk: 75, status: "High Risk", color: "text-red-600", bg: "bg-red-50", desc: "Detected thinning. Replace within 500km." },
                      { part: "Battery", risk: 20, status: "Healthy", color: "text-green-600", bg: "bg-green-50", desc: "Voltage stable. No action needed." },
                      { part: "Transmission", risk: 45, status: "Moderate", color: "text-orange-600", bg: "bg-orange-50", desc: "Slight fluid degradation detected." },
                    ].map((item, i) => (
                      <div key={i} className="card flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/30 transition-all cursor-default">
                        <div className="flex gap-4">
                          <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-xl flex items-center justify-center shrink-0`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800">{item.part}</h4>
                            <p className="text-sm text-slate-500">{item.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className={`text-sm font-bold ${item.color}`}>{item.status}</p>
                            <p className="text-xs text-slate-400">Risk Score: {item.risk}/100</p>
                          </div>
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${item.risk > 70 ? 'bg-red-500' : item.risk > 40 ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${item.risk}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'appointments' && (
              <div className="card space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-extrabold text-slate-800">Book Appointment</h2>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Preferred Date</label>
                    <input type="date" className="input bg-slate-50/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Service Type</label>
                    <select className="input bg-slate-50/50">
                      <option>General Service</option>
                      <option>Part Replacement</option>
                      <option>AI Diagnostics Review</option>
                    </select>
                  </div>
                  <button className="btn btn-primary w-full py-3 mt-4">Schedule Service</button>
                </div>
              </div>
            )}

            {(activeTab === 'requests' || activeTab === 'reviews') && (
              <div className="card min-h-[400px] flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-20 h-20 bg-primary/5 text-primary rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-800">Support Module</h2>
                <p className="text-slate-500 max-w-sm mt-2">Submit your {activeTab === 'requests' ? 'part requests' : 'service reviews'} here.</p>
                <textarea className="input bg-slate-50/50 mt-6 min-h-[120px] w-full max-w-md" placeholder="Enter details..."></textarea>
                <button className="btn btn-primary mt-6 px-12">Submit</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
