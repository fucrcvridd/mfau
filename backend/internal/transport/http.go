package transport

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"dental-crm/backend/internal/model"
	"dental-crm/backend/internal/service"
)

type API struct {
	svc *service.Service
}

func New(svc *service.Service) *API {
	return &API{svc: svc}
}

func (a *API) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", a.health)

	mux.HandleFunc("GET /api/patients", a.listPatients)
	mux.HandleFunc("PATCH /api/patients/{id}/card", a.updatePatientCard)

	mux.HandleFunc("GET /api/staff", a.listStaff)
	mux.HandleFunc("GET /api/rooms", a.listRooms)
	mux.HandleFunc("GET /api/services", a.listServices)

	mux.HandleFunc("GET /api/appointments", a.listAppointments)
	mux.HandleFunc("POST /api/appointments", a.createAppointment)
	mux.HandleFunc("PATCH /api/appointments/{id}", a.updateAppointment)

	mux.HandleFunc("GET /api/leads", a.listLeads)
	mux.HandleFunc("DELETE /api/leads/{id}", a.deleteLead)
	mux.HandleFunc("POST /api/leads/{id}/accept", a.acceptLead)

	mux.HandleFunc("GET /api/pharmacy", a.listPharmacy)
	mux.HandleFunc("POST /api/pharmacy/{id}/consume", a.consumePharmacy)

	mux.HandleFunc("GET /api/archive", a.listArchive)
	mux.HandleFunc("GET /api/analytics", a.analytics)
	mux.HandleFunc("GET /api/reports", a.report)

	return cors(logRequests(mux))
}

func (a *API) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (a *API) listPatients(w http.ResponseWriter, r *http.Request) {
	items, err := a.svc.ListPatients(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *API) updatePatientCard(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var card model.PatientCard
	if !decode(w, r, &card) {
		return
	}
	item, err := a.svc.UpdatePatientCard(r.Context(), id, card)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (a *API) listStaff(w http.ResponseWriter, r *http.Request) {
	items, err := a.svc.ListStaff(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *API) listRooms(w http.ResponseWriter, r *http.Request) {
	items, err := a.svc.ListRooms(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *API) listServices(w http.ResponseWriter, r *http.Request) {
	items, err := a.svc.ListServices(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *API) listAppointments(w http.ResponseWriter, r *http.Request) {
	items, err := a.svc.ListAppointments(r.Context(), r.URL.Query().Get("date"), r.URL.Query().Get("doctor"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *API) createAppointment(w http.ResponseWriter, r *http.Request) {
	var in model.CreateAppointmentInput
	if !decode(w, r, &in) {
		return
	}
	item, err := a.svc.CreateAppointment(r.Context(), in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (a *API) updateAppointment(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in model.UpdateAppointmentInput
	if !decode(w, r, &in) {
		return
	}
	item, err := a.svc.UpdateAppointment(r.Context(), id, in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (a *API) listLeads(w http.ResponseWriter, r *http.Request) {
	items, err := a.svc.ListLeads(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *API) deleteLead(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	if err := a.svc.DeleteLead(r.Context(), id); err != nil {
		writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *API) acceptLead(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	item, err := a.svc.AcceptLead(r.Context(), id)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (a *API) listPharmacy(w http.ResponseWriter, r *http.Request) {
	items, err := a.svc.ListPharmacy(r.Context(), r.URL.Query().Get("q"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *API) consumePharmacy(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	item, err := a.svc.ConsumePharmacy(r.Context(), id)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (a *API) listArchive(w http.ResponseWriter, r *http.Request) {
	items, err := a.svc.ListArchive(r.Context(), r.URL.Query().Get("year"), r.URL.Query().Get("month"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (a *API) analytics(w http.ResponseWriter, r *http.Request) {
	item, err := a.svc.Analytics(r.Context(), r.URL.Query().Get("period"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (a *API) report(w http.ResponseWriter, r *http.Request) {
	item, err := a.svc.Report(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "некорректный id"})
		return 0, false
	}
	return id, true
}

func decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(dst); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "некорректный JSON"})
		return false
	}
	return true
}

func writeError(w http.ResponseWriter, err error) {
	var ve service.ValidationError
	if errors.As(err, &ve) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": ve.Error()})
		return
	}
	log.Printf("api: %v", err)
	writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "внутренняя ошибка"})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("json: %v", err)
	}
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s", r.Method, r.URL.RequestURI())
		next.ServeHTTP(w, r)
	})
}
