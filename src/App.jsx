import React, { useEffect, useState, useRef } from 'react';
import { Calendar, Pill, DollarSign, Shield, PlusCircle, Menu, X, Users, Globe, Building2, CheckCircle, BarChart3, Download, Archive, ChevronDown, FileText, Search } from 'lucide-react';
import { api } from './api';

export default function App() {
  const [role, setRole] = useState('admin');
  const [activeTab, setTab] = useState('schedule');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Состояния для кастомных выпадающих меню
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const [patientsBase, setPatientsBase] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [archiveRecords, setArchiveRecords] = useState([]);
  const [onlineLeads, setOnlineLeads] = useState([]);
  const [pharmacy, setPharmacy] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [services, setServices] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loadError, setLoadError] = useState('');

  // Состояния формы новой записи
  const [patientInput, setPatientInput] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [newDoctor, setNewDoctor] = useState('Дмитрий Зубов');
  const [showDoctorSelect, setShowDoctorSelect] = useState(false);

  const [newRoom, setNewRoom] = useState('Кабинет №1');
  const [showRoomSelect, setShowRoomSelect] = useState(false);

  const [newService, setNewService] = useState('Консультация и осмотр');
  const [showServiceSelect, setShowServiceSelect] = useState(false);

  const [hourInput, setHourInput] = useState('12');
  const [minuteInput, setMinuteInput] = useState('00');
  const minuteRef = useRef(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Состояния аналитики
  const [reportPeriod, setReportPeriod] = useState('За месяц');
  const [showReportPeriodSelect, setShowReportPeriodSelect] = useState(false);

  const [analyticsSubTab, setAnalyticsSubTab] = useState('overview');
  const [archiveYear, setArchiveYear] = useState('Все годы');
  const [showArchiveYearSelect, setShowArchiveYearSelect] = useState(false);

  const [archiveMonth, setArchiveMonth] = useState('Все месяцы');
  const [showArchiveMonthSelect, setShowArchiveMonthSelect] = useState(false);

  const [showRoleSelect, setShowRoleSelect] = useState(false);

  // Состояние для медкарты врача
  const [selectedPatientCard, setSelectedPatientCard] = useState(null);
  const [editDiagnosis, setEditDiagnosis] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [cardSaveSuccess, setCardSaveSuccess] = useState(false);
  const [warehouseSearch, setWarehouseSearch] = useState('');

  // Списки вариантов
  const roomsList = rooms.map((room) => room.name);
  const statusesList = ['Ожидает', 'Завершен', 'Отменен'];
  const doctorsList = staffList.filter((person) => person.role.includes('Врач')).map((person) => person.name);
  const servicesList = services.map((item) => item.name);
  const periodsList = ['За сегодня', 'За неделю', 'За месяц', 'За год'];
  const yearsList = ['Все годы', ...Array.from(new Set(archiveRecords.map((rec) => rec.year))).sort((a, b) => b.localeCompare(a))];
  const monthsList = ['Все месяцы', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  async function loadCore() {
    const [patients, appts, leads, items, staff, roomRows, serviceRows, archive] = await Promise.all([
      api.listPatients(),
      api.listAppointments(),
      api.listLeads(),
      api.listPharmacy(),
      api.listStaff(),
      api.listRooms(),
      api.listServices(),
      api.listArchive(),
    ]);
    setPatientsBase(patients ?? []);
    setAppointments(appts ?? []);
    setOnlineLeads(leads ?? []);
    setPharmacy(items ?? []);
    setStaffList(staff ?? []);
    setRooms(roomRows ?? []);
    setServices(serviceRows ?? []);
    setArchiveRecords(archive ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    loadCore()
      .then(() => {
        if (!cancelled) setLoadError('');
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Не удалось загрузить данные');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.analytics(reportPeriod)
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || 'Не удалось загрузить аналитику');
      });
    return () => {
      cancelled = true;
    };
  }, [reportPeriod]);

  async function changeAppointment(id, patch) {
    try {
      const updated = await api.updateAppointment(id, patch);
      setAppointments((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setOpenDropdownId(null);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Не удалось обновить запись');
    }
  }

  const filteredPatients = patientsBase.filter(p => 
    p.name.toLowerCase().includes(patientInput.toLowerCase())
  );

  const filteredArchive = archiveRecords.filter(rec => {
    const matchYear = archiveYear === 'Все годы' || rec.year === archiveYear;
    const matchMonth = archiveMonth === 'Все месяцы' || rec.month === archiveMonth;
    return matchYear && matchMonth;
  });

  const filteredPharmacy = pharmacy.filter(p =>
    p.name.toLowerCase().includes(warehouseSearch.toLowerCase())
  );

  const handleHourChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setHourInput(val);
    if (val.length === 2 && minuteRef.current) {
      minuteRef.current.focus();
    }
  };

  const handleAddAppointment = async (e) => {
    e.preventDefault();
    if (!patientInput.trim()) return;

    const formattedTime = `${hourInput.padStart(2, '0')}:${minuteInput.padStart(2, '0')}`;
    try {
      await api.createAppointment({
        patient: patientInput.trim(),
        doctor: newDoctor,
        time: formattedTime,
        room: newRoom,
        service: newService,
      });
      await loadCore();
      setLoadError('');
      setBookingSuccess(true);
      setPatientInput('');
      setTimeout(() => setBookingSuccess(false), 3000);
    } catch (err) {
      setLoadError(err.message || 'Не удалось создать запись');
    }
  };

  const selectTab = (tab) => {
    setTab(tab);
    setMobileMenuOpen(false);
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setShowRoleSelect(false);
    if (newRole === 'director') {
      setTab('director_analytics');
    } else if (newRole === 'admin') {
      setTab('schedule');
    } else if (newRole === 'doctor') {
      setTab('doctor_schedule');
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full bg-slate-50 font-sans text-slate-900">
      
      {/* Мобильная шапка */}
      <div className="md:hidden flex items-center justify-between bg-slate-950 text-white px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-cyan-400" />
          <span className="font-bold text-lg">Дентал-CRM</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-300 hover:text-white">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Боковое меню */}
      <aside className={`${mobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col justify-between w-full md:w-64 lg:w-72 bg-slate-950 text-slate-100 border-r border-slate-800 p-6 shrink-0`}>
        <div>
          <div className="hidden md:flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-cyan-400" />
            <h1 className="text-xl font-bold tracking-wide">Дентал-CRM</h1>
          </div>

          <nav className="space-y-1.5">
            {role === 'admin' && (
              <>
                <button onClick={() => selectTab('schedule')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-sm ${activeTab === 'schedule' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <Calendar className="w-5 h-5 shrink-0" /> Актуальные записи
                </button>
                <button onClick={() => selectTab('new_appointment')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-sm ${activeTab === 'new_appointment' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <PlusCircle className="w-5 h-5 shrink-0" /> Новая запись
                </button>
                <button onClick={() => selectTab('clients')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-sm ${activeTab === 'clients' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <Users className="w-5 h-5 shrink-0" /> База клиентов
                </button>
                <button onClick={() => selectTab('online_leads')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-sm ${activeTab === 'online_leads' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <Globe className="w-5 h-5 shrink-0" /> Заявки с сайта
                </button>
                <button onClick={() => selectTab('pharmacy')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-sm ${activeTab === 'pharmacy' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <Pill className="w-5 h-5 shrink-0" /> Аптека и Склад
                </button>
                <button onClick={() => selectTab('staff_rooms')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-sm ${activeTab === 'staff_rooms' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <Building2 className="w-5 h-5 shrink-0" /> Персонал и кабинеты
                </button>
                <button onClick={() => selectTab('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-sm ${activeTab === 'reports' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <DollarSign className="w-5 h-5 shrink-0" /> Отчеты
                </button>
              </>
            )}

            {role === 'director' && (
              <>
                <button onClick={() => selectTab('director_analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-sm ${activeTab === 'director_analytics' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <BarChart3 className="w-5 h-5 shrink-0" /> Аналитика и Отчеты
                </button>
                <button onClick={() => selectTab('schedule')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-sm ${activeTab === 'schedule' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <Calendar className="w-5 h-5 shrink-0" /> Расписание
                </button>
                <button onClick={() => selectTab('pharmacy')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-sm ${activeTab === 'pharmacy' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <Pill className="w-5 h-5 shrink-0" /> Склад
                </button>
                <button onClick={() => selectTab('staff_rooms')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-sm ${activeTab === 'staff_rooms' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <Building2 className="w-5 h-5 shrink-0" /> Персонал
                </button>
              </>
            )}

            {role === 'doctor' && (
              <>
                <button onClick={() => selectTab('doctor_schedule')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-sm ${activeTab === 'doctor_schedule' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <Calendar className="w-5 h-5 shrink-0" /> Мое расписание
                </button>
                <button onClick={() => selectTab('doctor_cards')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-sm ${activeTab === 'doctor_cards' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <FileText className="w-5 h-5 shrink-0" /> Карты пациентов
                </button>
                <button onClick={() => selectTab('doctor_warehouse')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition text-sm ${activeTab === 'doctor_warehouse' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
                  <Pill className="w-5 h-5 shrink-0" /> Запрос в аптеку/склад
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Кастомный селектор роли внизу */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mt-6 md:mt-0 relative">
          <label className="block text-xs text-slate-400 mb-2 font-medium">Текущая роль:</label>
          <div 
            onClick={() => setShowRoleSelect(!showRoleSelect)}
            className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-lg p-2.5 flex justify-between items-center cursor-pointer hover:border-cyan-500 transition"
          >
            <span>{role === 'admin' ? 'Администратор' : role === 'director' ? 'Директор' : role === 'doctor' ? 'Врач' : role}</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
          {showRoleSelect && (
            <div className="absolute bottom-full mb-2 left-0 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-20">
              <div onClick={() => handleRoleChange('admin')} className="p-3 text-sm text-white hover:bg-cyan-600 cursor-pointer transition">Администратор</div>
              <div onClick={() => handleRoleChange('director')} className="p-3 text-sm text-white hover:bg-cyan-600 cursor-pointer transition">Директор</div>
              <div onClick={() => handleRoleChange('doctor')} className="p-3 text-sm text-white hover:bg-cyan-600 cursor-pointer transition">Врач</div>
              <div onClick={() => handleRoleChange('patient')} className="p-3 text-sm text-slate-400 cursor-not-allowed">Пациент (в разработке)</div>
            </div>
          )}
        </div>
      </aside>

      {/* Основной контент */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        <header className="bg-white border-b border-slate-200 px-6 sm:px-8 py-4 sm:py-5 flex justify-between items-center shadow-sm w-full">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">
            {activeTab === 'director_analytics' && 'Панель директора: Аналитика и отчеты'}
            {activeTab === 'schedule' && (role === 'director' ? 'Расписание' : 'Актуальные записи')}
            {activeTab === 'new_appointment' && 'Создание новой записи'}
            {activeTab === 'clients' && 'База всех клиентов клиники'}
            {activeTab === 'online_leads' && 'Заявки с сайта (Онлайн-запись)'}
            {activeTab === 'pharmacy' && (role === 'director' ? 'Склад' : 'Аптека и складской учет')}
            {activeTab === 'staff_rooms' && 'Список персонала и кабинетов'}
            {activeTab === 'reports' && 'Финансовые и операционные отчеты'}
            
            {activeTab === 'doctor_schedule' && 'Мое расписание приемов (Дмитрий Зубов)'}
            {activeTab === 'doctor_cards' && 'Карты пациентов и история болезни'}
            {activeTab === 'doctor_warehouse' && 'Проверка наличия препаратов на складе'}
          </h2>
          <span className="px-3 sm:px-4 py-1.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wider">
            {role === 'director' ? 'Директор' : role === 'doctor' ? 'Врач' : 'Администратор'}
          </span>
        </header>

        <main className="p-4 sm:p-8 flex flex-col w-full items-center">
          {loadError && (
            <div className="mb-4 w-full max-w-6xl p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
              {loadError}
            </div>
          )}
          
          {/* КАБИНЕТ ВРАЧА: МОЕ РАСПИСАНИЕ */}
          {activeTab === 'doctor_schedule' && role === 'doctor' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 w-full max-w-6xl">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Список записей на сегодня (Врач: Дмитрий Зубов)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase font-semibold">
                      <th className="pb-3 pr-4">Время</th>
                      <th className="pb-3 pr-4">Пациент</th>
                      <th className="pb-3 pr-4">Кабинет</th>
                      <th className="pb-3 pr-4">Услуга</th>
                      <th className="pb-3">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {appointments.filter(a => a.doctor === 'Дмитрий Зубов').map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 transition">
                        <td className="py-4 pr-4 font-bold text-cyan-600 whitespace-nowrap">{a.time}</td>
                        <td className="py-4 pr-4 font-medium text-slate-800">{a.patient}</td>
                        <td className="py-4 pr-4 text-slate-600">{a.room}</td>
                        <td className="py-4 pr-4 text-slate-700">{a.service}</td>
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            a.status === 'Завершен' ? 'bg-emerald-50 text-emerald-700' :
                            a.status === 'Отменен' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* КАБИНЕТ ВРАЧА: КАРТЫ ПАЦИЕНТОВ */}
          {activeTab === 'doctor_cards' && role === 'doctor' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                <h3 className="text-base font-bold text-slate-800 mb-4">Пациенты клиники</h3>
                <div className="space-y-2">
                  {patientsBase.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => {
                        setSelectedPatientCard(p);
                        setEditDiagnosis(p.diagnosis || '');
                        setEditNotes(p.notes || '');
                        setCardSaveSuccess(false);
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                        selectedPatientCard?.id === p.id 
                          ? 'bg-cyan-50 border-cyan-300 shadow-sm' 
                          : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Тел: {p.phone}</p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:col-span-2 flex flex-col justify-between">
                {selectedPatientCard ? (
                  <div className="space-y-5">
                    <div className="border-b border-slate-100 pb-4 flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">{selectedPatientCard.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Дата рождения: {selectedPatientCard.birth} • Телефон: {selectedPatientCard.phone}</p>
                      </div>
                      <span className="px-3 py-1 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full text-xs font-semibold">Медкарта №{selectedPatientCard.id}</span>
                    </div>

                    {cardSaveSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0" /> Изменения в медкарте успешно сохранены!
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Диагноз / Проведенное лечение</label>
                        <input 
                          type="text"
                          value={editDiagnosis}
                          onChange={(e) => setEditDiagnosis(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-cyan-500 font-medium"
                          placeholder="Введите диагноз..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Заметки врача (назначенные препараты, рекомендации)</label>
                        <textarea 
                          rows={4}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-cyan-500"
                          placeholder="Введите заметки по приему..."
                        />
                      </div>

                      <button 
                        onClick={async () => {
                          try {
                            const saved = await api.updateCard(selectedPatientCard.id, { diagnosis: editDiagnosis, notes: editNotes });
                            setPatientsBase((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
                            setSelectedPatientCard(saved);
                            setCardSaveSuccess(true);
                            setLoadError('');
                          } catch (err) {
                            setLoadError(err.message || 'Не удалось сохранить карту');
                          }
                        }}
                        className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-medium transition cursor-pointer shadow-sm"
                      >
                        Сохранить заметки в карту
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16">
                    <FileText className="w-12 h-12 mb-3 text-slate-300" />
                    <p className="text-sm font-medium">Выберите пациента слева, чтобы открыть его медицинскую карту</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* КАБИНЕТ ВРАЧА: ЗАПРОС В АПТЕКУ */}
          {activeTab === 'doctor_warehouse' && role === 'doctor' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-3xl w-full">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Наличие препаратов и анестетиков на складе</h3>
              <p className="text-xs text-slate-500 mb-6">Быстрый поиск нужного медикамента перед процедурой</p>

              <div className="relative mb-6">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input 
                  type="text"
                  placeholder="Введите название препарата..."
                  value={warehouseSearch}
                  onChange={(e) => setWarehouseSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-3">
                {filteredPharmacy.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{p.name}</p>
                      <p className="text-xs text-slate-500">Основной склад клиники</p>
                    </div>
                    <span className="font-bold text-emerald-600 text-sm">{p.stock} {p.unit} в наличии</span>
                  </div>
                ))}
                {filteredPharmacy.length === 0 && (
                  <p className="text-sm text-slate-400 py-6 text-center">Препаратов по вашему запросу не найдено.</p>
                )}
              </div>
            </div>
          )}

          {/* АНАЛИТИКА ДИРЕКТОРА */}
          {activeTab === 'director_analytics' && role === 'director' && (
            <div className="space-y-6 max-w-6xl w-full">
              <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 w-fit shadow-sm">
                <button
                  onClick={() => setAnalyticsSubTab('overview')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
                    analyticsSubTab === 'overview' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" /> Сводная аналитика
                </button>
                <button
                  onClick={() => setAnalyticsSubTab('archive')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
                    analyticsSubTab === 'archive' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Archive className="w-4 h-4" /> Архив всех записей
                </button>
              </div>

              {analyticsSubTab === 'overview' && (
                <>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Генератор отчетов и ключевые показатели</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Выберите период для формирования аналитической сводки</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div 
                          onClick={() => setShowReportPeriodSelect(!showReportPeriodSelect)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 flex items-center gap-3 cursor-pointer hover:border-cyan-500 transition"
                        >
                          <span>{reportPeriod}</span>
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        </div>
                        {showReportPeriodSelect && (
                          <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-20">
                            {periodsList.map(p => (
                              <div key={p} onClick={() => { setReportPeriod(p); setShowReportPeriodSelect(false); }} className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 cursor-pointer transition">
                                {p}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => {
                          if (!analytics) return;
                          alert(`Отчет «${analytics.period}»\nСтоматология: ${analytics.dentalRevenue}\nАптека: ${analytics.pharmacyRevenue}\nИтого: ${analytics.totalRevenue}`);
                        }}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-medium transition cursor-pointer flex items-center gap-2 shadow-sm"
                      >
                        <Download className="w-4 h-4" /> Скачать отчет (Excel / PDF)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Выручка по стоматологии</p>
                      <p className="text-2xl font-extrabold text-slate-900 mt-2">{analytics?.dentalRevenue ?? '—'}</p>
                      <p className="text-xs text-slate-500 font-semibold mt-1">{analytics?.dentalDelta ?? 'Загрузка...'}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Выручка аптеки / склада</p>
                      <p className="text-2xl font-extrabold text-slate-900 mt-2">{analytics?.pharmacyRevenue ?? '—'}</p>
                      <p className="text-xs text-slate-500 font-semibold mt-1">{analytics?.pharmacyDelta ?? 'Загрузка...'}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 bg-gradient-to-br from-cyan-900 to-slate-900 text-white">
                      <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Общая выручка клиники</p>
                      <p className="text-2xl font-extrabold text-white mt-2">{analytics?.totalRevenue ?? '—'}</p>
                      <p className="text-xs text-cyan-200 mt-1">Итого за выбранный период</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                      <h4 className="font-bold text-slate-800 mb-4">Загруженность врачей и кабинетов</h4>
                      <div className="space-y-4">
                        {(analytics?.doctorLoad ?? []).map((doctor) => (
                          <div key={doctor.name}>
                            <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                              <span>{doctor.name} ({doctor.room})</span>
                              <span>{doctor.percent}% загрузки</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div className="bg-cyan-600 h-full rounded-full" style={{ width: `${doctor.percent}%` }}></div>
                            </div>
                          </div>
                        ))}
                        {(analytics?.doctorLoad ?? []).length === 0 && (
                          <p className="text-sm text-slate-400">Нет данных по врачам за выбранный период.</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                      <h4 className="font-bold text-slate-800 mb-4">Топ популярных услуг и лекарств</h4>
                      <div className="space-y-3 text-sm">
                        {(analytics?.topServices ?? []).map((item, index) => (
                          <div key={item.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                            <span className="font-medium text-slate-700">{index + 1}. {item.name}</span>
                            <span className="font-bold text-cyan-700">{item.count}</span>
                          </div>
                        ))}
                        {(analytics?.topServices ?? []).length === 0 && (
                          <p className="text-sm text-slate-400">За выбранный период завершенных услуг нет.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {analyticsSubTab === 'archive' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Архив всех записей клиники</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Полная история приемов с разбивкой по месяцам и годам для проверки</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div 
                          onClick={() => setShowArchiveYearSelect(!showArchiveYearSelect)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer hover:border-cyan-500 transition"
                        >
                          <span>{archiveYear}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        {showArchiveYearSelect && (
                          <div className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-20">
                            {yearsList.map(y => (
                              <div key={y} onClick={() => { setArchiveYear(y); setShowArchiveYearSelect(false); }} className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 cursor-pointer transition">
                                {y}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <div 
                          onClick={() => setShowArchiveMonthSelect(!showArchiveMonthSelect)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer hover:border-cyan-500 transition"
                        >
                          <span>{archiveMonth}</span>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        {showArchiveMonthSelect && (
                          <div className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-20">
                            {monthsList.map(m => (
                              <div key={m} onClick={() => { setArchiveMonth(m); setShowArchiveMonthSelect(false); }} className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 cursor-pointer transition">
                                {m}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase font-semibold">
                          <th className="pb-3 pr-4">Дата (Месяц / Год)</th>
                          <th className="pb-3 pr-4">Пациент</th>
                          <th className="pb-3 pr-4">Врач</th>
                          <th className="pb-3 pr-4">Услуга</th>
                          <th className="pb-3 pr-4">Стоимость</th>
                          <th className="pb-3">Статус</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredArchive.map(rec => (
                          <tr key={rec.id} className="hover:bg-slate-50 transition">
                            <td className="py-4 pr-4">
                              <span className="font-bold text-slate-800 block">{rec.date}</span>
                              <span className="text-xs text-slate-400">{rec.month} {rec.year}</span>
                            </td>
                            <td className="py-4 pr-4 font-medium text-slate-800">{rec.patient}</td>
                            <td className="py-4 pr-4 text-slate-600">{rec.doctor}</td>
                            <td className="py-4 pr-4 text-slate-700">{rec.service}</td>
                            <td className="py-4 pr-4 font-bold text-emerald-600">{rec.cost}</td>
                            <td className="py-4">
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                {rec.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {filteredArchive.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-sm text-slate-400">
                              За выбранный период записей не найдено.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* РАСПИСАНИЕ */}
          {activeTab === 'schedule' && role !== 'doctor' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 w-full max-w-6xl pb-24">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">Расписание приема на сегодня</h3>
                {role === 'admin' && (
                  <button onClick={() => selectTab('new_appointment')} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-medium transition cursor-pointer flex items-center gap-2 shadow-sm">
                    <PlusCircle className="w-4 h-4" /> Добавить запись
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase font-semibold">
                      <th className="pb-3 pr-4">Время</th>
                      <th className="pb-3 pr-4">Пациент</th>
                      <th className="pb-3 pr-4">Врач</th>
                      <th className="pb-3 pr-4">Кабинет</th>
                      <th className="pb-3 pr-4">Услуга</th>
                      <th className="pb-3">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {appointments.map((a, index) => {
                      const openUpwards = appointments.length > 1 && index >= appointments.length - 2;

                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition">
                          <td className="py-4 pr-4 font-bold text-cyan-600 whitespace-nowrap">{a.time}</td>
                          <td className="py-4 pr-4 font-medium text-slate-800">{a.patient}</td>
                          <td className="py-4 pr-4 text-slate-600">{a.doctor}</td>
                          
                          <td className="py-4 pr-4">
                            {role === 'admin' ? (
                              <div className="relative">
                                <div 
                                  onClick={() => setOpenDropdownId(openDropdownId === `room-${a.id}` ? null : `room-${a.id}`)}
                                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 flex justify-between items-center gap-2 cursor-pointer hover:border-cyan-500 transition"
                                >
                                  <span>{a.room}</span>
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                </div>
                                {openDropdownId === `room-${a.id}` && (
                                  <div className={`absolute left-0 ${openUpwards ? 'bottom-full mb-1' : 'mt-1'} w-40 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-30`}>
                                    {roomsList.map(room => (
                                      <div key={room} onClick={() => changeAppointment(a.id, { room })} className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 cursor-pointer transition">
                                        {room}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">{a.room}</span>
                            )}
                          </td>

                          <td className="py-4 pr-4 text-slate-700">{a.service}</td>

                          <td className="py-4 whitespace-nowrap">
                            {role === 'admin' ? (
                              <div className="relative">
                                <div 
                                  onClick={() => setOpenDropdownId(openDropdownId === `status-${a.id}` ? null : `status-${a.id}`)}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold border flex justify-between items-center gap-3 cursor-pointer transition ${
                                    a.status === 'Завершен' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    a.status === 'Отменен' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                                    'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  <span>{a.status}</span>
                                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                                </div>
                                {openDropdownId === `status-${a.id}` && (
                                  <div className={`absolute right-0 ${openUpwards ? 'bottom-full mb-1' : 'mt-1'} w-36 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-30`}>
                                    {statusesList.map(status => (
                                      <div key={status} onClick={() => changeAppointment(a.id, { status })} className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 cursor-pointer transition">
                                        {status}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                a.status === 'Завершен' ? 'bg-emerald-50 text-emerald-700' :
                                a.status === 'Отменен' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {a.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* НОВАЯ ЗАПИСЬ */}
          {activeTab === 'new_appointment' && role === 'admin' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 w-full max-w-2xl">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-cyan-600" /> Оформление новой записи
              </h3>

              {bookingSuccess && (
                <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" /> Пациент успешно записан и добавлен в базу клиентов!
                </div>
              )}

              <form onSubmit={handleAddAppointment} className="space-y-5">
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">ФИО Пациента (выбор из базы или ввод нового)</label>
                  <input 
                    type="text" 
                    placeholder="Начните вводить имя..."
                    value={patientInput}
                    onChange={(e) => {
                      setPatientInput(e.target.value);
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-cyan-500"
                  />
                  {showPatientDropdown && filteredPatients.length > 0 && patientInput && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                      {filteredPatients.map(p => (
                        <div 
                          key={p.id}
                          onClick={() => {
                            setPatientInput(p.name);
                            setShowPatientDropdown(false);
                          }}
                          className="p-3 hover:bg-cyan-50 text-sm cursor-pointer border-b border-slate-50 flex justify-between"
                        >
                          <span className="font-medium text-slate-800">{p.name}</span>
                          <span className="text-xs text-slate-400">{p.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Врач</label>
                    <div 
                      onClick={() => setShowDoctorSelect(!showDoctorSelect)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm flex justify-between items-center cursor-pointer hover:border-cyan-500 transition"
                    >
                      <span className="font-medium text-slate-800">{newDoctor}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                    {showDoctorSelect && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                        {doctorsList.map(doc => (
                          <div key={doc} onClick={() => { setNewDoctor(doc); setShowDoctorSelect(false); }} className="p-3 text-sm hover:bg-cyan-50 hover:text-cyan-700 cursor-pointer transition">
                            {doc}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Кабинет / Место</label>
                    <div 
                      onClick={() => setShowRoomSelect(!showRoomSelect)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm flex justify-between items-center cursor-pointer hover:border-cyan-500 transition"
                    >
                      <span className="font-medium text-slate-800">{newRoom}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                    {showRoomSelect && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                        {roomsList.map(room => (
                          <div key={room} onClick={() => { setNewRoom(room); setShowRoomSelect(false); }} className="p-3 text-sm hover:bg-cyan-50 hover:text-cyan-700 cursor-pointer transition">
                            {room}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Услуга</label>
                    <div 
                      onClick={() => setShowServiceSelect(!showServiceSelect)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm flex justify-between items-center cursor-pointer hover:border-cyan-500 transition truncate"
                    >
                      <span className="font-medium text-slate-800 truncate">{newService}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                    {showServiceSelect && (
                      <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                        {servicesList.map(srv => (
                          <div key={srv} onClick={() => { setNewService(srv); setShowServiceSelect(false); }} className="p-3 text-sm hover:bg-cyan-50 hover:text-cyan-700 cursor-pointer transition">
                            {srv}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Время (часы : минуты)</label>
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                      <input 
                        type="text" 
                        maxLength={2}
                        value={hourInput}
                        onChange={handleHourChange}
                        className="w-12 text-center bg-transparent text-sm font-bold focus:outline-none"
                        placeholder="12"
                      />
                      <span className="text-slate-400 font-bold">:</span>
                      <input 
                        ref={minuteRef}
                        type="text" 
                        maxLength={2}
                        value={minuteInput}
                        onChange={(e) => setMinuteInput(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        className="w-12 text-center bg-transparent text-sm font-bold focus:outline-none"
                        placeholder="00"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-cyan-600/20 mt-6 cursor-pointer"
                >
                  Записать пациента
                </button>
              </form>
            </div>
          )}

          {/* БАЗА КЛИЕНТОВ */}
          {activeTab === 'clients' && role === 'admin' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 w-full max-w-6xl">
              <h3 className="text-lg font-bold text-slate-800 mb-4">База всех клиентов клиники</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase font-semibold">
                      <th className="pb-3">ID</th>
                      <th className="pb-3">ФИО Пациента</th>
                      <th className="pb-3">Телефон</th>
                      <th className="pb-3">Дата рождения</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {patientsBase.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-4 text-slate-400">#{p.id}</td>
                        <td className="py-4 font-medium text-slate-800">{p.name}</td>
                        <td className="py-4 text-slate-600">{p.phone}</td>
                        <td className="py-4 text-slate-500">{p.birth || '1990-01-01'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ЗАЯВКИ С САЙТА */}
          {activeTab === 'online_leads' && role === 'admin' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 w-full max-w-4xl">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Входящие онлайн-заявки с сайта</h3>
              <div className="space-y-3">
                {onlineLeads.map(lead => (
                  <div key={lead.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <p className="font-bold text-slate-800">{lead.patient} <span className="text-xs font-normal text-slate-500">({lead.phone})</span></p>
                      <p className="text-xs text-cyan-700 mt-1">Услуга: {lead.service} • Желаемое время: {lead.date}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={async () => {
                          try {
                            await api.acceptLead(lead.id);
                            await loadCore();
                            setLoadError('');
                          } catch (err) {
                            setLoadError(err.message || 'Не удалось принять заявку');
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        Принять в расписание
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            await api.deleteLead(lead.id);
                            setOnlineLeads((prev) => prev.filter((item) => item.id !== lead.id));
                            setLoadError('');
                          } catch (err) {
                            setLoadError(err.message || 'Не удалось удалить заявку');
                          }
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
                {onlineLeads.length === 0 && (
                  <p className="text-sm text-slate-400 py-4 text-center">Новых заявок с сайта нет.</p>
                )}
              </div>
            </div>
          )}

          {/* СКЛАД */}
          {activeTab === 'pharmacy' && role !== 'doctor' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 w-full max-w-3xl">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Складской учет препаратов и расходников</h3>
              <div className="space-y-3">
                {pharmacy.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">Основной склад клиники</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-emerald-600">{p.stock} {p.unit}</span>
                      {role === 'admin' && (
                        <button 
                          onClick={async () => {
                            try {
                              const updated = await api.consumePharmacy(p.id);
                              setPharmacy((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
                              setLoadError('');
                            } catch (err) {
                              setLoadError(err.message || 'Не удалось списать со склада');
                            }
                          }}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-100 transition shadow-sm cursor-pointer"
                        >
                          Списать 1 шт
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ПЕРСОНАЛ */}
          {activeTab === 'staff_rooms' && role !== 'doctor' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 w-full max-w-5xl">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Врачи и распределение по кабинетам</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {staffList.map(staff => (
                  <div key={staff.id} className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="font-bold text-slate-800 text-base">{staff.name}</p>
                    <p className="text-xs text-cyan-600 font-semibold mt-1">{staff.role}</p>
                    <p className="text-xs text-slate-500 mt-3 bg-white p-2 rounded-lg border border-slate-100 inline-block">📍 {staff.room}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ОТЧЕТЫ */}
          {activeTab === 'reports' && role === 'admin' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 w-full max-w-3xl">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Оперативные отчеты администратора</h3>
              <p className="text-sm text-slate-500 mb-6">Сводка для передачи руководству</p>
              <button 
                onClick={async () => {
                  try {
                    const report = await api.report();
                    alert(report.message);
                  } catch (err) {
                    setLoadError(err.message || 'Не удалось отправить отчет');
                  }
                }}
                className="w-fit px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-medium transition cursor-pointer shadow-sm"
              >
                Отправить текущий отчет директору
              </button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}