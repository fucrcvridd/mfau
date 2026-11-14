async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (res.status === 204) return null;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error || `Ошибка ${res.status}`);
  }
  return data;
}

export const api = {
  listPatients: () => request('/api/patients'),
  updateCard: (id, card) => request(`/api/patients/${id}/card`, { method: 'PATCH', body: JSON.stringify(card) }),
  listAppointments: () => request('/api/appointments'),
  createAppointment: (body) => request('/api/appointments', { method: 'POST', body: JSON.stringify(body) }),
  updateAppointment: (id, body) => request(`/api/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  listLeads: () => request('/api/leads'),
  deleteLead: (id) => request(`/api/leads/${id}`, { method: 'DELETE' }),
  acceptLead: (id) => request(`/api/leads/${id}/accept`, { method: 'POST' }),
  listPharmacy: () => request('/api/pharmacy'),
  consumePharmacy: (id) => request(`/api/pharmacy/${id}/consume`, { method: 'POST' }),
  listStaff: () => request('/api/staff'),
  listRooms: () => request('/api/rooms'),
  listServices: () => request('/api/services'),
  listArchive: () => request('/api/archive'),
  analytics: (period) => request(`/api/analytics?period=${encodeURIComponent(period)}`),
  report: () => request('/api/reports'),
};
